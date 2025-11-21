import {getEventTitle} from "@/utils/eventUtils";

// Fonction pour générer l'event_key (identique à celle dans fetch-ics/route.js)
export function generateEventKey(ev) {
    const s = new Date(ev.start).toISOString();
    const sum = (ev.summary || '').trim();
    const loc = (ev.location || '').trim();
    return `${s}|${sum}|${loc}`;
}

export function formatDurationHM(start, end) {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    const ms = e.getTime() - s.getTime();
    if (ms <= 0) return null;
    const totalMinutes = Math.round(ms / (1000 * 60));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m === 0) return `${h}h`;
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
    return `${m}min`;
}

// Calculer les heures totales et effectuées pour une matière donnée
export function getSubjectHoursStats(subjectName, allEvents, referenceEvent = null) {
    if (!subjectName || subjectName === ':') return null;

    const now = new Date();
    const referenceDateInput = referenceEvent
        ? (referenceEvent.end_time || referenceEvent.end || referenceEvent.start || null)
        : null;
    const referenceDate = (() => {
        if (!referenceDateInput) return now;
        const parsed = new Date(referenceDateInput);
        return isNaN(parsed.getTime()) ? now : parsed;
    })();
    const referenceTimestamp = referenceDate.getTime();
    const msPerHour = 1000 * 60 * 60;

    let totalHours = 0;
    let completedHours = 0;

    allEvents.forEach(event => {
        const {matiere} = getEventTitle(event);
        if (matiere !== subjectName) return;

        const start = new Date(event.start);
        const endDate = event.end_time || event.end;
        if (!endDate) return;

        const end = new Date(endDate);

        // Vérifier que les dates sont valides
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

        const durationMs = end.getTime() - start.getTime();
        if (durationMs <= 0) return;

        const durationHours = durationMs / msPerHour;
        totalHours += durationHours;

        const startMs = start.getTime();
        const endMs = end.getTime();

        if (endMs <= referenceTimestamp) {
            completedHours += durationHours;
            return;
        }

        if (referenceTimestamp > startMs && referenceTimestamp < endMs) {
            const partialMs = referenceTimestamp - startMs;
            if (partialMs > 0) {
                completedHours += partialMs / msPerHour;
            }
        }
    });

    const remainingHours = Math.max(totalHours - completedHours, 0);

    return {
        total: totalHours,
        completed: completedHours,
        remaining: remainingHours,
        percentage: totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0
    };
}

// Formater les heures décimales en format lisible
export function formatHoursDecimal(decimalHours) {
    if (decimalHours == null || isNaN(decimalHours) || decimalHours === 0) return "0h";
    const totalMinutes = Math.round(decimalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m === 0) return `${h}h`;
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
    return `${m}min`;
}

// Extraire l'identifiant de la matière depuis le summary (ex: USSI0D)
export function extractCourseIdFromSummary(summary) {
    if (!summary || typeof summary !== 'string') return null;
    // Tente: SUMMARY:USSI0D : ... ou USSI0D : ...
    const m = summary.match(/^\s*(?:SUMMARY:)?\s*([A-Z]{3,}[A-Z0-9]*)\s*:/i);
    return m ? m[1].toUpperCase() : null;
}

// Détecter le type de cours (Cours / TD / TP / ED) depuis summary/description
export function extractCourseType(ev) {
    const text = `${ev?.summary || ''} ${ev?.description || ''}`.toLowerCase();
    if (!text.trim()) return null;
    if (/(\bexercices?\s*dirigés?\b|\bed\b)/i.test(text)) return 'Exercices dirigés';
    if (/\btd\b/i.test(text)) return 'Travaux dirigés';
    if (/\btp\b/i.test(text)) return 'Travaux pratiques';
    if (/\bcours\b/i.test(text)) return 'Cours';
    return null;
}

// Détecter le site CNAM (Conté ou Saint-Martin) depuis la localisation
export function getCnamSite(location) {
    if (!location || typeof location !== 'string') return null;

    // Extraire le numéro de rue depuis la localisation
    // Format attendu: "Salle : 30.2.12" ou "30.2.12" ou "Salle 30-2-12"
    const cleaned = location.replace(/^Salle\s*:\s*/i, '').trim();

    // Extraire le premier nombre (numéro de rue)
    const match = cleaned.match(/^(\d+)(bis)?[\.\-\s]/i);
    if (!match) return null;

    const streetNumber = match[1];
    const isBis = !!match[2];

    // Site Conté : 30, 31, 33, 34, 35, 37, 39
    const conteNumbers = ['30', '31', '33', '34', '35', '37', '39'];

    // Site Saint-Martin : 1, 2, 3, 4, 5, 6, 7, 9, 9bis, 10, 11, 12, 13, 14, 15, 16, 17, 21, 23, 27
    const saintMartinNumbers = ['1', '2', '3', '4', '5', '6', '7', '9', '10', '11', '12', '13', '14', '15', '16', '17', '21', '23', '27'];

    if (conteNumbers.includes(streetNumber)) {
        return {site: 'Conté', color: '#10b981'}; // Vert émeraude
    }

    if (saintMartinNumbers.includes(streetNumber) || (streetNumber === '9' && isBis)) {
        return {site: 'St-Martin', color: '#f59e0b'}; // Orange ambre
    }

    return null;
}

export function isVisioLocation(location) {
    if (!location || typeof location !== 'string') return false;
    return /visio/i.test(location);
}

export function parseLocationMeta(location) {
    const raw = location || '';
    const cleaned = raw.replace(/^Salle\s*:\s*/i, '').trim();
    const visio = isVisioLocation(raw);
    const siteInfo = !visio && raw ? getCnamSite(raw) : null;
    const hasPhysical = Boolean(!visio && cleaned);
    return {
        display: visio
            ? 'Cours en visio'
            : (cleaned || (raw ? raw.trim() : '?')),
        isVisio: visio,
        siteInfo,
        hasPhysical
    };
}

// Retourne l'année scolaire sous forme [yyyyStart, yyyyEnd] en se basant sur la date du cours
// Règle: année scolaire commence en septembre (mois >= 8)
export function getAcademicYearParts(dateLike) {
    const d = new Date(dateLike || Date.now());
    if (isNaN(d.getTime())) {
        const now = new Date();
        const y = now.getFullYear();
        const start = now.getMonth() >= 8 ? y : y - 1;
        return [start, start + 1];
    }
    const y = d.getFullYear();
    const start = d.getMonth() >= 8 ? y : y - 1;
    return [start, start + 1];
}







