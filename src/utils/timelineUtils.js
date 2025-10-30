/**
 * Utilitaires pour la gestion de la timeline
 */

/**
 * Calcule la plage horaire d'une journée basée sur les événements
 */
export function getDayTimeRange(dayEvents) {
    if (!dayEvents || dayEvents.length === 0) {
        return {startMinutes: 8 * 60 + 45, endMinutes: 18 * 60 + 45};
    }
    let minTime = Infinity, maxTime = -Infinity;
    dayEvents.forEach(ev => {
        const start = new Date(ev.start);
        const end = new Date(ev.end);
        minTime = Math.min(minTime, start.getHours() * 60 + start.getMinutes());
        maxTime = Math.max(maxTime, end.getHours() * 60 + end.getMinutes());
    });
    return {
        startMinutes: Math.floor(minTime / 15) * 15,
        endMinutes: Math.ceil(maxTime / 15) * 15
    };
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
export function getEventPosition(startTime, endTime, dayStart, dayEnd) {
    const s = new Date(startTime), e = new Date(endTime);
    const sMin = s.getHours() * 60 + s.getMinutes();
    const eMin = e.getHours() * 60 + e.getMinutes();
    const total = dayEnd - dayStart;
    const startOffset = sMin - dayStart;
    const dur = eMin - sMin;
    return {
        left: `${(startOffset / total * 100).toFixed(3)}%`,
        width: `${Math.max(3, (dur / total * 100)).toFixed(3)}%`
    };
}

/**
 * Calcule la position verticale d'un événement (mobile)
 * Note: Utilise calc() pour soustraire le padding du haut et du bas
 */
export function getEventPositionVertical(startTime, endTime, dayStart, dayEnd) {
    const s = new Date(startTime), e = new Date(endTime);
    const sMin = s.getHours() * 60 + s.getMinutes();
    const eMin = e.getHours() * 60 + e.getMinutes();
    const total = dayEnd - dayStart;
    const startOffset = sMin - dayStart;
    const dur = eMin - sMin;
    
    // Calcul de la position de base en pourcentage
    const topPercent = (startOffset / total * 100);
    const heightPercent = Math.max(5, (dur / total * 100));
    
    // Utiliser calc() pour soustraire le padding-top et padding-bottom réduit
    // padding-top: 0.4rem, padding-bottom: 0.15rem = 0.55rem total
    return {
        top: `${topPercent.toFixed(3)}%`,
        height: `calc(${heightPercent.toFixed(3)}% - 0.55rem)`
    };
}
