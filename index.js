require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { addPurchase, getUser, setTotal } = require('./storage');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const OPEN_FORM_BUTTON_ID = 'open_form';
const SHOW_PURCHASES_BUTTON_ID = 'show_purchases';
const PURCHASE_MODAL_ID = 'purchase_form';

// Registers the /setup command every time the bot starts up.
// This means you never have to run a separate "deploy-commands" step
// on hosts (like some Wispbyte eggs) that only let you run one fixed
// start command.
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Lähettää ostolomake-viestin tähän kanavaan (vaatii ylläpito-oikeudet)')
      .setDefaultMemberPermissions(0),
    new SlashCommandBuilder()
      .setName('aseta-summa')
      .setDescription('(Admin) Aseta käyttäjän Käytetty yhteensä -summa suoraan')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(option =>
        option.setName('kayttaja')
          .setDescription('Käyttäjä jonka summa asetetaan')
          .setRequired(true))
      .addNumberOption(option =>
        option.setName('summa')
          .setDescription('Uusi Käytetty yhteensä -summa (esim. 42.50)')
          .setRequired(true)
          .setMinValue(0)),
    new SlashCommandBuilder()
      .setName('katso-summa')
      .setDescription('(Admin) Näytä käyttäjän Käytetty yhteensä -summa')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(option =>
        option.setName('kayttaja')
          .setDescription('Käyttäjä jonka summa haetaan')
          .setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Slash-komennot rekisteröity onnistuneesti!');
  } catch (err) {
    console.error('Slash-komentojen rekisteröinti epäonnistui:', err);
  }
}

client.once('ready', async () => {
  console.log(`Kirjauduttu sisään käyttäjänä ${client.user.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  try {
    // /setup slash command -> posts the button message
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
      const embed = new EmbedBuilder()
        .setTitle('🧾 Ostolomake')
        .setDescription('Paina alta "Täytä lomake" kirjataksesi uuden ostoksen, tai "Näytä omat ostoni" nähdäksesi oman historiasi.')
        .setColor(0x5865F2);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(OPEN_FORM_BUTTON_ID)
          .setLabel('Täytä lomake')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📋'),
        new ButtonBuilder()
          .setCustomId(SHOW_PURCHASES_BUTTON_ID)
          .setLabel('Näytä omat ostoni')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📊')
      );

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    // /aseta-summa (admin) -> directly overwrite a user's all-time total
    if (interaction.isChatInputCommand() && interaction.commandName === 'aseta-summa') {
      const targetUser = interaction.options.getUser('kayttaja', true);
      const amount = interaction.options.getNumber('summa', true);

      const updated = await setTotal(targetUser.id, targetUser.username, amount);

      await interaction.reply({
        content: `Asetettu: **${targetUser.username}** — Käytetty yhteensä on nyt **${updated.totalSpent.toFixed(2)}€**.`,
        ephemeral: true
      });
      return;
    }

    // /katso-summa (admin) -> look up a user's all-time total directly
    if (interaction.isChatInputCommand() && interaction.commandName === 'katso-summa') {
      const targetUser = interaction.options.getUser('kayttaja', true);
      const user = getUser(targetUser.id);

      if (!user) {
        await interaction.reply({
          content: `**${targetUser.username}** ei ole vielä täyttänyt lomaketta yhtään kertaa.`,
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: `**${targetUser.username}** — Käytetty yhteensä: **${user.totalSpent.toFixed(2)}€** (${user.items.length} ostosta kirjattu).`,
        ephemeral: true
      });
      return;
    }

    // "Täytä lomake" button -> open the modal
    if (interaction.isButton() && interaction.customId === OPEN_FORM_BUTTON_ID) {
      const modal = new ModalBuilder()
        .setCustomId(PURCHASE_MODAL_ID)
        .setTitle('Uusi ostos');

      const itemInput = new TextInputBuilder()
        .setCustomId('mita_ostit')
        .setLabel('Mitä Ostit')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Esim. Kahvi')
        .setRequired(true)
        .setMaxLength(200);

      const costInput = new TextInputBuilder()
        .setCustomId('paljonko_makso')
        .setLabel('Paljonko Se Maksoi')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Esim. 4.50')
        .setRequired(true)
        .setMaxLength(20);

      modal.addComponents(
        new ActionRowBuilder().addComponents(itemInput),
        new ActionRowBuilder().addComponents(costInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // "Näytä omat ostoni" button -> ephemeral list of everything the user has bought
    if (interaction.isButton() && interaction.customId === SHOW_PURCHASES_BUTTON_ID) {
      const user = getUser(interaction.user.id);

      if (!user || user.items.length === 0) {
        await interaction.reply({
          content: 'Et ole vielä täyttänyt lomaketta yhtään kertaa.',
          ephemeral: true
        });
        return;
      }

      let list = user.items
        .map((entry, i) => `${i + 1}. **${entry.item}** — ${entry.cost.toFixed(2)}€`)
        .join('\n');

      // Discord embed field values are capped at 1024 characters.
      if (list.length > 1000) {
        list = list.slice(0, 1000) + '\n...(lista katkaistu)';
      }

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username} - Ostohistoria`)
        .setDescription(list)
        .addFields({ name: 'Yhteensä käytetty', value: `${user.totalSpent.toFixed(2)}€` })
        .setColor(0x57F287);

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Modal submission -> save purchase + post it in the log channel
    if (interaction.isModalSubmit() && interaction.customId === PURCHASE_MODAL_ID) {
      const item = interaction.fields.getTextInputValue('mita_ostit').trim();
      const rawCost = interaction.fields.getTextInputValue('paljonko_makso').trim();

      // Accept both "4.50" and Finnish-style "4,50"
      const normalizedCost = rawCost.replace(',', '.').replace(/[^0-9.]/g, '');
      const cost = parseFloat(normalizedCost);

      if (isNaN(cost) || cost < 0) {
        await interaction.reply({
          content: 'Hinta pitää olla kelvollinen luku, esim. 4.50. Yritä uudelleen.',
          ephemeral: true
        });
        return;
      }

      const updatedUser = await addPurchase(
        interaction.user.id,
        interaction.user.username,
        item,
        cost
      );

      const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);

      const embed = new EmbedBuilder()
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL()
        })
        .addFields(
          { name: 'Mitä Ostit', value: item, inline: true },
          { name: 'Paljonko Se Maksoi', value: `${cost.toFixed(2)}€`, inline: true },
          { name: 'Käytetty yhteensä', value: `${updatedUser.totalSpent.toFixed(2)}€`, inline: true }
        )
        .setColor(0xFEE75C)
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });

      await interaction.reply({
        content: `Kiitos! Tallennettu. Olet käyttänyt yhteensä ${updatedUser.totalSpent.toFixed(2)}€.`,
        ephemeral: true
      });
      return;
    }
  } catch (err) {
    console.error('Virhe interaktion käsittelyssä:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Jotain meni pieleen. Yritä hetken päästä uudelleen.',
        ephemeral: true
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
