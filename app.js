// ── Game-Box app.js ─────────────────────────────────────────────────────────
// Vanilla JS · No framework · Persistent storage via IndexedDB + navigator.storage

const BASE = (() => {
  const p = location.pathname;
  const m = p.match(/^\/[^\/]+\//);
  return m ? m[0] : '/';
})();

const DB_NAME = 'gamebox-db';
const DB_VER  = 1;
let db;

// ── IndexedDB bootstrap ──────────────────────────────────────────────────────
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings');
    };
    req.onsuccess  = e => res(e.target.result);
    req.onerror    = e => rej(e.target.error);
  });
}
function dbGet(key) {
  return new Promise((res, rej) => {
    const tx = db.transaction('settings', 'readonly');
    const req = tx.objectStore('settings').get(key);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
function dbSet(key, val) {
  return new Promise((res, rej) => {
    const tx = db.transaction('settings', 'readwrite');
    const req = tx.objectStore('settings').put(val, key);
    req.onsuccess = () => res();
    req.onerror   = e => rej(e.target.error);
  });
}

// ── Screen routing ───────────────────────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('home-theme-checkbox').checked  = dark;
  document.getElementById('setup-theme-checkbox').checked = dark;
}

// ── Loading screen (3 s) ─────────────────────────────────────────────────────
function runLoadingScreen(then) {
  show('screen-loading');
  const bar  = document.getElementById('load-bar');
  const dur  = 3000;
  const start = performance.now();
  function tick(now) {
    const pct = Math.min(100, ((now - start) / dur) * 100);
    bar.style.width = pct + '%';
    if (pct < 100) requestAnimationFrame(tick);
    else setTimeout(then, 80);
  }
  requestAnimationFrame(tick);
}

// ── Game list ────────────────────────────────────────────────────────────────
async function loadGames() {
  try {
    const res  = await fetch(BASE + 'games/gamelist.json');
    const data = await res.json();
    return data.games || [];
  } catch { return []; }
}

function renderGames(games) {
  const grid = document.getElementById('game-grid');
  grid.innerHTML = '';
  if (!games.length) {
    grid.innerHTML = '<div class="no-games"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"3\"/><path d=\"M8 10v4M6 12h4\"/></svg><br>No games yet.<br><small>Add entries to games/gamelist.json</small></div>';
    return;
  }
  games.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <img class="game-icon" src="${BASE}${game.icon}" alt="${game.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
      <div class="game-icon" style="display:none;align-items:center;justify-content:center;background:var(--surface2)">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="3"/><path d="M8 10v4M6 12h4"/><circle cx="16" cy="12" r="1"/><circle cx="18" cy="10" r="1"/></svg>
      </div>
      <div class="game-name">${game.name}</div>
    `;
    card.addEventListener('click', () => launchGame(game));
    grid.appendChild(card);
  });
}

// ── Game runner ──────────────────────────────────────────────────────────────
function launchGame(game) {
  const frame = document.getElementById('game-frame');
  frame.src   = BASE + game.path;
  show('screen-runner');
}

document.getElementById('close-game-btn').addEventListener('click', () => {
  document.getElementById('close-overlay').classList.add('show');
});
document.getElementById('cancel-close').addEventListener('click', () => {
  document.getElementById('close-overlay').classList.remove('show');
});
document.getElementById('confirm-close').addEventListener('click', () => {
  document.getElementById('close-overlay').classList.remove('show');
  document.getElementById('game-frame').src = 'about:blank';
  show('screen-home');
});

// ── OS tabs on no-PWA screen ─────────────────────────────────────────────────
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

// ── Setup steps ──────────────────────────────────────────────────────────────
document.getElementById('btn-setup-0').addEventListener('click', () => {
  const val = document.getElementById('input-username').value.trim();
  if (!val) { document.getElementById('input-username').focus(); return; }
  document.getElementById('setup-step-0').style.display = 'none';
  document.getElementById('setup-step-1').style.display = '';
  document.getElementById('dot-0').classList.remove('active');
  document.getElementById('dot-1').classList.add('active');
});

document.getElementById('btn-setup-1').addEventListener('click', async () => {
  const console_ = document.getElementById('input-console').value.trim();
  const username = document.getElementById('input-username').value.trim();
  if (!console_) { document.getElementById('input-console').focus(); return; }
  const dark = document.getElementById('setup-theme-checkbox').checked;
  await dbSet('username', username);
  await dbSet('consoleName', console_);
  await dbSet('theme', dark ? 'dark' : 'light');
  await dbSet('setupDone', true);
  applyTheme(dark);
  goHome(username, console_);
});

// ── Home ─────────────────────────────────────────────────────────────────────
async function goHome(username, consoleName) {
  document.getElementById('home-user-label').textContent    = '👤 ' + username;
  document.getElementById('home-console-label').textContent = '🎮 ' + consoleName;
  const games = await loadGames();
  renderGames(games);
  show('screen-home');
}

// ── Home theme toggle ────────────────────────────────────────────────────────
document.getElementById('home-theme-checkbox').addEventListener('change', async e => {
  const dark = e.target.checked;
  applyTheme(dark);
  await dbSet('theme', dark ? 'dark' : 'light');
});
document.getElementById('setup-theme-checkbox').addEventListener('change', e => {
  applyTheme(e.target.checked);
});

// ── Storage request ──────────────────────────────────────────────────────────
async function requestPersist() {
  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }
}

document.getElementById('btn-allow-storage').addEventListener('click', async () => {
  await requestPersist();
  await dbSet('storageAsked', true);
  runLoadingScreen(afterLoading);
});
document.getElementById('btn-skip-storage').addEventListener('click', async () => {
  await dbSet('storageAsked', true);
  runLoadingScreen(afterLoading);
});

// ── After loading ────────────────────────────────────────────────────────────
async function afterLoading() {
  const done     = await dbGet('setupDone');
  const username = await dbGet('username');
  const consoleName = await dbGet('consoleName');
  const theme    = await dbGet('theme');
  if (theme) applyTheme(theme === 'dark');
  if (done) {
    goHome(username || 'Player', consoleName || 'My Game-Box');
  } else {
    show('screen-setup');
  }
}

// ── Boot sequence ────────────────────────────────────────────────────────────
async function boot() {
  db = await openDB();
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
             || window.navigator.standalone === true;

  if (!isPWA) {
    show('screen-nopwa');
    return;
  }

  const storageAsked = await dbGet('storageAsked');
  if (!storageAsked) {
    show('screen-storage');
  } else {
    const theme = await dbGet('theme');
    if (theme) applyTheme(theme === 'dark');
    runLoadingScreen(afterLoading);
  }
}

// ── Service Worker ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(BASE + 'sw.js').catch(() => {});
}

boot();
