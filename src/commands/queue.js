import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Display the current playback queue"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: "❌ There is no active music player in this server.", ephemeral: true });
    }

    const currentTrack = player.queue?.current || player.currentTrack || player.current;
    const tracks = player.queue?.tracks || [];

    if (!currentTrack && tracks.length === 0) {
      return interaction.reply("❌ The queue is empty.");
    }

    const embed = new EmbedBuilder()
      .setTitle("🎶 Server Queue")
      .setColor("#2b2d31");

    if (currentTrack) {
      embed.addFields({
        name: "💿 Now Playing",
        value: `[${currentTrack.info.title}](${currentTrack.info.uri}) - *Requested by* ${currentTrack.requester ? `<@${currentTrack.requester.id || currentTrack.requester}>` : "Unknown"}`
      });
    }

    if (tracks.length > 0) {
      const queueList = tracks
        .slice(0, 10)
        .map((track, i) => `**${i + 1}.** [${track.info.title}](${track.info.uri}) - *Requested by* ${track.requester ? `<@${track.requester.id || track.requester}>` : "Unknown"}`)
        .join("\n");

      embed.addFields({
        name: "📋 Upcoming",
        value: queueList + (tracks.length > 10 ? `\n*...and ${tracks.length - 10} more tracks*` : "")
      });
    } else {
      embed.addFields({ name: "📋 Upcoming", value: "No tracks in queue." });
    }

    return interaction.reply({ embeds: [embed] });
  },
};
