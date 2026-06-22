// ── Game-Box sw.js v4 ────────────────────────────────────────────────────────
// Strategy:
//   Shell files (HTML/JS/CSS)  → Network-first, cache fallback
//   Game assets (images/html)  → Cache-first, network fallback
//   gamelist.json              → Network-first always (so new games show up)
// Auto-update: when a new SW is detected, all open clients reload automatically.

const CACHE_VERSION = 'gamebox-v4';

const BASE = self.location.pathname.replace('sw.js', '');

const PRECACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'style.css',
  BASE + 'app.js',
  BASE + 'manifest.json',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png',
];

const SHELL_EXTS = ['.html', '.js', '.css', '.json'];

function isShell(url) {
  const u = new URL(url);
  return SHELL_EXTS.some(ext => u.pathname.endsWith(ext)) || u.pathname.endsWith('/');
}

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: delete old caches + notify all clients to reload ────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' })))
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (!url.startsWith(self.location.origin)) return;
  if (isShell(url)) {
    e.respondWith(networkFirst(e.request));
  } else {
    e.respondWith(cacheFirst(e.request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cache  = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}
