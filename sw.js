// ── Game-Box sw.js ────────────────────────────────────────────────────────────
// Cache version = build timestamp — changes with EVERY commit so the browser
// always detects a new SW and triggers the update flow.

const CACHE = 'gamebox-20260703_2350';

const BASE = self.location.pathname.replace(/sw\.js$/, '');

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
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: purge old caches → claim clients → notify update ─────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => clients.forEach(c =>
        c.postMessage({ type: 'SW_UPDATED', version: CACHE })
      ))
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (!url.startsWith(self.location.origin)) return;
  e.respondWith(isShell(url) ? networkFirst(e.request) : cacheFirst(e.request));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}
