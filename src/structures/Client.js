import { Client, Collection, GatewayIntentBits, REST, Routes } from "discord.js";
import { readdirSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import chalk from "chalk";

export class MusicBotClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.commands = new Collection();
  }

  async loadCommands() {
    const commandsPath = resolve("src/commands");
    
    try {
      const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith(".js"));
      console.log(chalk.blue("🤖 Loading commands..."));

      for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        try {
          const fileUrl = pathToFileURL(filePath).href;
          const { default: command } = await import(fileUrl);

          if (command && command.data && command.execute) {
            this.commands.set(command.data.name, command);
            console.log(chalk.green(`✔️ Loaded command: /${command.data.name}`));
          } else {
            console.log(chalk.yellow(`⚠️ Invalid command structure in: ${file}`));
          }
        } catch (error) {
          console.error(chalk.red(`❌ Failed to load command ${file}:`), error);
        }
      }
    } catch (error) {
      console.error(chalk.red("❌ Could not read commands directory:"), error);
    }
  }

  async deployCommands() {
    if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
      console.error(chalk.red("❌ Missing DISCORD_TOKEN or CLIENT_ID in environment variables."));
      return;
    }

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
    const commandsJson = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());

    try {
      console.log(chalk.cyan("🚀 Registering slash commands globally..."));
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commandsJson }
      );
      console.log(chalk.green("✔️ Slash commands registered successfully!"));
    } catch (error) {
      console.error(chalk.red("❌ Failed to register slash commands:"), error);
    }
  }
}
