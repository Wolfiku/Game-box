// ── Game-Box sw.js v3 ────────────────────────────────────────────────────────
// Strategy:
//   Shell files (HTML/JS/CSS)  → Network-first, cache fallback
//   Game assets (images/html)  → Cache-first, network fallback
//   gamelist.json              → Network-first always (so new games show up)

const CACHE_VERSION = 'gamebox-v3';

// Detect base path dynamically so the SW works on any host (GitHub Pages, Plesk, etc.)
const BASE = self.location.pathname.replace('sw.js', '');

// Files to pre-cache on install
const PRECACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'style.css',
  BASE + 'app.js',
  BASE + 'manifest.json',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png',
];

// Shell file extensions — always try network first
const SHELL_EXTS = ['.html', '.js', '.css', '.json'];

function isShell(url) {
  const u = new URL(url);
  return SHELL_EXTS.some(ext => u.pathname.endsWith(ext)) || u.pathname.endsWith('/');
}

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting(); // activate immediately
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of all open tabs immediately
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Only handle same-origin requests
  if (!url.startsWith(self.location.origin)) return;

  if (isShell(url)) {
    // Network-first: try to get a fresh copy, fall back to cache
    e.respondWith(networkFirst(e.request));
  } else {
    // Cache-first: serve from cache (game assets, images, etc.)
    e.respondWith(cacheFirst(e.request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      cache.put(request, fresh.clone()); // update cache with fresh copy
    }
    return fresh;
  } catch {
    // Offline — serve from cache
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
