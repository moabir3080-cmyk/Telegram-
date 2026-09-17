const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => { res.send('Bot is running!');
});
app.listen(PORT, () => {
  const axios = require('axios');

// আপনার বট টোকেন এবং চ্যানেল চ্যাট আইডি
const BOT_TOKEN = "8703585118:AAHRmikYlaG3izBI-Qny4wqGYbIRK0mZ0I";
const CHAT_ID = "-1003846977032";
const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageNo=1&pageSize=30";

let lastProcessedPeriod = ""; // আগের পিরিয়ড মনে রাখার জন্য

// আপনার কোডের প্রেডিকশন লজিক (Advanced Pattern Engine)
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

// টেলিগ্রামে মেসেজ পাঠানোর ফাংশন
async function sendTelegramMessage(period, signal, trend) {
  const emoji = signal === "BIG" ? "🟢 BIG" : "🔴 SMALL";
  
  const message = `⚡ <b>RXN VIP AI SIGNAL V3</b> ⚡\n\n` +
                  `🎯 <b>Period:</b> <code>${period}</code>\n` +
                  `📊 <b>Trend:</b> ${trend}\n` +
                  `🔮 <b>Prediction:</b> <b>${emoji}</b>\n\n` +
                  `👑 <i>Owner: RXN JOSHIM VIP</i>`;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  try {
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    console.log(`[+] নতুন সিগন্যাল পোস্ট হয়েছে: Period ${period} -> ${signal}`);
  } catch (err) {
    console.error("[-] মেসেজ পাঠাতে সমস্যা:", err.message);
  }
}

// প্রতি ৫ সেকেন্ড পর পর ফলাফল চেক করার লুপ
async function checkAndPredict() {
  try {
    const res = await axios.get(API_URL);
    const list = res.data?.data?.list || [];

    if (list.length > 0) {
      const currentIssue = list[0].issueNumber || list[0].periodNumber || list[0].issue;
      
      // পরবর্তী রাউন্ডের পিরিয়ড বের করা
      const nextPeriod = (BigInt(currentIssue) + 1n).toString();

      // যদি এই পিরিয়ডের সিগন্যাল আগে পোস্ট না হয়ে থাকে
      if (nextPeriod !== lastProcessedPeriod) {
        lastProcessedPeriod = nextPeriod;

        const analysis = advancedPatternEngine(list);
        await sendTelegramMessage(nextPeriod, analysis.signal, analysis.trendName);
      }
    }
  } catch (e) {
    console.log("ডাটা ফেচ করতে সমস্যা হচ্ছে, পুনরায় চেষ্টা করা হবে...");
  }
}

// প্রতি ৫ সেকেন্ড পর পর ব্যাকগ্রাউন্ডে চেক করবে
setInterval(checkAndPredict, 5000);
console.log("🚀 বট চালু হয়েছে! এটি স্বয়ংক্রিয়ভাবে নতুন রাউন্ড এলে পোস্ট করবে...");
