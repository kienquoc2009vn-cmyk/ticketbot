require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");

/* ========= LƯU SỐ THỨ TỰ ========= */

const DATA_FILE = "./ticketCount.json";

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ count: 0 }));
}

function getNextTicketNumber() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  data.count += 1;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  return String(data.count).padStart(4, "0");
}

/* ========= BOT ========= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("clientReady", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

/* ================= PANEL ================= */

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (message.content === "!panel") {

    const embed = new EmbedBuilder()
      .setTitle("🎫 Trung tâm hỗ trợ máy chủ Frozen Saga")
      .setDescription(`
-> Bạn đang cần mua rank ?

-> Bạn đang cần hỗ trợ? 

🛒 Nếu bạn muốn mua rank hãy bấm nút **Mua Rank**
🆘 Nếu bạn muốn hỗ trợ về server hãy bấm nút **Hỗ Trợ**
`)
      .setColor("#5dade2");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_rank")
        .setLabel("Mua Rank")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("support")
        .setLabel("Hỗ Trợ")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* ================= CREATE TICKET ================= */

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isButton()) return;

  const guild = interaction.guild;
  const user = interaction.user;

  const ticketNumber = getNextTicketNumber();

  let categoryName;
  let ticketName;
  let welcomeMessage;

  /* ===== BUY RANK ===== */
  if (interaction.customId === "buy_rank") {
    categoryName = "📦 🇧🇺🇾 🇷🇦🇳🇰";
    ticketName = `buy-${ticketNumber}`;
    welcomeMessage = `🛒 Xin chào ${user}, bạn muốn mua rank gì?`;
  }

  /* ===== SUPPORT ===== */
  if (interaction.customId === "support") {
    categoryName = "🆘 🇸🇺🇵🇵🇴🇷🇹";
    ticketName = `support-${ticketNumber}`;
    welcomeMessage = `🆘 Xin chào ${user}, hãy mô tả vấn đề bạn gặp phải.`;
  }

  const category = guild.channels.cache.find(
    c => c.name === categoryName && c.type === ChannelType.GuildCategory
  );

  if (!category)
    return interaction.reply({
      content: "❌ Không tìm thấy category ticket.",
      ephemeral: true
    });

  const channel = await guild.channels.create({
    name: ticketName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
        ],
      },
    ],
  });

  const ticketEmbed = new EmbedBuilder()
    .setTitle("🎫 Ticket đã tạo")
    .setDescription(welcomeMessage)
    .setColor("#58d68d");

  channel.send({ embeds: [ticketEmbed] });

  interaction.reply({
    content: `✅ Ticket của bạn: ${channel}`,
    ephemeral: true
  });

});

/* ========= LOGIN ========= */

client.login(process.env.TOKEN);;