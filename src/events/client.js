import chalk from "chalk";

export default function registerClientEvents(client) {
  // Ready Event
  client.once("ready", async () => {
    console.log(chalk.green(`✔️ Logged in as ${client.user.tag}!`));
    
    // Initialize Lavalink Manager
    try {
      console.log(chalk.blue("🤖 Initializing Lavalink Manager..."));
      await client.lavalink.init({
        id: client.user.id,
        username: client.user.username,
        avatar: client.user.avatar,
      });
      console.log(chalk.green("✔️ Lavalink Manager initialized!"));
    } catch (err) {
      console.error(chalk.red("❌ Failed to initialize Lavalink Manager:"), err);
    }

    // Deploy Slash Commands
    await client.loadCommands();
    await client.deployCommands();

    // Generate and output invite link
    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=2184162368&scope=bot%20applications.commands`;
    console.log(chalk.magenta.bold("\n=================================================="));
    console.log(chalk.magenta.bold(`🎵 Invite your Music Bot using the link below:`));
    console.log(chalk.cyan(inviteLink));
    console.log(chalk.magenta.bold("==================================================\n"));
  });

  // Raw Voice Packets Gateway event for Lavalink
  client.on("raw", (data) => {
    if (client.lavalink && typeof client.lavalink.sendRawData === "function") {
      client.lavalink.sendRawData(data);
    }
  });

  // Interaction Create Event
  client.on("interactionCreate", async (interaction) => {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(chalk.red(`❌ Error running command ${interaction.commandName}:`), error);
        const replyPayload = { content: "There was an error executing this command!", ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload);
        } else {
          await interaction.reply(replyPayload);
        }
      }
    }

    // 2. Handle Button Controls
    if (interaction.isButton()) {
      if (!interaction.customId.startsWith("music_")) return;

      const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.players?.get(interaction.guildId);
      if (!player) {
        return interaction.reply({ content: "❌ There is no active music player in this server.", flags: ["Ephemeral"] });
      }

      // Check if user is in voice channel
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: "❌ You must be in a voice channel to control music.", flags: ["Ephemeral"] });
      }

      // Check if user is in same voice channel as bot
      if (player.voiceChannelId && voiceChannel.id !== player.voiceChannelId) {
        return interaction.reply({ content: "❌ You must be in the same voice channel as the bot to control music.", flags: ["Ephemeral"] });
      }

      try {
        switch (interaction.customId) {
          case "music_pause_resume": {
            const nextPauseState = !player.paused;
            await player.setPaused(nextPauseState);
            await interaction.reply({
              content: nextPauseState ? "⏸️ Paused the music." : "▶️ Resumed the music.",
              flags: ["Ephemeral"]
            });
            break;
          }

          case "music_skip": {
            const currentTrack = player.queue?.current || player.currentTrack || player.current;
            if (!currentTrack) {
              await interaction.reply({ content: "❌ There is no track currently playing to skip.", flags: ["Ephemeral"] });
              break;
            }
            // skip(0, false) = skipTo index 0, throwError = false
            // This prevents RangeError when skipping the last song in queue
            await player.skip(0, false);
            await interaction.reply({ content: "⏭️ Skipped the current track.", flags: ["Ephemeral"] });
            break;
          }

          case "music_stop": {
            await player.destroy();
            await interaction.reply({ content: "⏹️ Stopped music playback and left the voice channel.", flags: ["Ephemeral"] });
            break;
          }

          case "music_shuffle": {
            if (typeof player.queue.shuffle === "function") {
              player.queue.shuffle();
            } else if (player.queue.tracks && Array.isArray(player.queue.tracks)) {
              for (let i = player.queue.tracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = player.queue.tracks[i];
                player.queue.tracks[i] = player.queue.tracks[j];
                player.queue.tracks[j] = temp;
              }
            } else {
              return interaction.reply({ content: "❌ Could not shuffle the queue (unsupported operation).", flags: ["Ephemeral"] });
            }
            await interaction.reply({ content: "🔀 Shuffled the queue.", flags: ["Ephemeral"] });
            break;
          }

          case "music_loop": {
            let nextMode = "off";
            const currentMode = player.repeatMode || (player.queue && player.queue.repeatMode) || "off";
            if (currentMode === "off") nextMode = "track";
            else if (currentMode === "track") nextMode = "queue";
            else nextMode = "off";

            if (typeof player.setRepeatMode === "function") {
              player.setRepeatMode(nextMode);
            } else if (player.queue && typeof player.queue.setRepeatMode === "function") {
              player.queue.setRepeatMode(nextMode);
            } else {
              return interaction.reply({ content: "❌ Could not change repeat mode (unsupported operation).", flags: ["Ephemeral"] });
            }
            await interaction.reply({ content: `🔁 Repeat mode set to: **${nextMode}**`, flags: ["Ephemeral"] });
            break;
          }

          default:
            break;
        }
      } catch (error) {
        console.error(chalk.red("❌ Error handling button interaction:"), error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "❌ An error occurred while processing the command.", flags: ["Ephemeral"] });
        }
      }
    }
  });
}
