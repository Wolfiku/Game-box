// ── Game-Box app.js ───────────────────────────────────────────────────────────
const BASE = (() => {
  for (const s of document.querySelectorAll('script[src]'))
    if (s.src.endsWith('app.js')) return s.src.replace('app.js', '');
  return window.location.href.replace(/[^/]*$/, '');
})();

const GAMEBOX_API = 'https://gameboxsaves.db.scoodol.de';
const DB_NAME = 'gamebox-db', DB_VER = 2;
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
    const tx = db.transaction('settings','readonly').objectStore('settings').get(key);
    tx.onsuccess = e => res(e.target.result);
    tx.onerror   = e => rej(e.target.error);
  });
}
function dbSet(key, val) {
  return new Promise((res, rej) => {
    const tx = db.transaction('settings','readwrite').objectStore('settings').put(val, key);
    tx.onsuccess = () => res();
    tx.onerror   = e => rej(e.target.error);
  });
}

// ── GameBox API Helpers ───────────────────────────────────────────────────────
async function apiPost(path, body) {
  const r = await fetch(GAMEBOX_API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || json.message || r.statusText);
  return json;
}


// ── Ban Check ──────────────────────────────────────────────────────────────
async function checkBan(type, id) {
  const res = await fetch(`${GAMEBOX_API}/api/system/ban-check?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
  let data = null;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error((data && (data.error || data.message)) || res.statusText);
  return data;
}

function showBanBlock(ban) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show'));

  let overlay = document.getElementById('ban-block-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ban-block-overlay';
    overlay.className = 'overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = `
      <div class="confirm-box" style="max-width:340px;text-align:center;">
        <h3 id="ban-block-title">Zugriff gesperrt</h3>
        <p id="ban-block-text"></p>
        <div class="confirm-row">
          <button class="btn btn-danger" id="ban-block-logout">Ausloggen</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('ban-block-logout').addEventListener('click', async () => {
      await dbSet('account_id', undefined);
      await dbSet('account_key', undefined);
      await dbSet('account_username', undefined);
      location.reload();
    });
  }

  const text = ban.status === 'timeban'
    ? `Du bist noch ${ban.length_hours ?? '?'}h gebannt${ban.reason ? ' (Grund: ' + ban.reason + ')' : ''}. Bis: ${ban.banned_until ?? '-'}`
    : `Du bist dauerhaft gebannt${ban.reason ? ' (Grund: ' + ban.reason + ')' : ''}.`;
  document.getElementById('ban-block-text').textContent = text;
  overlay.classList.add('show');
  overlay.style.display = 'flex';
}

function hideBanBlock() {
  const overlay = document.getElementById('ban-block-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.style.display = 'none';
  }
}

// Returns { blocked: bool, ban? } and shows a full-screen lock if banned.
async function enforceBanForAuth(auth) {
  if (!auth) return { blocked: false };
  const banId = auth.type === 'account' ? auth.account_id : auth.console_key;
  let ban;
  try {
    ban = await checkBan(auth.type, banId);
  } catch (err) {
    console.error('Ban-check request failed:', err);
    return { blocked: false }; // fail-open on network errors, backend still enforces
  }
  if (ban.status === 'allowed') {
    hideBanBlock();
    return { blocked: false };
  }
  showBanBlock(ban);
  return { blocked: true, ban };
}

async function registerConsole(label) {
  const data = await apiPost('/api/console/register', { label });
  await dbSet('console_id', data.console_id);
  await dbSet('console_key', data.console_key);
  return data;
}

async function registerAccount(username, password) {
  const data = await apiPost('/api/account/register', { username, password });
  await dbSet('account_id', data.account_id);
  await dbSet('account_key', data.account_key);
  await dbSet('account_username', data.username);
  return data;
}

async function loginAccount(username, password) {
  const data = await apiPost('/api/account/login', { username, password });
  await dbSet('account_id', data.account_id);
  await dbSet('account_key', data.account_key);
  await dbSet('account_username', data.username);
  return data;
}

