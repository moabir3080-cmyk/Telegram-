const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

// ১. Render-কে সচল রাখার জন্য ডামি ওয়েব সার্ভার (Status 1 এরর রোধে)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('⚡ Telegram Predictor Bot is Active and Running!');
});

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

// ২. টেলিগ্রাম বট কনফিগারেশন
// Render-এর Environment Variables-এ BOT_TOKEN এবং CHAT_ID সেট করতে পারেন
const token = process.env.BOT_TOKEN || 'আপনার_বট_টোকেন_এখানে_দিন';
const chatId = process.env.CHAT_ID || 'আপনার_চ্যানেল_বা_গ্রুপ_আইডি'; 

const bot = new TelegramBot(token, { polling: true });

// ৩. উইংগো ডেটা API
const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageNo=1&pageSize=30";

let lastTrackedPeriod = "";
let lastTrackedSignal = "";
let lossStep = 0;

// ৪. আপনার HTML ফাইল থেকে নেওয়া প্রেডিকশন অ্যালগরিদম
function advancedPatternEngine(list) {
  if (!list || list.length < 5) return { signal: "BIG", trendName: "NORMAL TREND" };
  const results = list.map(item => parseInt(item.number || 0) >= 5 ? "BIG" : "SMALL");
  const numbers = list.map(item => parseInt(item.number || 0));

  let streak = 1;
  for (let i = 0; i < results.length - 1; i++) {
    if (results[i] === results[i + 1]) streak++; else break;
  }

  if (streak >= 5) return { signal: (results[0] === "BIG") ? "SMALL" : "BIG", trendName: `⚠️ POLTI / REVERSAL [${streak}X]` };
  if (streak >= 2 && streak <= 4) return { signal: results[0], trendName: `🔥 DRAGON TREND [${streak}X]` };
  if (results[0] !== results[1] && results[1] !== results[2]) return { signal: (results[0] === "BIG") ? "SMALL" : "BIG", trendName: "⚡ 1-1 ZIGZAG TREND" };
  if (results.length >= 4 && results[0] === results[1] && results[2] === results[3] && results[0] !== results[2]) return { signal: (results[0] === "BIG") ? "SMALL" : "BIG", trendName: "🔄 2-2 PAIR REPEAT" };

  const last5Nums = numbers.slice(0, 5);
  const avg = last5Nums.reduce((a, b) => a + b, 0) / 5;
  const recentBigs = results.slice(0, 10).filter(r => r === "BIG").length;
  
  let sig = (avg >= 5.2 && recentBigs > 6) ? "SMALL" : (avg <= 3.8 && recentBigs < 4) ? "BIG" : (numbers[0] % 2 === 0 ? "BIG" : "SMALL");
  return { signal: sig, trendName: "📊 MOMENTUM WAVE" };
}

// ৫. টেলিগ্রামে প্রেডিকশন ও রেজাল্ট পাঠানো
async function runBotCycle() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const list = data.data?.list || [];

    if (!list.length) return;

    const latest = list[0];
    const currentPeriod = latest.issueNumber || latest.periodNumber || latest.issue;
    const actualNum = parseInt(latest.number || 0);
    const actualResult = actualNum >= 5 ? "BIG" : "SMALL";

    // রেজাল্ট যাচাইকরণ
    if (lastTrackedPeriod && currentPeriod === lastTrackedPeriod) {
      if (actualResult === lastTrackedSignal) {
        bot.sendMessage(chatId, `✅ **WIN / RESULT MATCHED**\n\n🎯 Period: \`${currentPeriod.slice(-4)}\`\n🎲 Result: **${actualResult}** (${actualNum})\nSTATUS: SUCCESS 🔥`, { parse_mode: 'Markdown' });
        lossStep = 0;
      } else {
        lossStep++;
        bot.sendMessage(chatId, `❌ **SORRY STEP ${lossStep}**\n\n🎯 Period: \`${currentPeriod.slice(-4)}\`\n🎲 Result: **${actualResult}** (${actualNum})\nNext Round Prepare!`, { parse_mode: 'Markdown' });
      }
      lastTrackedPeriod = "";
      lastTrackedSignal = "";
    }

    // পরবর্তী রাউন্ডের জন্য প্রেডিকশন পাঠানো
    const nextPeriod = (BigInt(currentPeriod) + 1n).toString();
    if (lastTrackedPeriod !== nextPeriod) {
      const analysis = advancedPatternEngine(list);
      lastTrackedPeriod = nextPeriod;
      lastTrackedSignal = analysis.signal;

      const msg = `⚡ **RXN VIP PREDICTION ENGINE**\n\n` +
                  `🎮 Game: WinGo 30S\n` +
                  `📊 Period: \`${nextPeriod.slice(-4)}\`\n` +
                  `📈 Trend: ${analysis.trendName}\n` +
                  `🎯 Signal: **${analysis.signal}**\n\n` +
                  `_Trade with proper fund management!_`;

      bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error("Error fetching WinGo data:", error.message);
  }
}

// প্রতি ১০ সেকেন্ড পরপর API চেক করবে
setInterval(runBotCycle, 10000);

// /start কমান্ড রেসপন্স
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "স্বাগতম! RXN VIP প্রেডিকশন বট সফলভাবে সক্রিয় হয়েছে।");
});
