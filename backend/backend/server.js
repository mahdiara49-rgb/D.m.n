// server.js
// سرور اصلی بازی. این فایل مسیرهای (API) بازی رو تعریف می‌کنه:
// - گرفتن اطلاعات کاربر
// - تپ کردن روی گربه (میو + پوینت)
// - بازی کازینو/شانس
// - محاسبه گرسنگی با گذر زمان

const express = require('express');
const cors = require('cors');
const { getOrCreateUser, updateUser } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- تنظیمات بازی (اینجا رو راحت می‌تونی تغییر بدی) ----------
const HUNGER_DECAY_PER_MINUTE = 1;      // هر دقیقه چقدر گرسنگی کم بشه
const MIN_HUNGER_FOR_FULL_COINS = 30;   // زیر این عدد، پوینت‌گیری کمتر می‌شه
const COINS_PER_TAP = 1;                // پوینت هر تپ عادی
const XP_PER_TAP = 2;                   // تجربه هر تپ
const XP_NEEDED_PER_LEVEL = 100;        // هر لول چقدر تجربه لازم داره (ساده، بعداً می‌تونی فرمول پیچیده‌تر بذاری)

// تابع کمکی: محاسبه گرسنگی فعلی بر اساس زمان گذشته
function calcHunger(user) {
  const now = Date.now();
  const minutesPassed = (now - user.last_update) / 60000;
  const decay = Math.floor(minutesPassed * HUNGER_DECAY_PER_MINUTE);
  const newHunger = Math.max(0, user.hunger - decay);
  return { newHunger, now };
}

// ---------- مسیر: گرفتن اطلاعات کاربر (یا ساخت کاربر جدید) ----------
app.get('/api/user/:telegramId', (req, res) => {
  const { telegramId } = req.params;
  let user = getOrCreateUser(telegramId);

  const { newHunger, now } = calcHunger(user);
  if (newHunger !== user.hunger) {
    user = updateUser(telegramId, { hunger: newHunger, last_update: now });
  }

  res.json(user);
});

// ---------- مسیر: تپ کردن روی گربه ----------
app.post('/api/tap/:telegramId', (req, res) => {
  const { telegramId } = req.params;
  let user = getOrCreateUser(telegramId);

  const { newHunger } = calcHunger(user);

  // اگه گربه گرسنه باشه (زیر حد مشخص شده)، پوینت کمتری می‌گیره
  const coinMultiplier = newHunger < MIN_HUNGER_FOR_FULL_COINS ? 0.5 : 1;
  const earnedCoins = Math.round(COINS_PER_TAP * coinMultiplier);

  let newXp = user.xp + XP_PER_TAP;
  let newLevel = user.level;

  // بررسی لول‌آپ
  let leveledUp = false;
  while (newXp >= XP_NEEDED_PER_LEVEL * newLevel) {
    newXp -= XP_NEEDED_PER_LEVEL * newLevel;
    newLevel += 1;
    leveledUp = true;
  }

  user = updateUser(telegramId, {
    coins: user.coins + earnedCoins,
    xp: newXp,
    level: newLevel,
    hunger: newHunger,
    last_update: Date.now(),
  });

  res.json({ user, earnedCoins, leveledUp });
});

// ---------- مسیر: غذا دادن به گربه (گرسنگی رو پر می‌کنه، پول کم می‌کنه) ----------
const FEED_COST = 10;
const FEED_AMOUNT = 30;

app.post('/api/feed/:telegramId', (req, res) => {
  const { telegramId } = req.params;
  let user = getOrCreateUser(telegramId);

  if (user.coins < FEED_COST) {
    return res.status(400).json({ error: 'پول کافی نداری' });
  }

  const newHunger = Math.min(100, user.hunger + FEED_AMOUNT);
  user = updateUser(telegramId, {
    coins: user.coins - FEED_COST,
    hunger: newHunger,
    last_update: Date.now(),
  });

  res.json(user);
});

// ---------- مسیر: بازی کازینو (شانس ساده - شیر یا خط) ----------
// کاربر یه مقدار پول شرط می‌بنده. ۴۵٪ شانس برد (دو برابر می‌شه)، ۵۵٪ شانس باخت.
const WIN_CHANCE = 0.45;

app.post('/api/casino/:telegramId', (req, res) => {
  const { telegramId } = req.params;
  const { betAmount } = req.body;

  if (!betAmount || betAmount <= 0) {
    return res.status(400).json({ error: 'مقدار شرط نامعتبره' });
  }

  let user = getOrCreateUser(telegramId);

  if (user.coins < betAmount) {
    return res.status(400).json({ error: 'پول کافی نداری' });
  }

  const won = Math.random() < WIN_CHANCE;
  const newCoins = won ? user.coins + betAmount : user.coins - betAmount;

  user = updateUser(telegramId, { coins: newCoins });

  res.json({ user, won });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`سرور بازی روی پورت ${PORT} روشن شد`);
});
