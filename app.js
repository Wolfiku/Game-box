// ── Game-Box app.js v2.3 ──────────────────────────────────────────────────────
// Detect base path dynamically so the app works on any host (GitHub Pages, Plesk, etc.)
const BASE = (() => {
  for (const s of document.querySelectorAll('script[src]'))
    if (s.src.endsWith('app.js')) return s.src.replace('app.js', '');
  return window.location.href.replace(/[^/]*$/, '');
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

// ── Auto-update: reload when SW signals an update ─────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'SW_UPDATED') window.location.reload();
  });
}

// ── Screens ───────────────────────────────────────────────────────────────────
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

// ── Loading bar ───────────────────────────────────────────────────────────────
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
    const hasPatch = game.patchlogs && game.patchlogs.length > 0;
    card.innerHTML = `
      <img class="game-icon" src="${BASE}${game.icon}" alt="${game.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
      <div class="game-icon-fallback" style="display:none">
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M8 10v4M6 12h4"/><circle cx="16" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="13" r="1" fill="currentColor" stroke="none"/></svg>
      </div>
      <div class="game-name">${game.name}</div>
      ${hasPatch ? `<div class="game-version">${game.patchlogs[0].version}</div>` : ''}
    `;
    card.addEventListener('click', () => launchGame(game));
    if (hasPatch) {
      let pressTimer;
      card.addEventListener('contextmenu', e => { e.preventDefault(); openPatchlog(game); });
      card.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openPatchlog(game), 500); }, { passive: true });
      card.addEventListener('touchend',   () => clearTimeout(pressTimer));
      card.addEventListener('touchmove',  () => clearTimeout(pressTimer));
      const info = document.createElement('button');
      info.className = 'game-info-btn';
      info.title = 'Patch Notes';
      info.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      info.addEventListener('click', e => { e.stopPropagation(); openPatchlog(game); });
      card.appendChild(info);
    }
    grid.appendChild(card);
  });
}

// ── Patchlog overlay ──────────────────────────────────────────────────────────
function openPatchlog(game) {
  const overlay = document.getElementById('patchlog-overlay');
  document.getElementById('patchlog-title').textContent = game.name;
  const list = document.getElementById('patchlog-list');
  list.innerHTML = '';
  (game.patchlogs || []).forEach(entry => {
    const item = document.createElement('div');
    item.className = 'patchlog-entry';
    const changesHtml = (entry.changes || []).map(c => `<li>${c}</li>`).join('');
    item.innerHTML = `
      <div class="patchlog-ver">
        <span class="patchlog-badge">${entry.version}</span>
        ${entry.date ? `<span class="patchlog-date">${entry.date}</span>` : ''}
      </div>
      ${entry.title ? `<div class="patchlog-etitle">${entry.title}</div>` : ''}
      ${changesHtml ? `<ul class="patchlog-changes">${changesHtml}</ul>` : ''}
    `;
    list.appendChild(item);
  });
  overlay.classList.add('show');
}

document.getElementById('close-patchlog-btn').addEventListener('click', () =>
  document.getElementById('patchlog-overlay').classList.remove('show'));
document.getElementById('patchlog-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('patchlog-overlay'))
    document.getElementById('patchlog-overlay').classList.remove('show');
});

// ── Launch game ───────────────────────────────────────────────────────────────
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(BASE + 'sw.js').catch(() => {});
}

boot();