// Get current auth object for API calls
async function getAuth() {
  const [account_id, account_key, console_key] = await Promise.all([
    dbGet('account_id'), dbGet('account_key'), dbGet('console_key')
  ]);
  if (account_id && account_key) return { type: 'account', account_id, account_key };
  if (console_key) return { type: 'console', console_key };
  return null;
}

// ── iframe postMessage Bridge ─────────────────────────────────────────────────
// Allows games running inside the iframe to read keys from the parent IndexedDB.
// Game sends: { __gbGet: 'key', __gbReqId: 'unique-id' }
// Parent replies to the iframe: { __gbRes: 'unique-id', value: ... }
window.addEventListener('message', async e => {
  const frame = document.getElementById('game-frame');
  if (!frame || e.source !== frame.contentWindow) return;
  if (!e.data || !e.data.__gbGet || !e.data.__gbReqId) return;
  const value = await dbGet(e.data.__gbGet).catch(() => null);
  frame.contentWindow.postMessage({ __gbRes: e.data.__gbReqId, value }, '*');
});

// ── PWA Update Dialog ─────────────────────────────────────────────────────────
let _dialogShown = false;
function showUpdateDialog() {
  if (_dialogShown) return;
  _dialogShown = true;
  document.getElementById('update-overlay').classList.add('show');
}
document.getElementById('upd-now').addEventListener('click', () => { location.reload(); });
document.getElementById('upd-later').addEventListener('click', async () => {
  await dbSet('pendingUpdate', true);
  document.getElementById('update-overlay').classList.remove('show');
  _dialogShown = false;
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'SW_UPDATED') showUpdateDialog();
  });
  navigator.serviceWorker.ready.then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateDialog();
      });
    });
    setInterval(() => reg.update(), 5 * 60 * 1000);
  });
}

// ── Screens ───────────────────────────────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('home-theme-checkbox').checked  = dark;
  document.getElementById('setup-theme-checkbox').checked = dark;
}
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

// ── Setup Error Helper ────────────────────────────────────────────────────────
function setSetupError(msg) {
  const el = document.getElementById('setup-error');
  if (!msg) { el.textContent = ''; el.style.display = 'none'; return; }
  el.textContent = msg;
  el.style.display = 'block';
}
function setSetupLoading(loading) {
  document.getElementById('btn-setup-finish').disabled = loading;
  document.getElementById('btn-setup-finish').textContent = loading ? 'Bitte warten…' : 'Start';
}

// ── Setup Steps ───────────────────────────────────────────────────────────────
let setupAuthMode = null; // 'register' | 'login' | 'skip'

function setupGoStep(step) {
  document.querySelectorAll('.setup-step').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.setup-dot').forEach((d, i) => d.classList.toggle('active', i === step));
  document.getElementById('setup-step-' + step).style.display = '';
  setSetupError(null);
}

// Step 0 → Console name
document.getElementById('btn-setup-0').addEventListener('click', () => {
  const val = document.getElementById('input-console').value.trim();
  if (!val) { document.getElementById('input-console').focus(); return; }
  setupGoStep(1);
});

// Step 1 → Auth choice
document.getElementById('btn-auth-register').addEventListener('click', () => {
  setupAuthMode = 'register';
  document.getElementById('setup-auth-form-title').textContent = 'Account erstellen';
  document.getElementById('setup-auth-password-hint').style.display = '';
  setupGoStep(2);
});
document.getElementById('btn-auth-login').addEventListener('click', () => {
  setupAuthMode = 'login';
  document.getElementById('setup-auth-form-title').textContent = 'Anmelden';
  document.getElementById('setup-auth-password-hint').style.display = 'none';
  setupGoStep(2);
});
document.getElementById('btn-auth-skip').addEventListener('click', async () => {
  setupAuthMode = 'skip';
  await finishSetup();
});

