// ── Game-Box app.js v2 ──────────────────────────────────────────────────────

const BASE = (() => {
  const m = location.pathname.match(/^\/[^\/]+\//);
  return m ? m[0] : '/';
})();

const DB_NAME = 'gamebox-db', DB_VER = 1;
let db;

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      if (!e.target.result.objectStoreNames.contains('settings'))
        e.target.result.createObjectStore('settings');
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
function dbGet(key) {
  return new Promise((res, rej) => {
    const req = db.transaction('settings','readonly').objectStore('settings').get(key);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
function dbSet(key, val) {
  return new Promise((res, rej) => {
    const req = db.transaction('settings','readwrite').objectStore('settings').put(val, key);
    req.onsuccess = () => res();
    req.onerror   = e => rej(e.target.error);
  });
}

// ── Screens ──────────────────────────────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('home-theme-checkbox').checked  = dark;
  document.getElementById('setup-theme-checkbox').checked = dark;
}

// ── Loading bar (3 s) ─────────────────────────────────────────────────────────
function runLoader(then) {
  show('screen-loading');
  const bar = document.getElementById('load-bar');
  const t0  = performance.now();
  (function tick(now) {
    const pct = Math.min(100, (now - t0) / 30);
    bar.style.width = pct + '%';
    pct < 100 ? requestAnimationFrame(tick) : setTimeout(then, 120);
  })(t0);
}

// ── Games ─────────────────────────────────────────────────────────────────────
async function loadGames() {
  try {
    const r = await fetch(BASE + 'games/gamelist.json');
    return (await r.json()).games || [];
  } catch { return []; }
}

function renderGames(games) {
  const grid = document.getElementById('game-grid');
  grid.innerHTML = '';
  if (!games.length) {
    grid.innerHTML = `<div class="no-games">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M8 10v4M6 12h4"/></svg>
      <br>No games yet.<br><small>Add entries to games/gamelist.json</small>
    </div>`;
    return;
  }
  games.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <img class="game-icon" src="${BASE}${game.icon}" alt="${game.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
      <div class="game-icon-fallback" style="display:none">
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M8 10v4M6 12h4"/><circle cx="16" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="13" r="1" fill="currentColor" stroke="none"/></svg>
      </div>
      <div class="game-name">${game.name}</div>`;
    card.addEventListener('click', () => launchGame(game));
    grid.appendChild(card);
  });
}

function launchGame(game) {
  document.getElementById('game-frame').src = BASE + game.path;
  show('screen-runner');
}

// ── Close game ────────────────────────────────────────────────────────────────
document.getElementById('close-game-btn').addEventListener('click', () =>
  document.getElementById('confirm-overlay').classList.add('show'));
document.getElementById('cancel-close').addEventListener('click', () =>
  document.getElementById('confirm-overlay').classList.remove('show'));
document.getElementById('confirm-close').addEventListener('click', () => {
  document.getElementById('confirm-overlay').classList.remove('show');
  document.getElementById('game-frame').src = 'about:blank';
  show('screen-home');
});

// ── Settings panel ────────────────────────────────────────────────────────────
document.getElementById('open-settings-btn').addEventListener('click', () =>
  document.getElementById('settings-overlay').classList.add('show'));
document.getElementById('close-settings-btn').addEventListener('click', () =>
  document.getElementById('settings-overlay').classList.remove('show'));
document.getElementById('settings-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('settings-overlay'))
    document.getElementById('settings-overlay').classList.remove('show');
});

// ── Theme toggles ─────────────────────────────────────────────────────────────
document.getElementById('home-theme-checkbox').addEventListener('change', async e => {
  applyTheme(e.target.checked);
  await dbSet('theme', e.target.checked ? 'dark' : 'light');
});
document.getElementById('setup-theme-checkbox').addEventListener('change', e =>
  applyTheme(e.target.checked));

// ── OS tabs ───────────────────────────────────────────────────────────────────
document.querySelectorAll('.os-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.os-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['android','ios','desktop'].forEach(os => {
      const el = document.getElementById('os-steps-' + os);
      if (el) el.style.display = os === btn.dataset.os ? 'flex' : 'none';
    });
  });
});

// ── Setup ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-setup-0').addEventListener('click', () => {
  const val = document.getElementById('input-username').value.trim();
  if (!val) { document.getElementById('input-username').focus(); return; }
  document.getElementById('setup-step-0').style.display = 'none';
  document.getElementById('setup-step-1').style.display = '';
  document.getElementById('dot-0').classList.remove('active');
  document.getElementById('dot-1').classList.add('active');
});

document.getElementById('btn-setup-1').addEventListener('click', async () => {
  const consoleName = document.getElementById('input-console').value.trim();
  const username    = document.getElementById('input-username').value.trim();
  if (!consoleName) { document.getElementById('input-console').focus(); return; }
  const dark = document.getElementById('setup-theme-checkbox').checked;
  await dbSet('username',    username);
  await dbSet('consoleName', consoleName);
  await dbSet('theme',       dark ? 'dark' : 'light');
  await dbSet('setupDone',   true);
  applyTheme(dark);
  await goHome(username, consoleName);
});

// ── Home ──────────────────────────────────────────────────────────────────────
async function goHome(username, consoleName) {
  document.getElementById('home-meta-label').textContent = username + '  \u00b7  ' + consoleName;
  document.getElementById('settings-profile-label').textContent = username;
  document.getElementById('settings-console-label').textContent = consoleName;
  const games = await loadGames();
  renderGames(games);
  show('screen-home');
}

// ── Storage request ───────────────────────────────────────────────────────────
document.getElementById('btn-allow-storage').addEventListener('click', async () => {
  if (navigator.storage?.persist) await navigator.storage.persist();
  await dbSet('storageAsked', true);
  runLoader(afterLoad);
});
document.getElementById('btn-skip-storage').addEventListener('click', async () => {
  await dbSet('storageAsked', true);
  runLoader(afterLoad);
});

async function afterLoad() {
  const [done, username, consoleName, theme] =
    await Promise.all([dbGet('setupDone'), dbGet('username'), dbGet('consoleName'), dbGet('theme')]);
  if (theme) applyTheme(theme === 'dark');
  if (done) await goHome(username || 'Player', consoleName || 'My Game-Box');
  else show('screen-setup');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  db = await openDB();
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
             || window.navigator.standalone === true;
  if (!isPWA) { show('screen-nopwa'); return; }
  const storageAsked = await dbGet('storageAsked');
  if (!storageAsked) { show('screen-storage'); return; }
  const theme = await dbGet('theme');
  if (theme) applyTheme(theme === 'dark');
  runLoader(afterLoad);
}

// ── Service Worker ────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(BASE + 'sw.js').catch(() => {});
}

boot();
