import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the current song"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: "❌ There is no active music player in this server.", ephemeral: true });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || (player.voiceChannelId && voiceChannel.id !== player.voiceChannelId)) {
      return interaction.reply({ content: "❌ You must be in the same voice channel as the bot to resume music.", ephemeral: true });
    }

    if (!player.paused) {
      return interaction.reply({ content: "⚠️ The playback is already playing.", ephemeral: true });
    }

    try {
      await player.setPaused(false);
      return interaction.reply("▶️ Resumed the music.");
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Failed to resume the playback.", ephemeral: true });
    }
  },
};
