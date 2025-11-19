/**
 * Service pour récupérer et parser les fichiers ICS
 */

// URL de l'ICS EICNAM (utilise la variable d'environnement si disponible, sinon fallback)
// Next.js remplace process.env.NEXT_PUBLIC_* au moment du build
const ICS_URL = process.env.NEXT_PUBLIC_ICS_URL;
const activeCacheEnv = process.env.NEXT_PUBLIC_ACTIVE_CACHE ?? process.env.ACTIVE_CACHE ?? 'true';
const ACTIVE_CACHE = String(activeCacheEnv).toLowerCase() !== 'false';

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
 * Récupère les événements ICS pour le mobile (via API route avec CapacitorHttp)
 * Utilise l'API route pour bénéficier du fallback Supabase
 */
async function fetchEventsForMobile(CapacitorHttp) {
    console.log('[ICS Service] Fetching from mobile via API route');
    
    // Utiliser l'API route pour avoir le fallback Supabase
    const apiUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/api/fetch-ics`
        : '/api/fetch-ics';
    
    const response = await CapacitorHttp.get({
        url: apiUrl,
        headers: {
            'Accept': 'application/json'
        }
    });
    
    if (response.status !== 200) {
        const errorData = response.data && typeof response.data === 'object' ? response.data : {};
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        const error = new Error(errorMessage);
        if (errorData.details) error.details = errorData.details;
        if (errorData.icsError) error.icsError = errorData.icsError;
        if (errorData.supabaseError) error.supabaseError = errorData.supabaseError;
        throw error;
    }
    
    const data = response.data;
    
    if (data?.error) {
        const error = new Error(data.error + (data.details ? ` - ${data.details}` : ''));
        if (data.details) error.details = data.details;
        if (data.icsError) error.icsError = data.icsError;
        if (data.supabaseError) error.supabaseError = data.supabaseError;
        throw error;
    }
    
    let events = [];
    let diff = { added: [], updated: [], removed: [] };
    let meta = { source: 'mobile-api', fromCache: false, changed: null };
    
    if (Array.isArray(data)) {
        events = data;
        meta.source = 'legacy-array';
    } else if (data && typeof data === 'object') {
        if (Array.isArray(data.events)) {
            events = data.events;
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
    }
    
    console.log('[ICS Service] Events fetched from API:', events.length, 'changes:', (diff.added.length + diff.updated.length + diff.removed.length));
    
    return { events, diff, meta };
}

/**
 * Récupère les événements ICS pour le web (via API route)
 */
async function fetchEventsForWeb() {
    console.log('[ICS Service] Fetching from web API route');
    
    try {
        const res = await fetch('/api/fetch-ics', {
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

        if (Array.isArray(data)) {
            events = data;
            meta.source = 'legacy-array';
        } else if (data && typeof data === 'object') {
            if (Array.isArray(data.events)) {
                events = data.events;
            } else {
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
 * Fonction principale : récupère les événements selon la plateforme
 */
export async function fetchICSEvents(isNative, CapacitorHttp) {
    if (isNative && CapacitorHttp) {
        return await fetchEventsForMobile(CapacitorHttp);
    } else {
        return await fetchEventsForWeb();
    }
}

/**
 * Charge les événements depuis le cache localStorage
 */
export function loadEventsFromCache() {
    if (!ACTIVE_CACHE || typeof localStorage === 'undefined') return null;
    const saved = localStorage.getItem("events");
    const savedColors = localStorage.getItem("subjectColors");
    
    if (saved && savedColors) {
        return {
            events: JSON.parse(saved),
            colors: JSON.parse(savedColors)
        };
    }
    
    return null;
}

/**
 * Sauvegarde les événements dans le cache localStorage
 */
export function saveEventsToCache(events, colors) {
    if (typeof localStorage === 'undefined') return;
    if (!ACTIVE_CACHE) {
        localStorage.removeItem("events");
        localStorage.removeItem("subjectColors");
        localStorage.removeItem("lastUpdateTimestamp");
        return;
    }
    localStorage.setItem("events", JSON.stringify(events));
    localStorage.setItem("subjectColors", JSON.stringify(colors));
    // Sauvegarder le timestamp de la dernière mise à jour
    localStorage.setItem("lastUpdateTimestamp", new Date().toISOString());
}
