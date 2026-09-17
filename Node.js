const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// Express Server (Render Port Binding এর জন্য)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('AK KING VIP Bot is Running Live!');
});

app.listen(PORT, () => {
    console.log(`Web server is listening on port ${PORT}`);
});

// Bot Configuration
// Token trim করে নেওয়া হয়েছে যাতে কোনো স্পেসের কারণে ERR_UNESCAPED_CHARACTERS না আসে
const TOKEN = "8703585118:AAHRmjkYlaG3izBI-Qny4wgGjYBlRkOMZ0I".trim();

// চ্যাট আইডিতে -100 প্রিফিক্স যুক্ত করা হয়েছে চ্যানেল/সুপারগ্রুপের জন্য
const CHAT_ID = "-1003846977032";

const bot = new TelegramBot(TOKEN, { polling: true });

const B_POOL = [5, 6, 7, 8, 9];
const S_POOL = [0, 1, 2, 3, 4];

let lastProcessedId = null;
let savedPrediction = null;
let savedOpps = [];

// Polling Error হ্যান্ডলার (যাতে বট ক্র্যাশ না করে)
bot.on('polling_error', (err) => {
    console.log('Polling Error Occurred (Ignored):', err.message);
});

// Prediction Logic Function
async function checkLottery() {
    try {
        const response = await axios.get("https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json", {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 10000
        });

        const json = response.data;
        if (!json || !json.data || !json.data.list || json.data.list.length === 0) {
            return;
        }

        const list = json.data.list;
        const latest = list[0];

        // নতুন ড্র রেজাল্ট এলে
        if (lastProcessedId !== latest.issueNumber) {
            const num = parseInt(latest.number);
            const size = num >= 5 ? "BIG" : "SMALL";

            // আগের প্রেডিকশনের রেজাল্ট পাঠানো
            if (lastProcessedId && savedPrediction) {
                const win = (savedPrediction === size) || savedOpps.includes(num);
                const statusText = win ? "WIN 🐯" : "LOSS 🖤";

                const resultMessage = `🔔 *RESULT UPDATE* 🔔\n\n` +
                    `📅 *Period:* \`${latest.issueNumber}\`\n` +
                    `🎯 *Prediction:* ${savedPrediction}\n` +
                    `🎲 *Result Number:* ${num} (${size})\n` +
                    `📊 *Status:* *${statusText}*`;

                bot.sendMessage(CHAT_ID, resultMessage, { parse_mode: 'Markdown' }).catch(e => console.log(e.message));
            }

            // নতুন প্রেডিকশন তৈরি (Last 10 Trend Analysis)
            const last10 = list.slice(0, 10).map(x => parseInt(x.number) >= 5 ? "BIG" : "SMALL");
            const bigCount = last10.filter(x => x === "BIG").length;
            const nextPred = bigCount >= 5 ? "BIG" : "SMALL";

            const pool = nextPred === "BIG" ? S_POOL : B_POOL;
            savedOpps = [...pool].sort(() => 0.5 - Math.random()).slice(0, 2);

            lastProcessedId = latest.issueNumber;
            savedPrediction = nextPred;

            const nextPeriod = (BigInt(latest.issueNumber) + 1n).toString();

            const predMessage = `👑 *AK KING VIP PREDICTION* 👑\n\n` +
                `📊 *Next Period:* \`${nextPeriod}\`\n` +
                `🎯 *Prediction:* *${nextPred}*\n` +
                `🛡 *Protect Nums:* \`${savedOpps.join(", ")}\`\n\n` +
                `⚠️ *Trade Responsibly!*`;

            bot.sendMessage(CHAT_ID, predMessage, { parse_mode: 'Markdown' }).catch(e => console.log(e.message));
        }

    } catch (err) {
        // এপিআই ডাউন থাকলে বা HTML রিটার্ন করলে নিরাপদে এরর হ্যান্ডেল করবে
        console.log("Data fetch temporarily unavailable, retrying in next cycle...");
    }
}

// প্রতি ৫ সেকেন্ড পর পর চেক করবে
setInterval(checkLottery, 5000);
