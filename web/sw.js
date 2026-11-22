const CACHE_NAME = 'photocraft-mobile-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './engine/algorithms.js',
  './engine/brush-engine.js',
  './engine/photocraft-engine.js',
  './engine/psd-codec.js',
  './engine/sample-projects.js',
  './assets/icons/icon-64.png',
  './assets/icons/icon-128.png',
  './assets/icons/icon-256.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
