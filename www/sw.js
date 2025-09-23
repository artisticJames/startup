self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('startup-static-v1').then(cache => cache.addAll([
    '/index.html','/styles.css','/app.js','/assets/logo.svg'
  ])));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});

