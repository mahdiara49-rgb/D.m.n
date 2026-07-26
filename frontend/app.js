// app.js
// این فایل تمام منطق سمت کاربر بازی رو مدیریت می‌کنه:
// گرفتن اطلاعات کاربر، تپ روی گربه، غذا دادن، و کازینو

// آدرس بک‌اند رو اینجا بذار (بعد از دیپلوی روی Railway/Render آپدیتش کن)
const API_URL = 'https://YOUR-BACKEND-URL.up.railway.app';

// راه‌اندازی تلگرام وب‌اپ
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand(); // صفحه رو کامل باز کن
}

// گرفتن آیدی کاربر تلگرام (اگه خارج از تلگرام تست می‌کنی، یه آیدی تستی می‌ذاریم)
const telegramId = tg?.initDataUnsafe?.user?.id || 'test-user-123';

// المنت‌های صفحه
const coinsEl = document.getElementById('coins');
const levelEl = document.getElementById('level');
const hungerBarEl = document.getElementById('hungerBar');
const xpBarEl = document.getElementById('xpBar');
const catEl = document.getElementById('cat');
const meowTextEl = document.getElementById('meowText');
const floatingPointsEl = document.getElementById('floatingPoints');
const feedBtn = document.getElementById('feedBtn');
const betBtn = document.getElementById('betBtn');
const betAmountEl = document.getElementById('betAmount');
const casinoResultEl = document.getElementById('casinoResult');

const XP_NEEDED_PER_LEVEL = 100; // باید با مقدار بک‌اند یکی باشه

// تابع: آپدیت کردن رابط کاربری بر اساس اطلاعات کاربر
function renderUser(user) {
  coinsEl.textContent = user.coins;
  levelEl.textContent = user.level;
  hungerBarEl.style.width = user.hunger + '%';

  // رنگ نوار گرسنگی بر اساس مقدارش عوض بشه
  if (user.hunger < 30) {
    hungerBarEl.style.background = '#e53935'; // قرمز - گرسنه
  } else {
    hungerBarEl.style.background = '#ff7043';
  }

  const xpNeeded = XP_NEEDED_PER_LEVEL * user.level;
  const xpPercent = Math.min(100, (user.xp / xpNeeded) * 100);
  xpBarEl.style.width = xpPercent + '%';

  // ظاهر گربه بر اساس لول عوض می‌شه (اینجا رو می‌تونی گسترش بدی)
  if (user.level >= 10) {
    catEl.textContent = '😻'; // لول بالا
  } else if (user.level >= 5) {
    catEl.textContent = '😺'; // لول متوسط
  } else {
    catEl.textContent = '🐱'; // لول پایین
  }
}

// تابع: گرفتن اطلاعات کاربر از سرور
async function fetchUser() {
  const res = await fetch(`${API_URL}/api/user/${telegramId}`);
  const user = await res.json();
  renderUser(user);
}

// تابع: نمایش انیمیشن پوینت شناور وقتی تپ می‌کنی
function showFloatingPoint(amount) {
  const el = document.createElement('div');
  el.className = 'floating-point';
  el.textContent = '+' + amount;
  el.style.left = (40 + Math.random() * 20) + '%';
  el.style.top = '50%';
  floatingPointsEl.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// تابع: نمایش متن میو
function showMeow() {
  const meows = ['میو!', 'میووو~', 'میو میو!'];
  meowTextEl.textContent = meows[Math.floor(Math.random() * meows.length)];
  meowTextEl.style.opacity = '1';
  meowTextEl.style.transform = 'translateY(0)';
  setTimeout(() => {
    meowTextEl.style.opacity = '0';
  }, 500);
}

// رویداد: تپ روی گربه
catEl.addEventListener('click', async () => {
  // انیمیشن فوری (قبل از جواب سرور) برای حس بهتر
  showMeow();
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

  const res = await fetch(`${API_URL}/api/tap/${telegramId}`, { method: 'POST' });
  const data = await res.json();

  showFloatingPoint(data.earnedCoins);
  renderUser(data.user);

  if (data.leveledUp) {
    alert('🎉 لول‌آپ شدی! لول جدید: ' + data.user.level);
  }
});

// رویداد: غذا دادن به گربه
feedBtn.addEventListener('click', async () => {
  const res = await fetch(`${API_URL}/api/feed/${telegramId}`, { method: 'POST' });
  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }
  renderUser(data);
});

// رویداد: شرط‌بندی در کازینو
betBtn.addEventListener('click', async () => {
  const betAmount = parseInt(betAmountEl.value, 10);
  if (!betAmount || betAmount <= 0) {
    casinoResultEl.textContent = 'یه مقدار معتبر وارد کن';
    return;
  }

  const res = await fetch(`${API_URL}/api/casino/${telegramId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount }),
  });
  const data = await res.json();

  if (data.error) {
    casinoResultEl.textContent = data.error;
    return;
  }

  casinoResultEl.textContent = data.won
    ? `🎉 بردی! +${betAmount} سکه`
    : `😿 باختی! -${betAmount} سکه`;

  renderUser(data.user);
});

// شروع بازی: گرفتن اطلاعات کاربر
fetchUser();

// هر ۱۰ ثانیه یه بار اطلاعات کاربر رو دوباره بگیر (برای آپدیت گرسنگی)
setInterval(fetchUser, 10000);
