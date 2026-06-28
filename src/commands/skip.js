import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current song"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: "❌ There is no active music player in this server.", flags: ["Ephemeral"] });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || (player.voiceChannelId && voiceChannel.id !== player.voiceChannelId)) {
      return interaction.reply({ content: "❌ You must be in the same voice channel as the bot to skip music.", flags: ["Ephemeral"] });
    }

    const currentTrack = player.queue?.current || player.currentTrack || player.current;
    if (!currentTrack) {
      return interaction.reply({ content: "❌ There is no track currently playing to skip.", flags: ["Ephemeral"] });
    }

    try {
      // skip(0, false) = skipTo index 0, throwError = false
      // This prevents RangeError when skipping the last song in queue
      await player.skip(0, false);
      return interaction.reply("⏭️ Skipped the current track.");
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Failed to skip the track.", flags: ["Ephemeral"] });
    }
  },
};
