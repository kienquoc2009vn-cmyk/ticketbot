require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  StringSelectMenuBuilder,
} = require("discord.js");

const fs = require("fs");

/* ================= CONFIG ================= */

const BUY_CATEGORY_ID = "1476828190013132843";
const SUPPORT_CATEGORY_ID = "1476828755589595256";
const STAFF_ROLE_ID = "1476541949619212289";

const EMBED_IMAGE =
"https://i.pinimg.com/originals/2f/10/ce/2f10ce69b96c0611989308b0abc68e70.gif";

/* ================= COUNT ================= */

const DATA_FILE = "./ticketCount.json";

if (!fs.existsSync(DATA_FILE))
  fs.writeFileSync(DATA_FILE, JSON.stringify({ count: 0 }));

function nextTicket() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  data.count++;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  return String(data.count).padStart(4, "0");
}

/* ================= BOT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("clientReady", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

/* ================= PANEL ================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  /* PANEL */
  if (message.content === "!panel") {

    const embed = new EmbedBuilder()
     .setTitle("🎫 Trung tâm hỗ trợ")
     .setDescription(`
🛒 Tạo ticket này để **Mua Rank**

🆘 Tạo ticket này để được **Hỗ trợ** từ @Staff

➡️ Nhấn nút bên dưới để tạo ticket.
`)
  .setColor("#FFC0CB")
  .setImage(EMBED_IMAGE);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_ticket")
        .setLabel("Mua Rank")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("support_ticket")
        .setLabel("Hỗ Trợ")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }

  /* CLOSE COMMAND */
  if (message.content.startsWith("!close")) {

    const args = message.content.split(" ");
    const ticketName = args.slice(1).join(" ").replace("#","");

    if (!ticketName)
      return message.reply("❌ Dùng: `!close #ticket-0001`");

    const channel = message.guild.channels.cache.find(
      c => c.name === ticketName
    );

    if (!channel)
      return message.reply("❌ Không tìm thấy ticket.");

    const isStaff =
      message.member.roles.cache.has(1476541949619212289);

    const isOwner =
      message.guild.ownerId === message.author.id;

    if (!isStaff && !isOwner)
      return message.reply("❌ Chỉ staff hoặc owner!");

    message.reply("🔒 Đang đóng ticket...");

    setTimeout(() => {
      channel.delete().catch(console.error);
    }, 3000);
  }
});

/* ================= INTERACTION ================= */

client.on("interactionCreate", async (interaction) => {

  /* CREATE TICKET */
  if (interaction.isButton()) {

    if (!["buy_ticket","support_ticket"].includes(interaction.customId))
      return;

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const user = interaction.user;
    const number = nextTicket();

    const isBuy = interaction.customId === "buy_ticket";

    const category = isBuy
      ? BUY_CATEGORY_ID
      : SUPPORT_CATEGORY_ID;

    const channel = await guild.channels.create({
      name: `${isBuy ? "buy":"support"}-${number}`,
      type: ChannelType.GuildText,
      parent: category,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
        {
          id: STAFF_ROLE_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket đã tạo")
      .setDescription(`Xin chào ${user}, @Staff sẽ hỗ trợ bạn.`)
      .setColor("#FFC0CB")
      .setImage(EMBED_IMAGE);

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Đóng Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `${user}`,
      embeds: [embed],
      components: [closeBtn],
    });

    /* BUY MENU */
    if (isBuy) {

      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("buy_menu")
          .setPlaceholder("Bạn muốn mua rank gì?")
          .addOptions([
            { label:"VIP Rank", value:"VIP"},
            { label:"MVP Rank", value:"MVP"},
            { label:"Legend Rank", value:"LEGEND"},
          ])
      );

      channel.send({
        content:"🛒 Chọn rank bạn muốn mua:",
        components:[menu],
      });
    }

    interaction.editReply(`✅ Ticket: ${channel}`);
  }

  /* SELECT MENU */
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "buy_menu") {
      await interaction.reply({
        content:`✅ Bạn chọn **${interaction.values[0]}**`,
      });
    }
  }

  /* CLOSE BUTTON */
  if (interaction.isButton() &&
      interaction.customId === "close_ticket") {

    const isStaff =
      interaction.member.roles.cache.has(1476541949619212289);

    const isOwner =
      interaction.guild.ownerId === interaction.user.id;

    if (!isStaff && !isOwner)
      return interaction.reply({
        content:"❌ Chỉ staff/owner!",
        ephemeral:true,
      });

    await interaction.reply({
      content:"🔒 Đang đóng ticket...",
    });

    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 3000);
  }
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);