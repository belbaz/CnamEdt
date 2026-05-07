// Service Worker pour PWA EDT EICNAM
// Gère le cache offline et les mises à jour
// NOTE: CACHE_VERSION est injecté automatiquement par le script pre-build.js avec la version de package.json
// BUILD_STAMP : change à chaque build (commit / déploiement) pour que le navigateur détecte une nouvelle version
// même si la version npm n’a pas été bumpée — sinon pas de worker « waiting » → pas de bannière PWA.

const BUILD_STAMP = "d2dab4b";
const CACHE_VERSION = '2.1.99'; // Sera remplacé automatiquement par pre-build.js
const CACHE_NAME = `edt-pwa-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `edt-data-${CACHE_VERSION}`;

// Compteur de 404 pour détecter les builds obsolètes
let consecutive404Count = 0;
const MAX_404_BEFORE_RELOAD = 3; // Après 3 fichiers 404, forcer un rechargement

// Sur mobile, fetch() peut rester « en attente » très longtemps hors ligne au lieu de rejeter :
// sans timeout, le repli cache ne s’exécute jamais → site inaccessible sans Internet.
const NAV_FETCH_TIMEOUT_MS = 5000;
const STATIC_FETCH_TIMEOUT_MS = 5000;
const API_FETCH_TIMEOUT_MS = 5000;
const OTHER_FETCH_TIMEOUT_MS = 5000;

// Ressources essentielles à mettre en cache immédiatement
const APP_SHELL = [
  '/',
  '/favicon.svg',
  '/manifest.webmanifest'
];

// Référencer BUILD_STAMP pour que le fichier diffère à chaque build (évite l’élimination dead-code)
console.log('[SW] build:', typeof BUILD_STAMP !== 'undefined' ? BUILD_STAMP : '');

/**
 * cache.addAll échoue en entier si une seule URL échoue — sur mobile ça peut laisser l’app shell vide.
 * On précache chaque entrée indépendamment.
 */
async function precacheAppShellUrls(cache) {
  for (const path of APP_SHELL) {
    try {
      const request = new Request(path, {
        cache: 'reload',
        credentials: 'same-origin'
      });
      await cache.add(request);
    } catch (e) {
      console.warn('[SW] Précache app shell ignorée:', path, e && e.message ? e.message : e);
    }
  }
}

/**
 * Sur certains navigateurs mobiles (WebKit / PWA standalone), la navigation plein écran n’a pas
 * toujours request.mode === "navigate" — sans ça, le HTML part dans la branche « ressources »
 * et le repli hors ligne ne trouve pas la bonne entrée dans le cache.
 */
function isTopLevelDocumentNavigation(req, url) {
  if (req.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  if (req.mode === 'navigate') return true;
  try {
    if (req.destination === 'document') return true;
  } catch (e) {
    /* anciens SW */
  }
  const dest = req.headers.get('Sec-Fetch-Dest');
  if (dest === 'document') return true;
  // Safari / WebKit : parfois pas de Sec-Fetch-Dest, mais Sec-Fetch-Mode: navigate + HTML
  const modeHdr = req.headers.get('Sec-Fetch-Mode');
  const accept = req.headers.get('Accept') || '';
  if (modeHdr === 'navigate' && accept.includes('text/html')) return true;
  // Chrome Android / WebView : navigation document avec peu d’en-têtes Sec-Fetch
  if (accept.includes('text/html')) {
    if (isRscOrNextDataUrl(url)) return false;
    if (!url.pathname.startsWith('/_next/') && !url.pathname.startsWith('/api/')) {
      const site = req.headers.get('Sec-Fetch-Site');
      if (site === 'none') return true;
      const hasSecFetch =
        req.headers.has('Sec-Fetch-Dest') ||
        !!req.headers.get('Sec-Fetch-Mode');
      if (!hasSecFetch) return true;
    }
  }
  return false;
}

function isRscOrNextDataUrl(url) {
  return url.searchParams.has('_rsc') || url.searchParams.has('_next');
}

/**
 * Next.js génère un ?_rsc= différent à chaque requête flight : hors ligne, caches.match(req) échoue
 * même si une réponse flight pour le même chemin est déjà en cache (préfetch / visite antérieure).
 * On réutilise une entrée « même pathname + _rsc » du cache (même build).
 */
async function matchCachedFlightForPathname(req, url) {
  try {
    const origin = url.origin;
    const wantPath = url.pathname || '/';
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    for (const key of keys) {
      try {
        const ku = new URL(key.url);
        if (ku.origin !== origin || ku.pathname !== wantPath) continue;
        if (!ku.searchParams.has('_rsc')) continue;
        const hit = await cache.match(key);
        if (!hit || !hit.ok) continue;
        const ct = (hit.headers.get('content-type') || '').toLowerCase();
        // Ne pas renvoyer une page HTML complète à la place d’un payload flight
        if (ct.includes('text/html') && !ct.includes('component')) continue;
        return hit;
      } catch (e) {
        /* continue */
      }
    }
  } catch (e) {
    /* ignore */
  }
  return null;
}

/**
 * Repli document hors ligne : plusieurs clés possibles (mobile normalise différemment les URL).
 */
async function matchOfflineDocument(req) {
  const attempts = [];

  attempts.push(() => caches.match(req));
  attempts.push(() => caches.match(req, { ignoreSearch: true }));

  try {
    const u = new URL(req.url);
    const origin = u.origin;
    const path = u.pathname || '/';
    attempts.push(() =>
      caches.match(new Request(origin + path, { credentials: 'same-origin' }))
    );
    if (path !== '/' && !path.endsWith('/')) {
      attempts.push(() =>
        caches.match(new Request(origin + path + '/', { credentials: 'same-origin' }))
      );
    }
    attempts.push(() => caches.match(new Request(origin + '/', { credentials: 'same-origin' })));
  } catch (e) {
    /* ignore */
  }

  attempts.push(() => caches.match('/'));

  for (const run of attempts) {
    try {
      const hit = await run();
      if (hit) return hit;
    } catch (e) {
      /* continue */
    }
  }

  // Dernier recours : parcourir les clés (certaines entrées Android ne matchent pas Request)
  try {
    const u = new URL(req.url);
    const wantPath = u.pathname || '/';
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    for (const key of keys) {
      const ku = new URL(key.url);
      if (ku.origin !== u.origin || ku.pathname !== wantPath) continue;
      const hit = await cache.match(key);
      if (!hit) continue;
      const ct = (hit.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/html')) return hit;
    }
  } catch (e) {
    /* ignore */
  }
  return null;
}

async function matchOfflineWithSearchFallback(req, url) {
  let hit = await caches.match(req);
  if (hit) return hit;
  if (!isRscOrNextDataUrl(url)) {
    hit = await caches.match(req, { ignoreSearch: true });
    return hit || null;
  }
  hit = await matchCachedFlightForPathname(req, url);
  return hit || null;
}

/**
 * fetch avec timeout (AbortSignal) — indispensable sur réseaux mobiles / mode avion.
 */
function fetchWithTimeout(req, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(req, { signal: controller.signal }).finally(() => clearTimeout(id));
}

function navigatorClaimsOffline() {
  try {
    return self.navigator && self.navigator.onLine === false;
  } catch (e) {
    return false;
  }
}

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation du Service Worker...');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => precacheAppShellUrls(cache)),
      caches.open(DATA_CACHE_NAME)
    ])
    .then(() => {
      // Première installation : activer tout de suite (sinon sur Android le SW peut rester
      // inactif jusqu’à fermeture d’onglets → jamais de cache offline au 1er usage).
      if (!self.registration.active) {
        console.log('[SW] Première installation → skipWaiting');
        self.skipWaiting();
      } else {
        console.log('[SW] Mise à jour installée (en attente — bannière PWA)');
      }
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
  if (isTopLevelDocumentNavigation(req, url)) {
    event.respondWith(
      (async () => {
        const cachedPromise = matchOfflineDocument(req);
        if (navigatorClaimsOffline()) {
          const cached = await cachedPromise;
          if (cached) return cached;
        }
        try {
          const res = await fetchWithTimeout(req, NAV_FETCH_TIMEOUT_MS);
          if (res && res.ok) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            return res;
          }
          const cached = await cachedPromise;
          if (cached) return cached;
          return res;
        } catch (e) {
          const cached = await cachedPromise;
          if (cached) return cached;
          return new Response('Page non disponible hors ligne', {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
      })()
    );
    return;
  }

  // Pour les assets Next.js (_next/static/) - Network-first avec gestion des 404
  // Important : Si un fichier retourne 404, c'est qu'il a été remplacé par un nouveau build
  // Il faut supprimer l'entrée du cache obsolète et retourner l'erreur
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        if (navigatorClaimsOffline()) {
          const cached = await caches.match(req);
          if (cached) return cached;
        }
        try {
          const res = await fetchWithTimeout(req, STATIC_FETCH_TIMEOUT_MS);
          if (res && res.ok) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            consecutive404Count = 0;
            return res;
          }
          if (res && res.status === 404) {
            console.warn('[SW] Fichier 404 détecté (probablement obsolète):', req.url);
            caches.open(CACHE_NAME).then((cache) => cache.delete(req));
            consecutive404Count++;
            if (consecutive404Count >= MAX_404_BEFORE_RELOAD) {
              console.error('[SW] Trop de fichiers 404 détectés - probable nouveau build. Forcer rechargement...');
              consecutive404Count = 0;
              self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                  client.postMessage({ type: 'FORCE_RELOAD', reason: 'build_updated' });
                });
              });
            }
            const cached = await caches.match(req);
            if (cached) return cached;
            return res;
          }
          const cached = await caches.match(req);
          if (cached) return cached;
          return res;
        } catch (err) {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        }
      })()
    );
    return;
  }

  // Pour les API routes - Network-first avec fallback cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        if (navigatorClaimsOffline()) {
          let cached = await caches.match(req);
          if (cached) return cached;
          cached = await caches.match(req, { ignoreSearch: true });
          if (cached) return cached;
        }
        try {
          const res = await fetchWithTimeout(req, API_FETCH_TIMEOUT_MS);
          if (res && res.ok) {
            const resClone = res.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        } catch (e) {
          let cached = await caches.match(req);
          if (cached) return cached;
          cached = await caches.match(req, { ignoreSearch: true });
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'Hors ligne' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })()
    );
    return;
  }

  // Pour les autres ressources (images, fonts, etc.) - Network-first avec gestion 404
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        if (navigatorClaimsOffline()) {
          const cached = await matchOfflineWithSearchFallback(req, url);
          if (cached) return cached;
        }
        try {
          const res = await fetchWithTimeout(req, OTHER_FETCH_TIMEOUT_MS);
          if (res && res.ok) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            return res;
          }
          if (res && res.status === 404) {
            console.warn('[SW] Ressource 404 détectée (probablement obsolète):', req.url);
            caches.open(CACHE_NAME).then((cache) => cache.delete(req));
            const cached = await matchOfflineWithSearchFallback(req, url);
            if (cached) return cached;
            return res;
          }
          const cached = await matchOfflineWithSearchFallback(req, url);
          if (cached) return cached;
          return res;
        } catch (err) {
          const cached = await matchOfflineWithSearchFallback(req, url);
          if (cached) return cached;
          return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        }
      })()
    );
  }
});
