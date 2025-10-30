/**
 * Service pour récupérer et parser les fichiers ICS
 */

// URL de l'ICS EICNAM (utilise la variable d'environnement si disponible, sinon fallback)
// Next.js remplace process.env.NEXT_PUBLIC_* au moment du build
const ICS_URL = process.env.NEXT_PUBLIC_ICS_URL || 
    'https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics';

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
 * Récupère les événements ICS pour le mobile (avec CapacitorHttp)
 */
async function fetchEventsForMobile(CapacitorHttp) {
    console.log('[ICS Service] Fetching from mobile with CapacitorHttp');
    
    const response = await CapacitorHttp.get({
        url: ICS_URL,
        headers: {
            'Accept': 'text/calendar,text/plain,*/*'
        }
    });
    
    if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    const icsContent = response.data;
    console.log('[ICS Service] ICS downloaded, length:', icsContent.length);
    
    const events = parseICSContent(icsContent);
    console.log('[ICS Service] Events parsed:', events.length);
    
    return events;
}

/**
 * Récupère les événements ICS pour le web (via API route)
 */
async function fetchEventsForWeb() {
    console.log('[ICS Service] Fetching from web API route');
    
    try {
        const res = await fetch("/api/fetch-ics", {
            headers: {
                'Accept': 'application/json',
            },
            cache: 'no-cache' // Éviter les problèmes de cache
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMessage = errorData.error || `HTTP ${res.status}: ${res.statusText}`;
            throw new Error(errorMessage);
        }
        
        const data = await res.json();
        
        // Vérifier si c'est un objet d'erreur
        if (data.error) {
            throw new Error(data.error + (data.details ? ` - ${data.details}` : ''));
        }
        
        // Vérifier que c'est bien un tableau d'événements
        if (!Array.isArray(data)) {
            throw new Error('Format de réponse invalide (attendu: array)');
        }
        
        console.log('[ICS Service] Events fetched:', data.length);
        
        return data;
    } catch (err) {
        console.error('[ICS Service] Error in fetchEventsForWeb:', err.message);
        
        // Améliorer le message d'erreur pour les erreurs réseau
        if (err.message === 'Failed to fetch') {
            throw new Error('Impossible de contacter le serveur. Vérifier la connexion réseau.');
        }
        
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
    localStorage.setItem("events", JSON.stringify(events));
    localStorage.setItem("subjectColors", JSON.stringify(colors));
}
