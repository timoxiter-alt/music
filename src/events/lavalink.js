import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import chalk from "chalk";

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return "00:00";
  if (ms === 9223372036854775807 || ms === 9223372036854775000) return "🔴 Live Stream";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

async function cleanupLastNowPlaying(player) {
  const lastMsg = player.get("lastNowPlayingMessage");
  if (lastMsg) {
    try {
      await lastMsg.delete().catch(() => {});
    } catch (err) {
      // Ignore
    }
    player.set("lastNowPlayingMessage", null);
  }
}

export default function registerLavalinkEvents(client) {
  const { lavalink } = client;

  lavalink.nodeManager.on("connect", (node) => {
    console.log(chalk.green(`✔️ Lavalink Node "${node.info?.id || node.id || 'Main Node'}" connected successfully!`));
  });

  lavalink.nodeManager.on("error", (node, error) => {
    console.error(chalk.red(`❌ Lavalink Node "${node.info?.id || node.id || 'Main Node'}" error:`), error);
  });

  lavalink.on("trackStart", async (player, track) => {
    await cleanupLastNowPlaying(player);

    // Track starts playing -> record in autoplay history
    const trackId = track.info?.identifier || track.identifier;
    if (trackId) {
      let history = player.get("autoplayHistory");
      if (!Array.isArray(history)) history = [];
      if (!history.includes(trackId)) {
        history.push(trackId);
        if (history.length > 25) {
          history = history.slice(-25);
        }
        player.set("autoplayHistory", history);
      }
    }

    const channel = client.channels.cache.get(player.textChannelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle("🎶 Now Playing")
      .setDescription(`[${track.info.title}](${track.info.uri})`)
      .addFields(
        { name: "👤 Author", value: track.info.author || "Unknown", inline: true },
        { name: "⏱️ Duration", value: formatDuration(track.info.duration || track.info.length), inline: true },
        { name: "🙋 Requested By", value: track.requester ? `<@${track.requester.id || track.requester}>` : "Unknown", inline: true }
      )
      .setColor("#2b2d31")
      .setTimestamp();

    if (track.info.artworkUrl) {
      embed.setThumbnail(track.info.artworkUrl);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("music_pause_resume")
        .setLabel("Pause/Resume")
        .setEmoji("⏸️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("music_skip")
        .setLabel("Skip")
        .setEmoji("⏭️")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("music_shuffle")
        .setLabel("Shuffle")
        .setEmoji("🔀")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("music_loop")
        .setLabel("Loop")
        .setEmoji("🔁")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("music_stop")
        .setLabel("Stop")
        .setEmoji("⏹️")
        .setStyle(ButtonStyle.Danger)
    );

    try {
      const msg = await channel.send({ embeds: [embed], components: [row] });
      player.set("lastNowPlayingMessage", msg);
    } catch (err) {
      console.error(chalk.red("❌ Failed to send Now Playing message:"), err);
    }
  });

  lavalink.on("queueEnd", async (player) => {
    // Clean up the Now Playing message when the queue ends
    await cleanupLastNowPlaying(player);

    const channel = client.channels.cache.get(player.textChannelId);
    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle("🔇 Queue Concluded")
        .setDescription("The queue has finished. I will leave the voice channel shortly.")
        .setColor("#2b2d31");
      try {
        await channel.send({ embeds: [embed] });
      } catch (err) {
        console.error(chalk.red("❌ Failed to send Queue End message:"), err);
      }
    }
    // NOTE: Do NOT call player.destroy() here.
    // The LavalinkManager's destroyAfterMs: 30_000 option in index.js
    // already handles auto-disconnecting the bot after 30 seconds.
    // Calling destroy() manually here was causing instant disconnection
    // even mid-skip when transitioning between tracks.
  });

  lavalink.on("playerDestroy", async (player) => {
    await cleanupLastNowPlaying(player);
  });
}
