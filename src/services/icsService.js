/**
 * Service pour récupérer et parser les fichiers ICS
 */

// URL de ton ICS EICNAM
const ICS_URL = 'https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics';

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
    
    const res = await fetch("/api/fetch-ics");
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const events = await res.json();
    console.log('[ICS Service] Events fetched:', events.length);
    
    return events;
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
