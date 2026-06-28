import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Adjust the music playback volume")
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("Volume level between 0 and 100")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: "❌ There is no active music player in this server.", ephemeral: true });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || (player.voiceChannelId && voiceChannel.id !== player.voiceChannelId)) {
      return interaction.reply({ content: "❌ You must be in the same voice channel as the bot to adjust the volume.", ephemeral: true });
    }

    const level = interaction.options.getInteger("level");

    try {
      if (typeof player.setVolume === "function") {
        await player.setVolume(level);
      } else if (typeof player.volume === "number" || typeof player.setVolume === "undefined") {
        player.volume = level;
      } else {
        return interaction.reply({ content: "❌ Adjusting volume is not supported.", ephemeral: true });
      }

      return interaction.reply(`🔊 Volume set to **${level}%**.`);
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Failed to change the volume.", ephemeral: true });
    }
  },
};
