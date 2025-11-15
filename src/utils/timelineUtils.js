/**
 * Utilitaires pour la gestion de la timeline
 */

/**
 * Calcule la plage horaire d'une journée basée sur les événements
 * Affiche toujours au minimum de 9h à 18h, mais s'étend si des cours sont en dehors de cette plage
 */
export function getDayTimeRange(dayEvents) {
    // Plage horaire minimale : 9h à 18h (en minutes depuis minuit)
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
    // Si hide15MinSpacing est activé et qu'il y a un événement précédent
    let adjustedStartOffset = sMin - dayStart;
    let hasGapFromPrev = false;
    if (hide15MinSpacing && previousEventEnd !== null) {
        const prevEnd = new Date(previousEventEnd);
        const prevEndMin = prevEnd.getHours() * 60 + prevEnd.getMinutes();
        const gapMinutes = sMin - prevEndMin;
        
        // Si l'écart est exactement de 15 minutes, partager équitablement : chaque cours prend 7.5 minutes
        if (gapMinutes === 15) {
            // Le cours suivant commence 7.5 minutes après la fin réelle du cours précédent
            adjustedStartOffset = prevEndMin - dayStart + 7.5;
            hasGapFromPrev = true;
        }
    }
    
    // Calculer la durée de base
    let dur = eMin - sMin;
    
    // Si le cours commence plus tôt (ajustement du début), augmenter la durée pour compenser
    if (hasGapFromPrev) {
        dur += 7.5; // Compenser le début plus tôt en augmentant la durée
    }
    
    // Si hide15MinSpacing est activé et qu'il y a un événement suivant avec un écart de 15 minutes
    // Le cours actuel s'étend de 7.5 minutes (la moitié des 15 minutes)
    if (hide15MinSpacing && nextEventStart !== null) {
        const nextStart = new Date(nextEventStart);
        const nextStartMin = nextStart.getHours() * 60 + nextStart.getMinutes();
        const gapToNext = nextStartMin - eMin;
        
        // Si l'écart avec le cours suivant est exactement de 15 minutes, augmenter la largeur de 7.5 minutes
        if (gapToNext === 15) {
            dur += 7.5; // Ajouter 7.5 minutes (la moitié des 15 minutes)
        }
    }
    
    // Si hide15MinSpacing est activé et qu'il n'y a PAS d'événement suivant mais qu'il y a un écart de 15 minutes avec le précédent
    // Le dernier cours ne doit PAS ajouter de durée supplémentaire car on a déjà compensé le début plus tôt
    // Le startOffset a déjà été ajusté dans le premier bloc, et la durée a déjà été augmentée pour compenser le début plus tôt
    // Donc pas besoin d'ajouter encore de la durée, sinon le cours dépasserait son heure de fin réelle
    return {
        left: `${(adjustedStartOffset / total * 100).toFixed(3)}%`,
        width: `${Math.max(3, (dur / total * 100)).toFixed(3)}%`
    };
}

/**
 * Calcule la position verticale d'un événement (mobile)
 * Note: Utilise calc() pour soustraire le padding du haut et du bas
 */
export function getEventPositionVertical(startTime, endTime, dayStart, dayEnd, previousEventEnd = null, nextEventStart = null, hide15MinSpacing = false) {
    const s = new Date(startTime), e = new Date(endTime);
    const sMin = s.getHours() * 60 + s.getMinutes();
    const eMin = e.getHours() * 60 + e.getMinutes();
    const total = dayEnd - dayStart;
    
    // Si hide15MinSpacing est activé et qu'il y a un événement précédent
    let adjustedStartOffset = sMin - dayStart;
    let hasGapFromPrev = false;
    if (hide15MinSpacing && previousEventEnd !== null) {
        const prevEnd = new Date(previousEventEnd);
        const prevEndMin = prevEnd.getHours() * 60 + prevEnd.getMinutes();
        const gapMinutes = sMin - prevEndMin;
        
        // Si l'écart est exactement de 15 minutes, partager équitablement : chaque cours prend 7.5 minutes
        if (gapMinutes === 15) {
            // Le cours suivant commence 7.5 minutes après la fin réelle du cours précédent
            adjustedStartOffset = prevEndMin - dayStart + 7.5;
            hasGapFromPrev = true;
        }
    }
    
    // Calculer la durée de base
    let dur = eMin - sMin;
    
    // Si le cours commence plus tôt (ajustement du début), augmenter la durée pour compenser
    if (hasGapFromPrev) {
        dur += 7.5; // Compenser le début plus tôt en augmentant la durée
    }
    
    // Si hide15MinSpacing est activé et qu'il y a un événement suivant avec un écart de 15 minutes
    // Le cours actuel s'étend de 7.5 minutes (la moitié des 15 minutes)
    if (hide15MinSpacing && nextEventStart !== null) {
        const nextStart = new Date(nextEventStart);
        const nextStartMin = nextStart.getHours() * 60 + nextStart.getMinutes();
        const gapToNext = nextStartMin - eMin;
        
        // Si l'écart avec le cours suivant est exactement de 15 minutes, augmenter la hauteur de 7.5 minutes
        if (gapToNext === 15) {
            dur += 7.5; // Ajouter 7.5 minutes (la moitié des 15 minutes)
        }
    }
    
    // Si hide15MinSpacing est activé et qu'il n'y a PAS d'événement suivant mais qu'il y a un écart de 15 minutes avec le précédent
    // Le dernier cours ne doit PAS ajouter de durée supplémentaire car on a déjà compensé le début plus tôt
    // Le startOffset a déjà été ajusté dans le premier bloc, et la durée a déjà été augmentée pour compenser le début plus tôt
    // Donc pas besoin d'ajouter encore de la durée, sinon le cours dépasserait son heure de fin réelle
    
    // Calcul de la position de base en pourcentage
    const topPercent = (adjustedStartOffset / total * 100);
    const heightPercent = Math.max(5, (dur / total * 100));
    
    // Utiliser calc() pour soustraire le padding-top et padding-bottom réduit
    // padding-top: 0.4rem, padding-bottom: 0.15rem = 0.55rem total
    return {
        top: `${topPercent.toFixed(3)}%`,
        height: `calc(${heightPercent.toFixed(3)}% - 0.55rem)`
    };
}
