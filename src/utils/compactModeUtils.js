/**
 * Calcule les valeurs de style en fonction du mode de compacité
 * @param {number} compactMode - Valeur de 0 (compact) à 10 (normal)
 * @returns {Object} Objet contenant toutes les valeurs calculées
 */
export function getCompactModeValues(compactMode) {
    // Interpolation linéaire entre Compact (0) et Normal (10)
    const min = {
        dayHeightFactor: 0.60,
        cardTopPadding: 30,
        dayHeaderMargin: 0.3,
        dayHeaderPadding: 0.4,
        eventsContainerPadding: 0.4
    };
    
    const max = {
        dayHeightFactor: 0.70,
        cardTopPadding: 43,
        dayHeaderMargin: 0.4,
        dayHeaderPadding: 0.5,
        eventsContainerPadding: 0.7
    };
    
    // Normaliser compactMode entre 0 et 1
    const t = compactMode / 7.9;
    
    return {
        dayHeightFactor: min.dayHeightFactor + (max.dayHeightFactor - min.dayHeightFactor) * t,
        cardTopPadding: Math.round(min.cardTopPadding + (max.cardTopPadding - min.cardTopPadding) * t),
        dayHeaderMargin: min.dayHeaderMargin + (max.dayHeaderMargin - min.dayHeaderMargin) * t,
        dayHeaderPadding: min.dayHeaderPadding + (max.dayHeaderPadding - min.dayHeaderPadding) * t,
        eventsContainerPadding: min.eventsContainerPadding + (max.eventsContainerPadding - min.eventsContainerPadding) * t
    };
}

