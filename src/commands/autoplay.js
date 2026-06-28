import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Toggle autoplay mode on/off"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: "❌ There is no active music player in this server.", ephemeral: true });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || (player.voiceChannelId && voiceChannel.id !== player.voiceChannelId)) {
      return interaction.reply({ content: "❌ You must be in the same voice channel as the bot to toggle autoplay.", ephemeral: true });
    }

    const isEnabled = player.get("autoplay") || player.autoplay || false;
    const nextState = !isEnabled;

    try {
      player.set("autoplay", nextState);
      player.autoplay = nextState;

      return interaction.reply(`📻 Autoplay mode has been **${nextState ? "enabled" : "disabled"}**!`);
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Failed to toggle autoplay mode.", ephemeral: true });
    }
  },
};
