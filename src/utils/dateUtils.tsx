// @ts-nocheck
/**
 * Utilitaires pour la gestion des dates
 */

/**
 * Obtient la locale selon la langue
 * @param {string} language - Langue ('fr' ou 'en')
 * @returns {string} Locale ('fr-FR' ou 'en-US')
 */
export function getLocale(language = 'fr') {
    return language === 'en' ? 'en-US' : 'fr-FR';
}

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
 * @param {Array} data - Liste des événements
 * @param {string} language - Langue ('fr' ou 'en', par défaut 'fr')
 */
export function extractAvailableWeeks(data, language = 'fr') {
    const locale = getLocale(language);
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
                label: `${monday.toLocaleDateString(locale, {
                    day: "numeric", month: "short"
                })} - ${sunday.toLocaleDateString(locale, {day: "numeric", month: "short"})}`
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

/**
 * Obtient la plage de dates de l'année scolaire (septembre à août)
 * @param {Date} referenceDate - Date de référence (par défaut: aujourd'hui)
 * @returns {{start: Date, end: Date}} Objet avec les dates de début et fin de l'année scolaire
 */
export function getSchoolYearRange(referenceDate = new Date()) {
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth(); // 0-11 (janvier = 0)
    
    let startYear, endYear;
    
    // Si on est entre janvier et août, l'année scolaire a commencé en septembre de l'année précédente
    if (currentMonth < 8) { // Mois 0-7 (janvier à août)
        startYear = currentYear - 1;
        endYear = currentYear;
    } else { // Mois 8-11 (septembre à décembre)
        startYear = currentYear;
        endYear = currentYear + 1;
    }
    
    // Début: 1er septembre de l'année de début
    const start = new Date(startYear, 8, 1); // Mois 8 = septembre
    start.setHours(0, 0, 0, 0);
    
    // Fin: 31 août de l'année suivante
    const end = new Date(endYear, 7, 31); // Mois 7 = août
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
}

/**
 * Obtient l'année scolaire au format "2024-2025"
 * @param {Date} referenceDate - Date de référence (par défaut: aujourd'hui)
 * @returns {string} Année scolaire au format "YYYY-YYYY"
 */
export function getSchoolYearLabel(referenceDate = new Date()) {
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth(); // 0-11 (janvier = 0)
    
    let startYear, endYear;
    
    // Si on est entre janvier et août, l'année scolaire a commencé en septembre de l'année précédente
    if (currentMonth < 8) { // Mois 0-7 (janvier à août)
        startYear = currentYear - 1;
        endYear = currentYear;
    } else { // Mois 8-11 (septembre à décembre)
        startYear = currentYear;
        endYear = currentYear + 1;
    }
    
    return `${startYear}-${endYear}`;
}
