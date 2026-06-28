import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Set the repeat mode")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Repeat mode (off, track, queue)")
        .setRequired(true)
        .addChoices(
          { name: "Off", value: "off" },
          { name: "Track (Repeat Single Song)", value: "track" },
          { name: "Queue (Repeat Entire Queue)", value: "queue" }
        )
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: "❌ There is no active music player in this server.", ephemeral: true });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || (player.voiceChannelId && voiceChannel.id !== player.voiceChannelId)) {
      return interaction.reply({ content: "❌ You must be in the same voice channel as the bot to change loop mode.", ephemeral: true });
    }

    const mode = interaction.options.getString("mode");

    try {
      if (typeof player.setRepeatMode === "function") {
        player.setRepeatMode(mode);
      } else if (player.queue && typeof player.queue.setRepeatMode === "function") {
        player.queue.setRepeatMode(mode);
      } else {
        return interaction.reply({ content: "❌ This operation is not supported by the player queue.", ephemeral: true });
      }

      return interaction.reply(`🔁 Repeat mode set to: **${mode}**`);
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Failed to change loop mode.", ephemeral: true });
    }
  },
};
