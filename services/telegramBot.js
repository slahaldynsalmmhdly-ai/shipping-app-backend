const TelegramBot = require("node-telegram-bot-api");
const OTP = require("../models/OTP");

let bot = null;

// تهيئة البوت
const initBot = () => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not defined in environment variables");
    return null;
  }

  try {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log("✅ Telegram Bot initialized successfully");

    // معالجة الأوامر والرسائل الواردة
    bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      console.log(`📩 Received message from ${chatId}: ${text}`);

      // إذا كان المستخدم يرسل /start
      if (text === "/start") {
        await bot.sendMessage(
          chatId,
          "💼 *مرحبًا بك في برنامج الوظائف!*\n\n" +
          "سيتم إرسال رمز التحقق هنا.\n" +
          "⚠️ لا تشارك الرمز مع أي أحد.",
          { parse_mode: "Markdown" }
        );
        return;
      }

      // البحث عن أحدث OTP غير مرسل لأي مستخدم
      try {
        const pendingOTP = await OTP.findOne({
          telegramChatId: null,
          verified: false,
          expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 });

        if (pendingOTP) {
          // ربط chatId بهذا الرمز
          pendingOTP.telegramChatId = chatId.toString();
          await pendingOTP.save();
          
          // إرسال الرمز للمستخدم
          await bot.sendMessage(
            chatId,
            `🔐 *رمز التحقق:*\n\n` +
            `*${pendingOTP.code}*\n\n` +
            `⚠️ لا تشارك هذا الرمز مع أي أحد.\n` +
            `⏰ صالح لمدة 10 دقائق.`,
            { parse_mode: "Markdown" }
          );
          
          console.log(`✅ OTP ${pendingOTP.code} sent to chat ${chatId}`);
        }
      } catch (error) {
        console.error("❌ Error processing message:", error);
        await bot.sendMessage(
          chatId,
          "❌ حدث خطأ أثناء معالجة طلبك.\n" +
          "الرجاء المحاولة مرة أخرى."
        );
      }
    });

    // معالجة الأخطاء
    bot.on("polling_error", (error) => {
      console.error("❌ Telegram Bot polling error:", error);
    });

    return bot;
  } catch (error) {
    console.error("❌ Error initializing Telegram Bot:", error);
    return null;
  }
};

// إرسال رمز التحقق عبر تيليجرام (إذا كان chatId معروف)
const sendOTPViaTelegram = async (chatId, code) => {
  if (!bot) {
    throw new Error("Telegram bot is not initialized");
  }

  try {
    await bot.sendMessage(
      chatId,
      `🔐 *رمز التحقق الخاص بك هو:*\n\n` +
      `*${code}*\n\n` +
      `⏰ هذا الرمز صالح لمدة 10 دقائق.`,
      { parse_mode: "Markdown" }
    );
    console.log(`✅ OTP sent to Telegram chat ${chatId}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending OTP via Telegram:", error);
    throw error;
  }
};

// الحصول على رابط البوت
const getBotLink = () => {
  if (!process.env.TELEGRAM_BOT_USERNAME) {
    return null;
  }
  return `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}`;
};

module.exports = {
  initBot,
  sendOTPViaTelegram,
  getBotLink,
  getBot: () => bot,
};
