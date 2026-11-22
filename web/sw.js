const CACHE_NAME = 'prostudio-mobile-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './engine/algorithms.js',
  './engine/layer-styles-engine.js',
  './engine/brush-engine.js',
  './engine/psd-codec.js',
  './engine/studio-engine.js',
  './engine/sample-projects.js',
  './ui/layer-style-dialog.js',
  './ui/new-document-screen.js',
  './assets/icons/logo.svg',
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
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
