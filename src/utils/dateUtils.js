/**
 * Utilitaires pour la gestion des dates
 */

/**
 * Obtient le lundi d'une date donnée
 */
export function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - ((day + 6) % 7);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

/**
 * Obtient le lundi de la semaine actuelle
 */
export function getCurrentWeek() {
    return getMonday(new Date());
}

/**
 * Vérifie si une date est aujourd'hui
 */
export function isToday(dayDate) {
    const today = new Date();
    return dayDate.toDateString() === today.toDateString();
}

/**
 * Extrait les semaines disponibles à partir des événements
 */
export function extractAvailableWeeks(data) {
    const weeksMap = new Map();
    data.forEach(event => {
        const eventDate = new Date(event.start);
        const monday = getMonday(eventDate);
        const key = monday.toISOString();
        if (!weeksMap.has(key)) {
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            weeksMap.set(key, {
                monday,
                sunday,
                label: `${monday.toLocaleDateString("fr-FR", {
                    day: "numeric", month: "short"
                })} - ${sunday.toLocaleDateString("fr-FR", {day: "numeric", month: "short"})}`
            });
        }
    });
    return Array.from(weeksMap.values()).sort((a, b) => a.monday - b.monday);
}

/**
 * Sélectionne la meilleure semaine à afficher :
 * 1. La semaine actuelle si elle existe
 * 2. Sinon, la prochaine semaine future avec des cours
 * 3. Sinon, la première semaine disponible
 */
export function selectBestWeek(weeks) {
    if (!weeks || weeks.length === 0) return null;
    
    const currentWeek = getCurrentWeek();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 1. Chercher la semaine actuelle
    let weekToSelect = weeks.find(w => w.monday.getTime() === currentWeek.getTime());
    
    // 2. Si pas trouvée, chercher la prochaine semaine future
    if (!weekToSelect) {
        weekToSelect = weeks.find(w => w.monday.getTime() >= today.getTime());
    }
    
    // 3. Si aucune semaine future, prendre la première disponible
    if (!weekToSelect) {
        weekToSelect = weeks[0];
    }
    
    return weekToSelect;
}