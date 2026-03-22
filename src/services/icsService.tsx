// @ts-nocheck
/**
 * Service pour récupérer et parser les fichiers ICS
 */

// URL de l'ICS EICNAM (utilise la variable d'environnement si disponible, sinon fallback)
// Next.js remplace process.env.NEXT_PUBLIC_* au moment du build
const ICS_URL = process.env.NEXT_PUBLIC_ICS_URL;
const activeCacheEnv = process.env.NEXT_PUBLIC_ACTIVE_CACHE ?? process.env.ACTIVE_CACHE ?? 'true';
const ACTIVE_CACHE = String(activeCacheEnv).toLowerCase() !== 'false';

/** Dev / test : forcer le chemin « cache obsolète » comme si le hash ICS avait changé */
function shouldSimulateStaleCache() {
    if (typeof window === 'undefined') return false;
    if (process.env.NEXT_PUBLIC_SIMULATE_EDT_CHANGE === 'true') return true;
    try {
        return localStorage.getItem('DEV_SIMULATE_EDT_CHANGE') === '1';
    } catch {
        return false;
    }
}

/**
 * Charge les événements depuis le cache localStorage
 * DÉFINI EN PREMIER pour être disponible dans les autres fonctions
 * Retourne également le hash du cache pour comparaison avec le serveur
 */
export function loadEventsFromCache() {
    if (!ACTIVE_CACHE || typeof localStorage === 'undefined') return null;
    const saved = localStorage.getItem("events");
    const savedColors = localStorage.getItem("subjectColors");
    const savedHash = localStorage.getItem("cacheHash");
    
    if (saved && savedColors) {
        return {
            events: JSON.parse(saved),
            colors: JSON.parse(savedColors),
            hash: savedHash || null  // Le hash peut être null pour les anciens caches
        };
    }
    
    return null;
}

/**
 * Parse un fichier ICS en format texte vers un tableau d'événements
 */
function parseICSContent(icsContent) {
    const events = [];
    const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
    let match;

    while ((match = eventRegex.exec(icsContent)) !== null) {
        const eventContent = match[1];
        const summary = eventContent.match(/SUMMARY:(.*)/)?.[1]?.trim();
        const dtstart = eventContent.match(/DTSTART[^:]*:(.*)/)?.[1]?.trim();
        const dtend = eventContent.match(/DTEND[^:]*:(.*)/)?.[1]?.trim();
        const location = eventContent.match(/LOCATION:(.*)/)?.[1]?.trim();
        const description = eventContent.match(/DESCRIPTION:(.*)/)?.[1]?.trim();

        const parseICALDate = (str) => {
            if (!str) return null;
            const year = str.substr(0, 4);
            const month = str.substr(4, 2);
            const day = str.substr(6, 2);
            const hour = str.substr(9, 2);
            const minute = str.substr(11, 2);
            const second = str.substr(13, 2);
            return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        };

        events.push({
            summary: summary || '',
            start: parseICALDate(dtstart),
            end: parseICALDate(dtend),
            location: location || '',
            description: description || ''
        });
    }
    return events;
}

/**
 * Récupère les événements ICS depuis l'API route
 * @param {{ onStaleCache?: () => void }} [options] — appelé avant un refetch forcé (hash local ≠ serveur)
 */
