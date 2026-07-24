require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Lähettää ostolomake-viestin tähän kanavaan (vaatii ylläpito-oikeudet)')
    .setDefaultMemberPermissions(0) // admin-only by default, server owner can adjust in Server Settings > Integrations
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Rekisteröidään slash-komentoja...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('Slash-komennot rekisteröity onnistuneesti!');
  } catch (error) {
    console.error(error);
  }
})();
