import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Shuffle the current queue"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: "❌ There is no active music player in this server.", ephemeral: true });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || (player.voiceChannelId && voiceChannel.id !== player.voiceChannelId)) {
      return interaction.reply({ content: "❌ You must be in the same voice channel as the bot to shuffle the queue.", ephemeral: true });
    }

    const tracks = player.queue?.tracks || [];
    if (tracks.length === 0) {
      return interaction.reply({ content: "⚠️ There are no tracks in the queue to shuffle.", ephemeral: true });
    }

    try {
      if (typeof player.queue.shuffle === "function") {
        player.queue.shuffle();
      } else if (Array.isArray(player.queue.tracks)) {
        for (let i = player.queue.tracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = player.queue.tracks[i];
          player.queue.tracks[i] = player.queue.tracks[j];
          player.queue.tracks[j] = temp;
        }
      } else {
        return interaction.reply({ content: "❌ Shuffling is not supported by the player queue.", ephemeral: true });
      }

      return interaction.reply("🔀 Shuffled the queue.");
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Failed to shuffle the queue.", ephemeral: true });
    }
  },
};