async function fetchEventsForWeb(options = {}) {
    const { onStaleCache } = options;
    console.log('[ICS Service] Fetching from web API route');
    
    try {
        const lang = typeof localStorage !== 'undefined' ? (localStorage.getItem('language') || 'fr') : 'fr';
        const res = await fetch(`/api/fetch-ics?lang=${encodeURIComponent(lang)}`, {
            headers: {
                'Accept': 'application/json',
            },
            cache: 'no-cache' // Éviter les problèmes de cache
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMessage = errorData.error || `HTTP ${res.status}: ${res.statusText}`;
            const error = new Error(errorMessage);
            // Propager les détails de l'erreur
            if (errorData.details) error.details = errorData.details;
            if (errorData.icsError) error.icsError = errorData.icsError;
            if (errorData.supabaseError) error.supabaseError = errorData.supabaseError;
            throw error;
        }
        
        const data = await res.json();
        
        if (data?.error) {
            const error = new Error(data.error + (data.details ? ` - ${data.details}` : ''));
            // Propager les détails de l'erreur
            if (data.details) error.details = data.details;
            if (data.icsError) error.icsError = data.icsError;
            if (data.supabaseError) error.supabaseError = data.supabaseError;
            throw error;
        }

        let events = [];
        let diff = { added: [], updated: [], removed: [] };
        let meta = { source: 'api', fromCache: false, changed: null };

        // Si le serveur dit que rien n'a changé, vérifier si le cache local correspond
        if (data && data.unchanged === true) {
            console.log('[ICS Service] Server says unchanged, checking local cache');
            const cached = loadEventsFromCache();
            const serverHash = data.meta?.hash || null;
            const localHash = cached?.hash || null;
            
            // CORRECTION BUG CACHE : Comparer le hash serveur avec le hash local
            // Si le hash local ne correspond pas au hash serveur, le cache est obsolète !
            const simulateStale = shouldSimulateStaleCache();
            const hashMatch = serverHash && localHash && serverHash === localHash;
            const noLocalHash = !localHash && cached?.events?.length > 0;  // Ancien cache sans hash
            
            if (cached && cached.events && cached.events.length > 0) {
                if (hashMatch && !simulateStale) {
                    // Hash identique : le cache local est à jour (sauf simulation dev)
                    console.log('[ICS Service] Using local cache (hash match):', cached.events.length, 'events, hash:', localHash);
                    return {
                        events: cached.events,
                        diff: { added: [], updated: [], removed: [] },
                        meta: {
                            source: 'local-cache',
                            fromCache: true,
                            changed: 0,
                            ...(data.meta || {})
                        }
                    };
                }
                if (simulateStale && hashMatch) {
                    console.warn('[ICS Service] DEV_SIMULATE_EDT_CHANGE / NEXT_PUBLIC_SIMULATE_EDT_CHANGE → refetch forcé');
                } else if (noLocalHash) {
                    console.warn('[ICS Service] Cache local sans hash (migration) → refetch forcé');
                } else {
                    console.warn('[ICS Service] HASH MISMATCH! Local:', localHash, '| Server:', serverHash);
                    console.warn('[ICS Service] Cache local obsolète → refetch forcé');
                }
            } else {
                console.warn('[ICS Service] Pas de cache local valide');
            }
            
            // Pas de cache valide OU hash différent → Refaire une requête en forçant le parsing
            if (cached && cached.events && cached.events.length > 0) {
                onStaleCache?.();
            }
            console.log('[ICS Service] Forcing server to parse ICS (cache invalide ou obsolète)');
            const lang = typeof localStorage !== 'undefined' ? (localStorage.getItem('language') || 'fr') : 'fr';
            const forceRes = await fetch(`/api/fetch-ics?force=true&lang=${encodeURIComponent(lang)}`, {
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            });
            if (forceRes.ok) {
                const forceData = await forceRes.json();
                if (forceData && Array.isArray(forceData.events) && forceData.events.length > 0) {
                    console.log('[ICS Service] Forced fetch successful:', forceData.events.length, 'events');
                    return {
                        events: forceData.events,
                        diff: forceData.diff || { added: [], updated: [], removed: [] },
                        meta: forceData.meta || { source: 'forced-parse', fromCache: false }
                    };
                }
            }
            // Si ça échoue aussi, on continue avec le flux normal (qui va échouer)
            console.error('[ICS Service] Forced fetch also failed');
        }

        if (Array.isArray(data)) {
            events = data;
            meta.source = 'legacy-array';
        } else if (data && typeof data === 'object') {
            if (Array.isArray(data.events)) {
                events = data.events;
            } else if (data.unchanged !== true) {
                // Seulement lever une erreur si ce n'est pas une réponse "unchanged"
                events = [];
            }

            if (data.diff && typeof data.diff === 'object') {
                diff = {
                    added: Array.isArray(data.diff.added) ? data.diff.added : [],
                    updated: Array.isArray(data.diff.updated) ? data.diff.updated : [],
                    removed: Array.isArray(data.diff.removed) ? data.diff.removed : []
                };
            }

            if (data.meta && typeof data.meta === 'object') {
                meta = { ...meta, ...data.meta };
            }
        } else {
            throw new Error('Format de réponse invalide (attendu: object)');
        }

        console.log('[ICS Service] Events fetched:', events.length, 'changes:', (diff.added.length + diff.updated.length + diff.removed.length));
        
        return { events, diff, meta };
    } catch (err) {
        // Pour les erreurs réseau, ne pas logger comme une erreur critique
        // (sera géré en amont avec le cache)
        if (err.message === 'Failed to fetch' || err.message.includes('fetch failed')) {
            // Logger en mode debug seulement, pas comme erreur
            if (process.env.NODE_ENV === 'development') {
                console.warn('[ICS Service] Erreur réseau (mode hors ligne probable):', err.message);
            }
            throw new Error('Impossible de contacter le serveur. Vérifier la connexion réseau.');
        }
        
        // Pour les autres erreurs, logger normalement
        console.error('[ICS Service] Error in fetchEventsForWeb:', err.message);
        throw err;
    }
}

/**
 * Fonction principale : récupère les événements depuis l'API
 * @param {{ onStaleCache?: () => void }} [options]
 */
export async function fetchICSEvents(options = {}) {
    return await fetchEventsForWeb(options);
}

/**
 * Sauvegarde les événements dans le cache localStorage
 * TOUJOURS sauvegarder le timestamp et le hash quand on sauvegarde le cache
 * @param {Array} events - Les événements à sauvegarder
 * @param {Object} colors - Le mapping des couleurs par matière
 * @param {string|null} hash - Le hash ICS du serveur (pour détecter les caches obsolètes)
 */
export function saveEventsToCache(events, colors, hash = null) {
    if (typeof localStorage === 'undefined') return;
    if (!ACTIVE_CACHE) {
        localStorage.removeItem("events");
        localStorage.removeItem("subjectColors");
        localStorage.removeItem("lastUpdateTimestamp");
        localStorage.removeItem("cacheHash");
        return;
    }
    localStorage.setItem("events", JSON.stringify(events));
    localStorage.setItem("subjectColors", JSON.stringify(colors));
    // TOUJOURS sauvegarder le timestamp quand on sauvegarde le cache
    localStorage.setItem("lastUpdateTimestamp", new Date().toISOString());
    // Sauvegarder le hash pour pouvoir comparer avec le serveur plus tard
    if (hash) {
        localStorage.setItem("cacheHash", hash);
        console.log('[ICS Service] Cache sauvegardé avec hash:', hash);
    }
}

