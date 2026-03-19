// @ts-nocheck
/**
 * Utilitaires pour la gestion de la timeline
 */

// --- CONFIGURATION ---

// Espace total à retirer pour séparer les cours (ex: 2px)
const VISUAL_GAP = '2px';

// Espace à ajouter au début pour centrer le bloc (la moitié du gap, ex: 1px)
// Cela permet de décoller le cours de 1px du haut et 1px du bas
const HALF_GAP = '1px';

// Correction pour le padding vertical (mobile)
// padding-top (0.4rem) + padding-bottom (0.15rem) = 0.55rem
const VERTICAL_PADDING_CORRECTION = '0.55rem';


/**
 * Calcule la plage horaire d'une journée basée sur les événements
 * Affiche toujours au minimum de 9h à 18h, mais s'étend si des cours sont en dehors de cette plage
 */
export function getDayTimeRange(dayEvents) {
    const MIN_START = 9 * 60; // 9h00
    const MIN_END = 18 * 60; // 18h00

    if (!dayEvents || dayEvents.length === 0) {
        return {startMinutes: MIN_START, endMinutes: MIN_END};
    }

    let minTime = Infinity, maxTime = -Infinity;
    dayEvents.forEach(ev => {
        const start = new Date(ev.start);
        const end = new Date(ev.end);
        minTime = Math.min(minTime, start.getHours() * 60 + start.getMinutes());
        maxTime = Math.max(maxTime, end.getHours() * 60 + end.getMinutes());
    });

    // Arrondir aux 15 minutes
    let startMinutes = Math.floor(minTime / 15) * 15;
    let endMinutes = Math.ceil(maxTime / 15) * 15;

    // Garantir un minimum de 9h à 18h, mais s'étendre si nécessaire
    startMinutes = Math.min(startMinutes, MIN_START);
    endMinutes = Math.max(endMinutes, MIN_END);

    return {startMinutes, endMinutes};
}

/**
 * Génère les marqueurs horaires pour la timeline
 */
export function generateTimeMarkers(startMinutes, endMinutes) {
    const markers = [];
    const roundedStart = Math.floor(startMinutes / 30) * 30;
    const roundedEnd = Math.ceil(endMinutes / 30) * 30;
    for (let totalMin = roundedStart; totalMin <= roundedEnd; totalMin += 30) {
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        markers.push({
            hour: h,
            minute: m,
            totalMinutes: totalMin,
            label: m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`,
            isHour: m === 0
        });
    }
    return markers;
}

/**
 * Calcule la position de l'heure actuelle sur la timeline
 */
export function getCurrentTimePosition(dayDate, startMinutes, endMinutes) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes < startMinutes || nowMinutes > endMinutes) return null;
    const total = endMinutes - startMinutes;
    const current = nowMinutes - startMinutes;
    return (current / total) * 100;
}

/**
 * Calcule la position horizontale d'un événement (desktop)
 */
export function getEventPosition(startTime, endTime, dayStart, dayEnd, previousEventEnd = null, nextEventStart = null, hide15MinSpacing = false) {
    const s = new Date(startTime), e = new Date(endTime);
    const sMin = s.getHours() * 60 + s.getMinutes();
    const eMin = e.getHours() * 60 + e.getMinutes();
    const total = dayEnd - dayStart;

    let adjustedStartOffset = sMin - dayStart;
    let hasGapFromPrev = false;

    // Logique de fusion des espaces de 15min (précédent)
    if (hide15MinSpacing && previousEventEnd !== null) {
        const prevEnd = new Date(previousEventEnd);
        const prevEndMin = prevEnd.getHours() * 60 + prevEnd.getMinutes();
        const gapMinutes = sMin - prevEndMin;

        if (gapMinutes === 15) {
            adjustedStartOffset = prevEndMin - dayStart + 7.5;
            hasGapFromPrev = true;
        }
    }

    let dur = eMin - sMin;

    if (hasGapFromPrev) {
        dur += 7.5;
    }

    // Logique de fusion des espaces de 15min (suivant)
    if (hide15MinSpacing && nextEventStart !== null) {
        const nextStart = new Date(nextEventStart);
        const nextStartMin = nextStart.getHours() * 60 + nextStart.getMinutes();
        const gapToNext = nextStartMin - eMin;

        if (gapToNext === 15) {
            dur += 7.5;
        }
    }

    const leftPercent = (adjustedStartOffset / total * 100).toFixed(3);
    const widthPercent = Math.max(3, (dur / total * 100)).toFixed(3);

    // LOGIQUE CENTRAGE :
    // Si on doit réduire la taille (car il y a un suivant), on décale aussi le début.
    if (nextEventStart !== null) {
        return {
            // On décale le début de 1px vers la droite
            left: `calc(${leftPercent}% + ${HALF_GAP})`,
            // On réduit la largeur de 2px (donc -1px à gauche et -1px à droite au final)
            width: `calc(${widthPercent}% - ${VISUAL_GAP})`
        };
    }

    // Sinon (dernier élément), pas de décalage ni réduction
    return {
        left: `${leftPercent}%`,
        width: `${widthPercent}%`
    };
}

/**
 * Calcule la position verticale d'un événement (mobile)
 */
export function getEventPositionVertical(startTime, endTime, dayStart, dayEnd, previousEventEnd = null, nextEventStart = null, hide15MinSpacing = false) {
    const s = new Date(startTime), e = new Date(endTime);
    const sMin = s.getHours() * 60 + s.getMinutes();
    const eMin = e.getHours() * 60 + e.getMinutes();
    const total = dayEnd - dayStart;

    let adjustedStartOffset = sMin - dayStart;
    let hasGapFromPrev = false;

    if (hide15MinSpacing && previousEventEnd !== null) {
        const prevEnd = new Date(previousEventEnd);
        const prevEndMin = prevEnd.getHours() * 60 + prevEnd.getMinutes();
        const gapMinutes = sMin - prevEndMin;

        if (gapMinutes === 15) {
            adjustedStartOffset = prevEndMin - dayStart + 7.5;
            hasGapFromPrev = true;
        }
    }

    let dur = eMin - sMin;

    if (hasGapFromPrev) {
        dur += 7.5;
    }

    if (hide15MinSpacing && nextEventStart !== null) {
        const nextStart = new Date(nextEventStart);
        const nextStartMin = nextStart.getHours() * 60 + nextStart.getMinutes();
        const gapToNext = nextStartMin - eMin;

        if (gapToNext === 15) {
            dur += 7.5;
        }
    }

    const topPercent = (adjustedStartOffset / total * 100);
    const heightPercent = Math.max(5, (dur / total * 100));

    // LOGIQUE CENTRAGE MOBILE :
    if (nextEventStart !== null) {
        return {
            // On descend le début de 1px
            top: `calc(${topPercent.toFixed(3)}% + ${HALF_GAP})`,
            // On réduit la hauteur de 2px (+ la correction de padding)
            // Résultat visuel : 1px de vide en haut, 1px de vide en bas
            height: `calc(${heightPercent.toFixed(3)}% - ${VERTICAL_PADDING_CORRECTION} - ${VISUAL_GAP})`
        };
    }

    // Sinon (dernier élément)
    return {
        top: `${topPercent.toFixed(3)}%`,
        // Juste la correction de padding, pas d'espace vide en bas
        height: `calc(${heightPercent.toFixed(3)}% - ${VERTICAL_PADDING_CORRECTION})`
    };
}
