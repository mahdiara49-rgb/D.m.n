// app.js
// نسخه آفلاین بازی - همه‌چیز رو مرورگر خود کاربر ذخیره می‌شه (localStorage)
// نیازی به سرور یا اینترنت (به جز بار اول باز کردن) نیست

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const STORAGE_KEY = 'catGameData';

const HUNGER_DECAY_PER_MINUTE = 1;
const MIN_HUNGER_FOR_FULL_COINS = 30;
const COINS_PER_TAP = 1;
const XP_PER_TAP = 2;
const XP_NEEDED_PER_LEVEL = 100;
const FEED_COST = 10;
const FEED_AMOUNT = 30;
const WIN_CHANCE = 0.45;

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

function loadUser() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  const newUser = {
    coins: 0,
    level: 1,
    xp: 0,
    hunger: 100,
    lastUpdate: Date.now(),
  };
  saveUser(newUser);
  return newUser;
}

function saveUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function calcHunger(user) {
  const now = Date.now();
  const minutesPassed = (now - user.lastUpdate) / 60000;
  const decay = Math.floor(minutesPassed * HUNGER_DECAY_PER_MINUTE);
  return Math.max(0, user.hunger - decay);
}

let user = loadUser();
user.hunger = calcHunger(user);
user.lastUpdate = Date.now();
saveUser(user);

function renderUser() {
  coinsEl.textContent = user.coins;
  levelEl.textContent = user.level;
  hungerBarEl.style.width = user.hunger + '%';
  hungerBarEl.style.background = user.hunger < 30 ? '#e53935' : '#ff7043';

  const xpNeeded = XP_NEEDED_PER_LEVEL * user.level;
  const xpPercent = Math.min(100, (user.xp / xpNeeded) * 100);
  xpBarEl.style.width = xpPercent + '%';

  if (user.level >= 10) {
    catEl.textContent = '😻';
  } else if (user.level >= 5) {
    catEl.textContent = '😺';
  } else {
    catEl.textContent = '🐱';
  }
}

function showFloatingPoint(amount) {
  const el = document.createElement('div');
  el.className = 'floating-point';
  el.textContent = '+' + amount;
  el.style.left = (40 + Math.random() * 20) + '%';
  el.style.top = '50%';
  floatingPointsEl.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function showMeow() {
  const meows = ['میو!', 'میووو~', 'میو میو!'];
  meowTextEl.textContent = meows[Math.floor(Math.random() * meows.length)];
  meowTextEl.style.opacity = '1';
  setTimeout(() => {
    meowTextEl.style.opacity = '0';
  }, 500);
}

catEl.addEventListener('click', () => {
  showMeow();
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

  user.hunger = calcHunger(user);
  user.lastUpdate = Date.now();

  const coinMultiplier = user.hunger < MIN_HUNGER_FOR_FULL_COINS ? 0.5 : 1;
  const earnedCoins = Math.round(COINS_PER_TAP * coinMultiplier);

  user.coins += earnedCoins;
  user.xp += XP_PER_TAP;

  let leveledUp = false;
  while (user.xp >= XP_NEEDED_PER_LEVEL * user.level) {
    user.xp -= XP_NEEDED_PER_LEVEL * user.level;
    user.level += 1;
    leveledUp = true;
  }

  saveUser(user);
  showFloatingPoint(earnedCoins);
  renderUser();

  if (leveledUp) {
    alert('🎉 لول‌آپ شدی! لول جدید: ' + user.level);
  }
});

feedBtn.addEventListener('click', () => {
  if (user.coins < FEED_COST) {
    alert('پول کافی نداری');
    return;
  }
  user.coins -= FEED_COST;
  user.hunger = Math.min(100, calcHunger(user) + FEED_AMOUNT);
  user.lastUpdate = Date.now();

  saveUser(user);
  renderUser();
});

betBtn.addEventListener('click', () => {
  const betAmount = parseInt(betAmountEl.value, 10);
  if (!betAmount || betAmount <= 0) {
    casinoResultEl.textContent = 'یه مقدار معتبر وارد کن';
    return;
  }
  if (user.coins < betAmount) {
    casinoResultEl.textContent = 'پول کافی نداری';
    return;
  }

  const won = Math.random() < WIN_CHANCE;
  user.coins += won ? betAmount : -betAmount;

  saveUser(user);
  casinoResultEl.textContent = won
    ? `🎉 بردی! +${betAmount} سکه`
    : `😿 باختی! -${betAmount} سکه`;

  renderUser();
});

renderUser();

setInterval(() => {
  user.hunger = calcHunger(user);
  user.lastUpdate = Date.now();
  saveUser(user);
  renderUser();
}, 10000);