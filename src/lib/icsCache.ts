/**
 * Cache in-memory pour l'API fetch-ics
 * 
 * Comme Node.js garde les modules en mémoire entre les requêtes,
 * ce cache est partagé entre toutes les invocations de l'API.
 * 
 * Sur Vercel, chaque instance serverless a son propre cache,
 * mais c'est suffisant pour réduire drastiquement les requêtes.
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache global (partagé entre toutes les requêtes de cette instance)
const cache = {
    // Cache du fichier ICS parsé
    parsedICS: {
        hash: null,
        events: null,
        timestamp: 0
    },
    
    // Cache de la latest event map depuis Supabase
    latestEventMap: {
        data: null,
        timestamp: 0
    },
    
    // Cache de l'historique ICS
    icsHistory: {
        data: null,
        timestamp: 0
    }
};

/**
 * Vérifie si un cache est valide (non expiré)
 */
function isCacheValid(timestamp) {
    if (!timestamp) return false;
    const age = Date.now() - timestamp;
    return age < CACHE_TTL;
}

/**
 * Récupère le cache du fichier ICS parsé
 * @param {string} icsHash - Hash SHA256 du fichier ICS
 * @returns {Array|null} - Events parsés ou null si cache invalide
 */
export function getCachedParsedICS(icsHash) {
    if (cache.parsedICS.hash === icsHash && isCacheValid(cache.parsedICS.timestamp)) {
        console.log('[Cache] HIT - Parsed ICS (hash:', icsHash.substring(0, 8) + ')');
        return cache.parsedICS.events;
    }
    console.log('[Cache] MISS - Parsed ICS');
    return null;
}

/**
 * Met en cache le fichier ICS parsé
 * @param {string} icsHash - Hash SHA256 du fichier ICS
 * @param {Array} events - Events parsés
 */
export function setCachedParsedICS(icsHash, events) {
    cache.parsedICS = {
        hash: icsHash,
        events: events,
        timestamp: Date.now()
    };
    console.log('[Cache] SET - Parsed ICS (', events.length, 'events, hash:', icsHash.substring(0, 8) + ')');
}

/**
 * Récupère le cache de la latest event map
 * @returns {Map|null} - Map des events ou null si cache invalide
 */
export function getCachedLatestEventMap() {
    if (isCacheValid(cache.latestEventMap.timestamp)) {
        console.log('[Cache] HIT - Latest Event Map (', cache.latestEventMap.data?.size || 0, 'events)');
        return cache.latestEventMap.data;
    }
    console.log('[Cache] MISS - Latest Event Map');
    return null;
}

/**
 * Met en cache la latest event map
 * @param {Map} eventMap - Map des events
 */
export function setCachedLatestEventMap(eventMap) {
    cache.latestEventMap = {
        data: eventMap,
        timestamp: Date.now()
    };
    console.log('[Cache] SET - Latest Event Map (', eventMap.size, 'events)');
}

/**
 * Récupère le cache de l'historique ICS
 * @returns {Object|null} - Historique ou null si cache invalide
 */
export function getCachedIcsHistory() {
    if (isCacheValid(cache.icsHistory.timestamp)) {
        console.log('[Cache] HIT - ICS History');
        return cache.icsHistory.data;
    }
    console.log('[Cache] MISS - ICS History');
    return null;
}

/**
 * Met en cache l'historique ICS
 * @param {Object} history - Historique ICS
 */
export function setCachedIcsHistory(history) {
    cache.icsHistory = {
        data: history,
        timestamp: Date.now()
    };
    console.log('[Cache] SET - ICS History');
}

/**
 * Invalide tout le cache (utile pour le debugging ou le force refresh)
 */
export function invalidateAllCache() {
    cache.parsedICS = { hash: null, events: null, timestamp: 0 };
    cache.latestEventMap = { data: null, timestamp: 0 };
    cache.icsHistory = { data: null, timestamp: 0 };
    console.log('[Cache] INVALIDATED - All caches cleared');
}

/**
 * Récupère les statistiques du cache
 */
export function getCacheStats() {
    return {
        parsedICS: {
            valid: isCacheValid(cache.parsedICS.timestamp),
            hash: cache.parsedICS.hash?.substring(0, 8) || null,
            eventsCount: cache.parsedICS.events?.length || 0,
            age: cache.parsedICS.timestamp ? Date.now() - cache.parsedICS.timestamp : null
        },
        latestEventMap: {
            valid: isCacheValid(cache.latestEventMap.timestamp),
            size: cache.latestEventMap.data?.size || 0,
            age: cache.latestEventMap.timestamp ? Date.now() - cache.latestEventMap.timestamp : null
        },
        icsHistory: {
            valid: isCacheValid(cache.icsHistory.timestamp),
            age: cache.icsHistory.timestamp ? Date.now() - cache.icsHistory.timestamp : null
        },
        ttl: CACHE_TTL
    };
}
