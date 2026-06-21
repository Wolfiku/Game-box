const CACHE = 'gamebox-v2';

// Static shell assets
const SHELL = [
  '/Game-box/',
  '/Game-box/index.html',
  '/Game-box/style.css',
  '/Game-box/app.js',
  '/Game-box/manifest.json',
  '/Game-box/icons/icon-192.png',
  '/Game-box/icons/icon-512.png',
  '/Game-box/games/gamelist.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Cache shell first
      await cache.addAll(SHELL);
      // Then try to fetch and cache gamelist + all game assets
      try {
        const r = await fetch('/Game-box/games/gamelist.json');
        const data = await r.json();
        const gameAssets = [];
        for (const game of (data.games || [])) {
          gameAssets.push('/Game-box/' + game.icon);
          gameAssets.push('/Game-box/' + game.path);
        }
        await cache.addAll(gameAssets.filter(Boolean));
      } catch {}
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first with network fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache any successful GET response from our origin
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