// Step 2 → Account form
document.getElementById('btn-setup-back').addEventListener('click', () => setupGoStep(1));
document.getElementById('btn-setup-finish').addEventListener('click', async () => {
  const username = document.getElementById('input-account-username').value.trim();
  const password = document.getElementById('input-account-password').value;
  if (!username) { document.getElementById('input-account-username').focus(); return; }
  if (!password) { document.getElementById('input-account-password').focus(); return; }
  await finishSetup(username, password);
});

async function finishSetup(username, password) {
  const consoleName = document.getElementById('input-console').value.trim();
  const dark = document.getElementById('setup-theme-checkbox').checked;
  setSetupError(null);
  setSetupLoading && setSetupLoading(true);

  try {
    // Always register console
    await registerConsole(consoleName);

    if (setupAuthMode === 'register') {
      await registerAccount(username, password);
    } else if (setupAuthMode === 'login') {
      await loginAccount(username, password);
    }
    // 'skip' → only console_key

    const banResult = await enforceBanForAuth(await getAuth());
    if (banResult.blocked) {
      return;
    }

    await dbSet('consoleName', consoleName);
    await dbSet('theme', dark ? 'dark' : 'light');
    await dbSet('setupDone', true);
    applyTheme(dark);

    const displayName = setupAuthMode !== 'skip'
      ? (await dbGet('account_username') || username)
      : 'Gast';
    await goHome(displayName, consoleName);
  } catch (err) {
    setSetupError(err.message || 'Unbekannter Fehler');
  } finally {
    const btn = document.getElementById('btn-setup-finish');
    if (btn) { btn.disabled = false; btn.textContent = 'Start'; }
  }
}

// ── Settings Account Panel ────────────────────────────────────────────────────
function setSettingsAccountError(msg) {
  const el = document.getElementById('settings-account-error');
  if (!msg) { el.textContent = ''; el.style.display = 'none'; return; }
  el.textContent = msg;
  el.style.display = 'block';
}

async function updateSettingsAccountUI() {
  const [account_id, account_username, console_key] = await Promise.all([
    dbGet('account_id'), dbGet('account_username'), dbGet('console_key')
  ]);
  const authSection = document.getElementById('settings-account-section');
  const loggedInSection = document.getElementById('settings-account-loggedin');
  const loginSection = document.getElementById('settings-account-login');

  if (account_id && account_username) {
    loggedInSection.style.display = '';
    loginSection.style.display = 'none';
    document.getElementById('settings-account-label').textContent = account_username;
  } else {
    loggedInSection.style.display = 'none';
    loginSection.style.display = '';
  }
}

document.getElementById('btn-settings-account-login').addEventListener('click', async () => {
  const username = document.getElementById('settings-account-username').value.trim();
  const password = document.getElementById('settings-account-password').value;
  if (!username || !password) { setSettingsAccountError('Benutzername und Passwort eingeben'); return; }
  document.getElementById('btn-settings-account-login').disabled = true;
  setSettingsAccountError(null);
  try {
    const data = await loginAccount(username, password);
    const banResult = await enforceBanForAuth(await getAuth());
    if (banResult.blocked) return;
    await updateSettingsAccountUI();
    const consoleName = await dbGet('consoleName');
    document.getElementById('home-meta-label').textContent = data.username + '  \u00b7  ' + consoleName;
    document.getElementById('settings-profile-label').textContent = data.username;
    document.getElementById('settings-account-username').value = '';
    document.getElementById('settings-account-password').value = '';
    setSettingsAccountError(null);
  } catch (err) {
    setSettingsAccountError(err.message || 'Login fehlgeschlagen');
  } finally {
    document.getElementById('btn-settings-account-login').disabled = false;
  }
});

