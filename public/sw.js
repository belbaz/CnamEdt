// Basic service worker for offline reload and static asset caching
const CACHE_NAME = 'edt-app-shell-v1';
const APP_SHELL = [
  '/',
  '/favicon.svg',
  '/api/version'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
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
  const req = event.request;

  // For navigation requests, try network first, fallback to cache, then to '/'
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req)).then((res) => res || caches.match('/'))
    );
    return;
  }

  const url = new URL(req.url);

  // Cache-first for Next.js static assets
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match(req)))
    );
    return;
  }

  // For same-origin GET requests, try cache first then network
  if (req.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }))
    );
  }
});


