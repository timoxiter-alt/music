import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return "00:00";
  if (ms === 9223372036854775807 || ms === 9223372036854775000) return "🔴 Live Stream";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function createProgressBar(current, total, size = 15) {
  if (isNaN(current) || isNaN(total) || total <= 0) return "🔘" + "➖".repeat(size - 1);
  const progress = Math.min(size, Math.round((size * current) / total));
  const emptyProgress = size - progress;
  const progressStr = "➖".repeat(Math.max(0, progress - 1)) + "🔘" + "➖".repeat(Math.max(0, emptyProgress));
  return progressStr;
}

export default {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Display details of the currently playing track"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: "❌ There is no active music player in this server.", ephemeral: true });
    }

    const track = player.queue?.current || player.currentTrack || player.current;
    if (!track) {
      return interaction.reply({ content: "❌ There is no track currently playing.", ephemeral: true });
    }

    const duration = track.info.duration || track.info.length || 0;
    const position = player.position || 0;
    const progressBar = createProgressBar(position, duration);

    const embed = new EmbedBuilder()
      .setTitle("🎶 Now Playing")
      .setDescription(`[${track.info.title}](${track.info.uri})`)
      .addFields(
        { name: "👤 Author", value: track.info.author || "Unknown", inline: true },
        { name: "🙋 Requested By", value: track.requester ? `<@${track.requester.id || track.requester}>` : "Unknown", inline: true },
        { name: "\u200b", value: `\`${formatDuration(position)}\` ${progressBar} \`${formatDuration(duration)}\`` }
      )
      .setColor("#2b2d31")
      .setTimestamp();

    if (track.info.artworkUrl) {
      embed.setThumbnail(track.info.artworkUrl);
    }

    return interaction.reply({ embeds: [embed] });
  },
};
