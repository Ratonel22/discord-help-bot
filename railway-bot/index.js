import { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType, REST, Routes, SlashCommandBuilder } from "discord.js";

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("Lipsește secretul DISCORD_TOKEN din Railway Variables.");

const commands = [
  new SlashCommandBuilder().setName("help").setDescription("Afișează comenzile botului"),
  new SlashCommandBuilder().setName("rules").setDescription("Afișează regulile serverului"),
  new SlashCommandBuilder().setName("clear").setDescription("Șterge mesaje").addIntegerOption(o => o.setName("amount").setDescription("Număr de mesaje (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder().setName("ticket").setDescription("Deschide un ticket privat"),
  new SlashCommandBuilder().setName("verify").setDescription("Primește rolul Verified"),
  new SlashCommandBuilder().setName("announce").setDescription("Trimite un anunț").addStringOption(o => o.setName("message").setDescription("Textul anunțului").setRequired(true))
].map(c => c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
client.once("ready", async () => {
  console.log(`Conectat ca ${client.user.tag}`);
  for (const guild of client.guilds.cache.values()) {
    const rest = new REST({ version: "10" }).setToken(token);
    await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands });
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() || !interaction.guild) return;
  const { commandName, member, channel } = interaction;
  if (commandName === "help") return interaction.reply({ ephemeral: true, content: "📚 **Comenzi:** /help · /rules · /clear · /ticket · /verify · /announce" });
  if (commandName === "rules") return interaction.reply("📜 **Regulile serverului**\n1. Respectă membrii.\n2. Fără spam sau conținut nepotrivit.\n3. Respectă indicațiile moderatorilor.");
  if (commandName === "clear") {
    if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ ephemeral: true, content: "Nu ai permisiunea de moderator." });
    const amount = interaction.options.getInteger("amount", true);
    if (!channel || !channel.isTextBased() || !("bulkDelete" in channel)) return interaction.reply({ ephemeral: true, content: "Comanda nu poate fi folosită aici." });
    await interaction.deferReply({ ephemeral: true });
    await channel.bulkDelete(amount, true);
    return interaction.editReply(`Am șters ${amount} mesaje.`);
  }
  if (commandName === "verify") {
    const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "verified");
    if (!role) return interaction.reply({ ephemeral: true, content: "Creează mai întâi un rol numit **Verified**." });
    await interaction.member.roles.add(role);
    return interaction.reply({ ephemeral: true, content: "✅ Ai fost verificat." });
  }
  if (commandName === "ticket") {
    const ticket = await interaction.guild.channels.create({ name: `ticket-${interaction.user.username}`, type: ChannelType.GuildText, permissionOverwrites: [{ id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] });
    return interaction.reply(`✅ Ticket creat: ${ticket}`);
  }
  if (commandName === "announce") {
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ ephemeral: true, content: "Doar administratorii pot publica anunțuri." });
    return interaction.reply(`📢 **ANUNȚ**\n${interaction.options.getString("message", true)}`);
  }
});

client.login(token);
