// Service Worker — Literaturas Bíblicas
// Necesario para que Chrome/Edge/Android activen el beforeinstallprompt

const CACHE_NAME = 'lb-cache-v2';
const ASSETS = ['./', './index.html', './manifest.json', './style.css', './icono.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});