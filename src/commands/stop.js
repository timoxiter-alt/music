import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop the music, clear the queue, and leave the voice channel"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: "❌ There is no active music player in this server.", ephemeral: true });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || (player.voiceChannelId && voiceChannel.id !== player.voiceChannelId)) {
      return interaction.reply({ content: "❌ You must be in the same voice channel as the bot to stop music.", ephemeral: true });
    }

    try {
      await player.destroy();
      return interaction.reply("⏹️ Stopped playback, cleared the queue, and disconnected.");
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Failed to stop music playback.", ephemeral: true });
    }
  },
};
