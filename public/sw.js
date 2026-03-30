// Service Worker pour PWA EDT EICNAM
// Gère le cache offline et les mises à jour
// NOTE: CACHE_VERSION est injecté automatiquement par le script pre-build.js avec la version de package.json

const CACHE_VERSION = '2.1.95'; // Sera remplacé automatiquement par pre-build.js
const CACHE_NAME = `edt-pwa-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `edt-data-${CACHE_VERSION}`;

// Compteur de 404 pour détecter les builds obsolètes
let consecutive404Count = 0;
const MAX_404_BEFORE_RELOAD = 3; // Après 3 fichiers 404, forcer un rechargement

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

  // Pour les requêtes de navigation (pages) - Network-first
  // IMPORTANT: on ne fait PAS cache-first ici car si l'HTML est obsolète (vieux build),
  // re-servir depuis le cache après un reload reproduirait l'écran blanc en boucle.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Réseau disponible : mettre à jour le cache et retourner la réponse fraîche
          if (res && res.ok) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => {
          // Hors ligne uniquement : fallback sur le cache
          return caches.match(req)
            .then((cached) => {
              if (cached) return cached;
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

  // Pour les assets Next.js (_next/static/) - Network-first avec gestion des 404
  // Important : Si un fichier retourne 404, c'est qu'il a été remplacé par un nouveau build
  // Il faut supprimer l'entrée du cache obsolète et retourner l'erreur
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Si la requête réussit, mettre à jour le cache
          if (res && res.ok) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            return res;
          }
          
          // Si 404, supprimer l'entrée obsolète du cache et retourner l'erreur
          if (res && res.status === 404) {
            console.warn('[SW] Fichier 404 détecté (probablement obsolète):', req.url);
            caches.open(CACHE_NAME).then((cache) => cache.delete(req));
            
            // Incrémenter le compteur de 404
            consecutive404Count++;
            
            // Si trop de 404, c'est probablement un nouveau build - forcer un rechargement
            if (consecutive404Count >= MAX_404_BEFORE_RELOAD) {
              console.error('[SW] Trop de fichiers 404 détectés - probable nouveau build. Forcer rechargement...');
              consecutive404Count = 0; // Reset pour éviter les boucles
              // Informer tous les clients de recharger
              self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                  client.postMessage({ type: 'FORCE_RELOAD', reason: 'build_updated' });
                });
              });
            }
            
            return res; // Retourner l'erreur 404 pour que Next.js puisse gérer
          }
          
          // Si la requête réussit, reset le compteur de 404
          if (res && res.ok) {
            consecutive404Count = 0;
          }
          
          return res;
        })
        .catch((err) => {
          // En cas d'erreur réseau, essayer le cache en fallback
          // Mais seulement si on est vraiment hors ligne
          return caches.match(req).then((cached) => {
            if (cached) {
              return cached;
            }
            // Si pas de cache et erreur réseau, retourner une erreur
            return new Response('Network error', { 
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
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

  // Pour les autres ressources (images, fonts, etc.) - Network-first avec gestion 404
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Si la requête réussit, mettre à jour le cache
          if (res && res.ok) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            return res;
          }
          
          // Si 404, supprimer l'entrée obsolète du cache
          if (res && res.status === 404) {
            console.warn('[SW] Ressource 404 détectée (probablement obsolète):', req.url);
            caches.open(CACHE_NAME).then((cache) => cache.delete(req));
            return res;
          }
          
          return res;
        })
        .catch((err) => {
          // En cas d'erreur réseau, essayer le cache en fallback
          return caches.match(req).then((cached) => {
            if (cached) {
              return cached;
            }
            // Si pas de cache, retourner une erreur
            return new Response('Network error', { 
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        })
    );
  }
});