document.getElementById('btn-settings-account-register').addEventListener('click', async () => {
  const username = document.getElementById('settings-account-username').value.trim();
  const password = document.getElementById('settings-account-password').value;
  if (!username || !password) { setSettingsAccountError('Benutzername und Passwort eingeben'); return; }
  if (password.length < 6) { setSettingsAccountError('Passwort muss mindestens 6 Zeichen haben'); return; }
  document.getElementById('btn-settings-account-register').disabled = true;
  setSettingsAccountError(null);
  try {
    const data = await registerAccount(username, password);
    const banResult = await enforceBanForAuth(await getAuth());
    if (banResult.blocked) return;
    await updateSettingsAccountUI();
    const consoleName = await dbGet('consoleName');
    document.getElementById('home-meta-label').textContent = data.username + '  \u00b7  ' + consoleName;
    document.getElementById('settings-profile-label').textContent = data.username;
    document.getElementById('settings-account-username').value = '';
    document.getElementById('settings-account-password').value = '';
    setSettingsAccountError(null);
  } catch (err) {
    setSettingsAccountError(err.message || 'Registrierung fehlgeschlagen');
  } finally {
    document.getElementById('btn-settings-account-register').disabled = false;
  }
});

document.getElementById('btn-settings-account-logout').addEventListener('click', async () => {
  await dbSet('account_id', undefined);
  await dbSet('account_key', undefined);
  await dbSet('account_username', undefined);
  await updateSettingsAccountUI();
  const consoleName = await dbGet('consoleName');
  document.getElementById('home-meta-label').textContent = 'Gast  \u00b7  ' + consoleName;
  document.getElementById('settings-profile-label').textContent = 'Gast';
});

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
async function launchGame(game) {
  const banResult = await enforceBanForAuth(await getAuth());
  if (banResult.blocked) return;
  document.getElementById('game-frame').src = BASE + game.path;
  show('screen-runner');
}
document.getElementById('close-game-btn').addEventListener('click', () =>
  document.getElementById('confirm-overlay').classList.add('show'));
document.getElementById('cancel-close').addEventListener('click', () =>
  document.getElementById('confirm-overlay').classList.remove('show'));
document.getElementById('confirm-close').addEventListener('click', () => {
  document.getElementById('confirm-overlay').classList.remove('show');
  document.getElementById('game-frame').src = 'about:blank';
  show('screen-home');
});

// ── Settings ──────────────────────────────────────────────────────────────────
document.getElementById('open-settings-btn').addEventListener('click', async () => {
  await updateSettingsAccountUI();
  document.getElementById('settings-overlay').classList.add('show');
});
document.getElementById('close-settings-btn').addEventListener('click', () =>
  document.getElementById('settings-overlay').classList.remove('show'));
document.getElementById('settings-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('settings-overlay'))
    document.getElementById('settings-overlay').classList.remove('show');
});
document.getElementById('home-theme-checkbox').addEventListener('change', async e => {
  applyTheme(e.target.checked);
  await dbSet('theme', e.target.checked ? 'dark' : 'light');
});
document.getElementById('setup-theme-checkbox').addEventListener('change', e => applyTheme(e.target.checked));
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

// ── Home ──────────────────────────────────────────────────────────────────────
async function goHome(displayName, consoleName) {
  document.getElementById('home-meta-label').textContent = displayName + '  \u00b7  ' + consoleName;
  document.getElementById('settings-profile-label').textContent = displayName;
  document.getElementById('settings-console-label').textContent = consoleName;
  const games = await loadGames();
  renderGames(games);
  show('screen-home');
}

// ── Storage Screen ────────────────────────────────────────────────────────────
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
  const [done, consoleName, account_username, theme, pendingUpdate] =
    await Promise.all([dbGet('setupDone'), dbGet('consoleName'), dbGet('account_username'), dbGet('theme'), dbGet('pendingUpdate')]);
  if (pendingUpdate) {
    await dbSet('pendingUpdate', false);
    location.reload();
    return;
  }
  if (theme) applyTheme(theme === 'dark');

  if (done) {
    // Ban-Check direkt beim Start, bevor der Home-Screen sichtbar wird
    const auth = await getAuth();
    const banResult = await enforceBanForAuth(auth);
    if (banResult.blocked) return;

    const displayName = account_username || 'Gast';
    await goHome(displayName, consoleName || 'My Game-Box');
  } else {
    setupGoStep(0);
    show('screen-setup');
  }
}

async function boot() {
  db = await openDB();
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
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
