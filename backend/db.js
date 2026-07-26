// db.js
// این فایل مسئول ساخت و مدیریت دیتابیس SQLite هست.
// SQLite یه دیتابیس ساده‌ست که همه چیز رو تو یه فایل (game.db) ذخیره می‌کنه
// و نیازی به نصب سرور جدا مثل MySQL یا Postgres نداره. برای شروع عالیه.

const Database = require('better-sqlite3');
const path = require('path');

// فایل دیتابیس کنار همین فایل ساخته می‌شه
const db = new Database(path.join(__dirname, 'game.db'));

// جدول کاربرها رو اگه وجود نداشت می‌سازیم
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id TEXT PRIMARY KEY,   -- آیدی یکتای کاربر در تلگرام
    coins INTEGER DEFAULT 0,        -- پول/پوینت فعلی کاربر
    level INTEGER DEFAULT 1,        -- لول فعلی گربه
    xp INTEGER DEFAULT 0,           -- تجربه‌ی جمع شده برای لول‌آپ
    hunger INTEGER DEFAULT 100,     -- میزان سیری گربه (0 تا 100)
    last_update INTEGER             -- آخرین باری که گرسنگی محاسبه شد (timestamp)
  )
`);

// تابع: پیدا کردن یا ساختن کاربر جدید
function getOrCreateUser(telegramId) {
  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  if (!user) {
    const now = Date.now();
    db.prepare(
      'INSERT INTO users (telegram_id, coins, level, xp, hunger, last_update) VALUES (?, 0, 1, 0, 100, ?)'
    ).run(telegramId, now);
    user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  }
  return user;
}

// تابع: آپدیت کردن کاربر (بعد از تپ، لول‌آپ یا کازینو)
function updateUser(telegramId, fields) {
  const keys = Object.keys(fields);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => fields[k]);
  db.prepare(`UPDATE users SET ${setClause} WHERE telegram_id = ?`).run(...values, telegramId);
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
}

module.exports = { db, getOrCreateUser, updateUser };
