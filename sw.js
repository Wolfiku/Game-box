const CACHE = 'gamebox-v1';
const ASSETS = [
  '/Game-box/',
  '/Game-box/index.html',
  '/Game-box/style.css',
  '/Game-box/app.js',
  '/Game-box/manifest.json',
  '/Game-box/icons/icon-192.png',
  '/Game-box/icons/icon-512.png',
  '/Game-box/games/gamelist.json'
];

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(ASSETS))
));

self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));
