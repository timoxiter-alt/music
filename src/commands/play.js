import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube, Spotify, SoundCloud, or URL")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The song name or URL to play")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const query = interaction.options.getString("query");
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.editReply("❌ You must be in a voice channel to play music!");
    }

    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions.has("Connect") || !permissions.has("Speak")) {
      return interaction.editReply("❌ I do not have permission to connect and speak in your voice channel!");
    }

    let player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      try {
        player = client.lavalink.createPlayer({
          guildId: interaction.guildId,
          voiceChannelId: voiceChannel.id,
          textChannelId: interaction.channelId,
          selfDeaf: true,
          selfMute: false,
          volume: 80
        });
      } catch (err) {
        console.error("Failed to create player:", err);
        return interaction.editReply("❌ Failed to join your voice channel.");
      }
    }

    // Connect if not connected
    if (!player.connected) {
      try {
        await player.connect();
      } catch (err) {
        console.error("Failed to connect player:", err);
        return interaction.editReply("❌ Failed to establish voice connection.");
      }
    }

    // Perform the track search
    let result;
    try {
      if (typeof player.search === "function") {
        result = await player.search({ query }, interaction.user);
      } else if (typeof client.lavalink.search === "function") {
        result = await client.lavalink.search({ query }, interaction.user);
      } else {
        return interaction.editReply("❌ Audio search engine is unavailable.");
      }
    } catch (err) {
      console.error("Search failed:", err);
      return interaction.editReply("❌ There was an error searching for that track.");
    }

    if (!result || !result.tracks || result.tracks.length === 0) {
      return interaction.editReply("❌ No results found for your query.");
    }

    const isPlaylist = result.loadType === "playlist" || result.loadType === "PLAYLIST_LOADED";

    if (isPlaylist) {
      for (const track of result.tracks) {
        track.requester = interaction.user;
        player.queue.add(track);
      }
      
      const playlistName = result.playlist?.name || result.pluginInfo?.name || "Playlist";
      await interaction.editReply(`🎶 Added playlist **${playlistName}** (${result.tracks.length} tracks) to the queue.`);
    } else {
      const track = result.tracks[0];
      track.requester = interaction.user;
      player.queue.add(track);
      await interaction.editReply(`📝 Added **${track.info.title}** to the queue.`);
    }

    // Start playback if not already playing
    if (!player.playing && !player.paused) {
      try {
        await player.play();
      } catch (err) {
        console.error("Playback failed:", err);
        return interaction.editReply("❌ An error occurred while trying to play the track.");
      }
    }
  },
};
