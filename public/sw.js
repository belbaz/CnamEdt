// Basic service worker for offline reload and static asset caching
const CACHE_NAME = 'edt-app-shell-v1';
// Detect localhost within the service worker scope
const SCOPE_HOSTNAME = (() => {
  try { return new URL(self.registration.scope).hostname; } catch (e) { return ''; }
})();
const IS_LOCALHOST = SCOPE_HOSTNAME === 'localhost' || SCOPE_HOSTNAME === '127.0.0.1' || SCOPE_HOSTNAME === '::1';
const APP_SHELL = [
  '/',
  '/favicon.svg',
  '/api/version'
];

self.addEventListener('install', (event) => {
  if (IS_LOCALHOST) {
    // Do not cache anything on localhost
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  if (IS_LOCALHOST) {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
    return;
  }
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // On localhost, never use Cache Storage and don't intercept beyond passthrough
  if (IS_LOCALHOST) {
    event.respondWith(fetch(req));
    return;
  }

  // For navigation requests, try network first; on success update cache, fallback to cache, then to '/'
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req))
        .then((res) => res || caches.match('/'))
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

  // For same-origin GET requests, use network-first with offline fallback to cache
  if (req.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});


