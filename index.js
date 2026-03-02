require("dotenv").config();
const http = require("http");

/* ================= KEEP ALIVE (RENDER) ================= */

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.write("Bot running");
  res.end();
}).listen(PORT);

/* ================= IMPORT ================= */

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
  SlashCommandBuilder,
} = require("discord.js");

const fs = require("fs");

/* ================= CONFIG ================= */

const BUY_CATEGORY_ID = "1476828190013132843";
const SUPPORT_CATEGORY_ID = "1476828755589595256";
const STAFF_ROLE_ID = "1476541949619212289";
const LOG_CHANNEL_ID = "1478005407027826860";

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

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/* ================= READY ================= */

client.once("clientReady", async () => {
  console.log(`✅ ${client.user.tag} online`);

  // register slash command
  await client.application.commands.set([
    new SlashCommandBuilder()
      .setName("panel")
      .setDescription("Gửi panel tạo ticket"),
  ]);
});

/* ================= PANEL FUNCTION ================= */

async function sendPanel(channel) {

  const embed = new EmbedBuilder()
    .setTitle("🎫 Trung tâm hỗ trợ")
    .setDescription(`
🛒 Mua Rank  
🆘 Hỗ trợ server  

Nhấn nút bên dưới để mở ticket.
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

  channel.send({ embeds:[embed], components:[row] });
}

/* ================= SLASH COMMAND ================= */

client.on("interactionCreate", async interaction => {

  /* PANEL */
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {
      await sendPanel(interaction.channel);
      return interaction.reply({
        content:"✅ Panel đã gửi!",
        ephemeral:true
      });
    }
  }

  /* CREATE TICKET */
  if (interaction.isButton() &&
      ["buy_ticket","support_ticket"].includes(interaction.customId)) {

    const guild = interaction.guild;
    const user = interaction.user;

    const type =
      interaction.customId === "buy_ticket"
        ? "buy"
        : "support";

    /* ===== ANTI DUPLICATE ===== */

    const existing = guild.channels.cache.find(
      c => c.name.includes(`${type}-`) &&
      c.permissionOverwrites.cache.has(user.id)
    );

    if (existing)
      return interaction.reply({
        content:`❌ Bạn đã có ticket: ${existing}`,
        ephemeral:true
      });

    await interaction.deferReply({ephemeral:true});

    const number = nextTicket();

    const channel = await guild.channels.create({
      name:`${type}-${user.username}-${number}`,
      type:ChannelType.GuildText,
      parent:type==="buy"
        ? BUY_CATEGORY_ID
        : SUPPORT_CATEGORY_ID,

      permissionOverwrites:[
        {
          id:guild.roles.everyone.id,
          deny:[PermissionsBitField.Flags.ViewChannel]
        },
        {
          id:user.id,
          allow:[
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
        {
          id:1476541949619212289,
          allow:[
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    /* MESSAGE */

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket đã mở")
      .setDescription(`Xin chào ${user} bạn muốn mua rank nào thì chon list ở phía dưới nha!`)
      .setColor("#FFC0CB")
      .setImage(EMBED_IMAGE);

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Đóng Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content:`${user}`,
      embeds:[embed],
      components:[closeBtn]
    });

    /* BUY MENU */

    if (type === "buy") {

      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("buy_menu")
          .setPlaceholder("Chọn rank")
          .addOptions([
            {label:"Pro",value:"Pro"},
            {label:"Vip",value:"Vip"},
            {label:"Vip+",value:"Vip+"},
            {label:"Mvp",value:"Mvp"},
            {label:"Mvp+",value:"Mvp+"},
            {label:"Legend",value:"Legend"}
          ])
      );

      channel.send({
        content:"🛒 Bạn muốn mua gì?",
        components:[menu]
      });
    }

    interaction.editReply(`✅ Ticket: ${channel}`);
  }

  /* SELECT MENU */

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "buy_menu") {
      await interaction.reply({
        content:`✅ Bạn chọn **${interaction.values[0]}** ${client.staff.tag}`,
      });
    }
  }

  /* CLOSE BUTTON */

  if (interaction.isButton() &&
      interaction.customId === "close_ticket") {

    const isStaff =
      interaction.member.roles.cache.has(STAFF_ROLE_ID);

    const isOwner =
      interaction.guild.ownerId === interaction.user.id;

    if (!isStaff && !isOwner)
      return interaction.reply({
        content:"❌ Không đủ quyền!",
        ephemeral:true
      });

    await interaction.reply("🔒 Đang đóng ticket...");

    /* TRANSCRIPT */

    const messages = await interaction.channel.messages.fetch({limit:100});
    const transcript = messages
      .map(m => `${m.author.tag}: ${m.content}`)
      .reverse()
      .join("\n");

    fs.writeFileSync("transcript.txt", transcript);

    const logChannel =
      interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

    if (logChannel)
      logChannel.send({
        content:`📁 Transcript ${interaction.channel.name}`,
        files:["transcript.txt"]
      });

    setTimeout(() => {
      interaction.channel.delete().catch(()=>{});
    },3000);
  }
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);