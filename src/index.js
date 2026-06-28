import { MusicBotClient } from "./structures/Client.js";
import { LavalinkManager } from "lavalink-client";
import registerClientEvents from "./events/client.js";
import registerLavalinkEvents from "./events/lavalink.js";
import dotenv from "dotenv";
import chalk from "chalk";

// Load Environment Variables
dotenv.config();

if (!process.env.DISCORD_TOKEN) {
  console.error(chalk.red("❌ DISCORD_TOKEN is missing from .env file!"));
  process.exit(1);
}

// Create custom bot client
const client = new MusicBotClient();

// Instantiate Lavalink Manager
client.lavalink = new LavalinkManager({
  nodes: [
    {
      host: process.env.LAVALINK_HOST || "localhost",
      port: parseInt(process.env.LAVALINK_PORT) || 2333,
      authorization: process.env.LAVALINK_PASSWORD || "youshallnotpass",
      secure: process.env.LAVALINK_SECURE === "true",
      id: "Main Node",
    },
  ],
  sendToShard: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      guild.shard.send(payload);
    }
  },
  client: {
    id: process.env.CLIENT_ID,
    username: "Music Bot",
  },
  playerOptions: {
    onEmptyQueue: {
      destroyAfterMs: 30_000,
      autoPlayFunction: async (player, lastTrack) => {
        if (!player.get("autoplay") && !player.autoplay) return;

        try {
          let query;
          if (lastTrack.info.sourceName === "youtube") {
            query = `https://www.youtube.com/watch?v=${lastTrack.info.identifier || lastTrack.identifier}&list=RD${lastTrack.info.identifier || lastTrack.identifier}`;
          } else {
            // Find the song's YouTube ID first to generate a high-quality YouTube Mix playlist
            const searchPhrase = `ytsearch:${lastTrack.info.author} ${lastTrack.info.title}`;
            let searchRes;
            try {
              if (typeof player.search === "function") {
                searchRes = await player.search({ query: searchPhrase, source: "youtube" }, lastTrack.requester || player.client?.user);
              } else {
                searchRes = await player.lavalink.search({ query: searchPhrase, source: "youtube" }, lastTrack.requester || player.client?.user);
              }
            } catch (err) {
              console.error("Autoplay pre-search failed:", err);
            }

            if (searchRes && searchRes.tracks && searchRes.tracks.length > 0) {
              const ytTrack = searchRes.tracks[0];
              const ytId = ytTrack.info.identifier || ytTrack.identifier;
              query = `https://www.youtube.com/watch?v=${ytId}&list=RD${ytId}`;
            } else {
              // Fallback to keyword search if YouTube resolve fails
              query = `ytsearch:${lastTrack.info.author} ${lastTrack.info.title} recommendations`;
            }
          }

          let res;
          if (typeof player.search === "function") {
            res = await player.search({ query, source: "youtube" }, lastTrack.requester || player.client?.user);
          } else {
            res = await player.lavalink.search({ query, source: "youtube" }, lastTrack.requester || player.client?.user);
          }

          if (res && res.tracks && res.tracks.length > 0) {
            // Retrieve history or initialize it
            let history = player.get("autoplayHistory");
            if (!Array.isArray(history)) history = [];

            // Add the track that just finished to the history
            const lastTrackId = lastTrack.info.identifier || lastTrack.identifier;
            if (lastTrackId && !history.includes(lastTrackId)) {
              history.push(lastTrackId);
            }

            // Find the first recommended track that is not in the history
            let nextTrack = res.tracks.find(t => {
              const id = t.info?.identifier || t.identifier;
              return id && !history.includes(id);
            });

            // If all recommended tracks are in the history, fallback to the original logic
            if (!nextTrack) {
              nextTrack = res.tracks.find(t => (t.info?.identifier || t.identifier) !== lastTrackId) || res.tracks[0];
            }

            // Add the next track to history
            const nextTrackId = nextTrack.info?.identifier || nextTrack.identifier;
            if (nextTrackId && !history.includes(nextTrackId)) {
              history.push(nextTrackId);
            }

            // Limit history size to 25 to prevent memory growth
            if (history.length > 25) {
              history = history.slice(-25);
            }

            player.set("autoplayHistory", history);

            nextTrack.requester = player.client?.user || lastTrack.requester;
            player.queue.add(nextTrack);

            const channel = client.channels.cache.get(player.textChannelId);
            if (channel) {
              channel.send(`📻 **Autoplay:** Enqueued recommended track: [${nextTrack.info.title}](${nextTrack.info.uri})`);
            }
            return nextTrack;
          }
        } catch (error) {
          console.error("Autoplay failed:", error);
        }
      }
    }
  }
});

// Register Event Handlers
registerClientEvents(client);
registerLavalinkEvents(client);

// Start bot connection
console.log(chalk.cyan("🚀 Launching bot. Connecting to Discord gateway..."));
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error(chalk.red("❌ Failed to log into Discord:"), err);
  process.exit(1);
});
