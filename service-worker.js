/**
 * service-worker.js — Service Worker de la PWA
 *
 * Estrategia: Cache-First para recursos estáticos.
 *
 * Flujo:
 *  1. `install`  → Pre-cachea todos los recursos estáticos de la app.
 *  2. `activate` → Limpia cachés antiguas para no ocupar espacio innecesario.
 *  3. `fetch`    → Intercepta peticiones:
 *                   - Si el recurso está en caché → lo sirve desde caché (offline-first).
 *                   - Si no → lo pide a la red y lo cachea para futuras visitas.
 *
 * Nota: el SW solo puede interceptar peticiones del mismo origen.
 * La redirección a Google Apps Script sigue yendo por la red (origen externo).
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nombre de la caché.
 * Cambia el número de versión cada vez que actualices los archivos
 * para que el SW invalide la caché antigua y descargue los nuevos.
 */
const CACHE_NAME = 'acceso-rapido-v1';

/**
 * Lista de recursos a pre-cachear durante la instalación del SW.
 * Ajusta las rutas según la estructura real de tu proyecto.
 *
 * IMPORTANTE: Todos estos archivos DEBEN existir en el servidor.
 * Si alguno falla, el proceso de instalación del SW fallará completo.
 */
const PRECACHE_URLS = [
  './',                      // raíz (index.html)
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  // Íconos — asegúrate de tener estos archivos reales en /icons/
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ─────────────────────────────────────────────────────────────────────────────
// EVENTO: install
// Se ejecuta la primera vez que el SW se instala (o cuando cambia el código).
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker…');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-cacheando recursos estáticos…');
      // addAll hace fetch de cada URL y la guarda en caché.
      // Si alguna falla, toda la instalación falla (comportamiento deliberado
      // para garantizar que la app funcione offline desde el primer uso).
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      console.log('[SW] Pre-caché completada.');
      // Fuerza al nuevo SW a activarse inmediatamente,
      // sin esperar a que se cierren las pestañas existentes.
      return self.skipWaiting();
    }).catch((err) => {
      console.error('[SW] Error durante la pre-caché:', err);
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTO: activate
// Se ejecuta cuando el nuevo SW toma el control (tras skipWaiting o
// cuando no quedan pestañas con el SW anterior).
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker…');

  event.waitUntil(
    // Obtener todas las cachés existentes
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          // Filtrar las cachés que no pertenecen a la versión actual
          .filter((name) => name !== CACHE_NAME)
          .map((outdatedCache) => {
            console.log('[SW] Eliminando caché antigua:', outdatedCache);
            return caches.delete(outdatedCache);
          })
      );
    }).then(() => {
      console.log('[SW] Activación completa. El SW controla todas las páginas.');
      // Toma control inmediato de todas las pestañas del mismo scope
      return self.clients.claim();
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTO: fetch
// Intercepta todas las peticiones de red del scope del SW.
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── No interceptar peticiones externas ────────────────────────────────────
  //
  // Solo gestionamos recursos del mismo origen.
  // Las peticiones a Google Apps Script, Google Fonts, etc. van directas a la red.
  if (url.origin !== self.location.origin) {
    return; // Deja pasar la petición sin interceptar
  }

  // ── No interceptar peticiones que no sean GET ─────────────────────────────
  //
  // POST, PUT, DELETE, etc. siempre van a la red.
  if (request.method !== 'GET') {
    return;
  }

  // ── Estrategia: Cache-First con fallback a red ────────────────────────────
  //
  // 1. Busca el recurso en caché.
  // 2. Si está → devuélvelo inmediatamente (más rápido, funciona offline).
  // 3. Si no está → pídelo a la red y guárdalo en caché para la próxima vez.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // ✅ Encontrado en caché → servir directamente
        return cachedResponse;
      }

      // ❌ No está en caché → ir a la red
      return fetch(request)
        .then((networkResponse) => {
          // Verificar que la respuesta es válida antes de cachearla
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === 'error'
          ) {
            return networkResponse;
          }

          // Clonar la respuesta porque los streams solo se pueden leer una vez:
          // - Una copia va a la caché.
          // - La otra se devuelve al navegador.
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Sin red y sin caché: devolver una respuesta de error amigable
          // (opcional: podrías devolver una página offline.html si la tienes)
          console.warn('[SW] Sin red y sin caché para:', request.url);
          return new Response(
            '<h1 style="font-family:sans-serif;text-align:center;padding:40px">Sin conexión</h1>' +
            '<p style="text-align:center">Por favor, comprueba tu conexión a internet.</p>',
            {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 503,
            }
          );
        });
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTO: message
// Permite comunicación desde app.js → service-worker.js (opcional).
// Por ejemplo: para forzar una actualización del SW.
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Recibida orden SKIP_WAITING → activando nueva versión.');
    self.skipWaiting();
  }
});
