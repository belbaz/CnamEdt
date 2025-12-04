// Service Worker pour PWA EDT EICNAM
// Gère le cache offline et les mises à jour
// NOTE: CACHE_VERSION est injecté automatiquement par le script pre-build.js avec la version de package.json

const CACHE_VERSION = '2.1.12'; // Sera remplacé automatiquement par pre-build.js
const CACHE_NAME = `edt-pwa-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `edt-data-${CACHE_VERSION}`;

// Ressources essentielles à mettre en cache immédiatement
const APP_SHELL = [
  '/',
  '/favicon.svg',
  '/manifest.webmanifest'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation du Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache de l'app shell
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.addAll(APP_SHELL).catch((err) => {
            console.warn('[SW] Cache install partiel:', err);
            return Promise.resolve();
          });
        }),
      // Créer le cache pour les données
      caches.open(DATA_CACHE_NAME)
    ])
    .then(() => {
      // NE PAS skipWaiting automatiquement - attendre que l'utilisateur accepte la mise à jour
      // Cela permet d'afficher la bannière de mise à jour
      console.log('[SW] Service Worker installé (en attente)');
    })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation du Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== DATA_CACHE_NAME)
            .map((key) => {
              console.log('[SW] Suppression ancien cache:', key);
              return caches.delete(key);
            })
        );
      }),
      // Prendre le contrôle immédiatement si c'est la première installation
      self.clients.claim()
    ])
  );
});

// Écouter les messages du client (pour les mises à jour)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Message SKIP_WAITING reçu - activation immédiate');
    self.skipWaiting();
  }
});

// Gestion des requêtes réseau
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorer les requêtes non-GET
  if (req.method !== 'GET') {
    return;
  }

  // Pour les requêtes de navigation (pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req)
        .then((cached) => {
          if (cached) {
            // Utiliser le cache immédiatement pour une navigation rapide
            // Mettre à jour en arrière-plan
            fetch(req)
              .then((res) => {
                if (res && res.ok) {
                  const resClone = res.clone();
                  caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                }
              })
              .catch(() => {});
            return cached;
          }
          
          // Pas de cache, essayer le réseau
          return fetch(req)
            .then((res) => {
              if (res && res.ok) {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
              }
              return res;
            })
            .catch(() => {
              // Hors ligne, retourner la page d'accueil en cache
              return caches.match('/').then((fallback) => 
                fallback || new Response('Page non disponible hors ligne', { 
                  status: 503,
                  headers: { 'Content-Type': 'text/html; charset=utf-8' }
                })
              );
            });
        })
    );
    return;
  }

  // Pour les assets Next.js (_next/static/) - Cache-first pour performance
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req)
        .then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(req)
            .then((res) => {
              if (res && res.ok) {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
              }
              return res;
            })
            .catch(() => caches.match(req));
        })
    );
    return;
  }

  // Pour les API routes - Network-first avec fallback cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Mettre en cache les réponses réussies
          if (res && res.ok) {
            const resClone = res.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => {
          // Hors ligne, essayer le cache
          return caches.match(req).then((cached) => {
            if (cached) {
              return cached;
            }
            // Pas de cache, retourner une erreur
            return new Response(JSON.stringify({ error: 'Hors ligne' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Pour les autres ressources (images, fonts, etc.) - Cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req)
        .then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(req)
            .then((res) => {
              if (res && res.ok) {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
              }
              return res;
            })
            .catch(() => caches.match(req));
        })
    );
  }
});
