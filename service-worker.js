// Minimal PWA service worker for PWABuilder detection
const CACHE_NAME = 'startup-app-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/login.html',
  '/styles.css',
  '/lib.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return; // Let non-GET requests pass through
  }

  // Only handle same-origin requests; skip cross-origin to avoid CORS issues
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return; // Don't call respondWith for cross-origin
  }

  // Bypass cache for API calls to avoid stale data
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return fetch(request)
        .then((networkResponse) => {
          // Cache successful same-origin responses (non-API)
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache if available, otherwise a basic offline response
          if (cached) return cached;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});


