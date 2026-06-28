import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current song"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: "❌ There is no active music player in this server.", ephemeral: true });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || (player.voiceChannelId && voiceChannel.id !== player.voiceChannelId)) {
      return interaction.reply({ content: "❌ You must be in the same voice channel as the bot to pause music.", ephemeral: true });
    }

    if (player.paused) {
      return interaction.reply({ content: "⚠️ The playback is already paused.", ephemeral: true });
    }

    try {
      await player.setPaused(true);
      return interaction.reply("⏸️ Paused the music.");
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Failed to pause the playback.", ephemeral: true });
    }
  },
};
