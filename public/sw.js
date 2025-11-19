// Basic service worker for offline reload and static asset caching
const CACHE_NAME = 'edt-app-shell-v1';
const APP_SHELL = [
  '/',
  '/favicon.svg',
  '/api/version'
];

self.addEventListener('install', (event) => {
  // Toujours installer le cache, même en localhost (pour tester le mode hors ligne)
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Essayer de mettre en cache les ressources de base
        // Si ça échoue (hors ligne), on continue quand même
        return cache.addAll(APP_SHELL).catch((err) => {
          console.warn('[SW] Cache install partiel (certaines ressources non disponibles):', err);
          // Continuer même si certaines ressources ne peuvent pas être mises en cache
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Toujours activer le cache, même en localhost (pour tester le mode hors ligne)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // For navigation requests, try cache first for offline, then network
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req)
        .then((cached) => {
          // Si on a un cache, l'utiliser immédiatement (offline-first pour navigation)
          if (cached) {
            // En arrière-plan, essayer de mettre à jour le cache
            fetch(req)
              .then((res) => {
                if (res && res.ok) {
                  const resClone = res.clone();
                  caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                }
              })
              .catch(() => {}); // Ignorer les erreurs de mise à jour en arrière-plan
            return cached;
          }
          // Sinon, essayer le réseau
          return fetch(req)
            .then((res) => {
              if (res && res.ok) {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
              }
              return res;
            })
            .catch(() => {
              // Si le réseau échoue, essayer le cache de la page d'accueil
              return caches.match('/').then((fallback) => fallback || new Response('Page non disponible hors ligne', { status: 503 }));
            });
        })
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


