/**
 * Utilitaires pour la gestion des événements
 */

/**
 * Crée un mapping des couleurs par matière
 */
export function createSubjectColorMapping(data) {
    const subjectsSet = new Set();
    data.forEach(event => {
        let matiere = event.summary?.trim() || "";
        matiere = matiere.replace(/^(USS|UAS)[A-Z0-9]*\s*:\s*/i, "").trim();
        if (matiere && matiere !== ":") {
            subjectsSet.add(matiere);
        }
    });
    const subjects = Array.from(subjectsSet).sort();
    const mapping = {};
    subjects.forEach((subject, index) => {
        mapping[subject] = index % 5;
    });
    return mapping;
}

/**
 * Extrait les informations d'un événement (matière, prof, description)
 */
export function getEventTitle(ev) {
    let matiere = ev.summary?.trim() || "";
    const description = ev.description || "";
    let prof = "";
    matiere = matiere.replace(/^(USS|UAS)[A-Z0-9]*\s*:\s*/i, "").trim();
    const match = description.match(/Professeur\s*:\s*-?\s*(.*)$/i);
    if (match) {
        prof = match[1].trim();
        prof = prof.replace(/^(Madame|Monsieur|Mme|M\.)\s+/i, "").trim();
    }
    return {matiere, prof, description};
}

/**
 * Retourne l'index de couleur pour une matière donnée
 */
export function getColorIndexForSubject(matiere, subjectColors) {
    if (!matiere) return 0;
    return subjectColors[matiere] ?? 0;
}

/**
 * Groupe les événements par jour
 */
export function groupEventsByDay(events, monthFormat = "short") {
    return events.reduce((acc, ev) => {
        const d = new Date(ev.start);
        const weekday = d.toLocaleDateString("fr-FR", {weekday: "long"});
        const date = d.toLocaleDateString("fr-FR", {day: "numeric", month: "long"});
        const date_short = d.toLocaleDateString("fr-FR", {day: "numeric", month: "short"});
        const monthLabel = monthFormat === "long" ? date : date_short;
        const key = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${monthLabel}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(ev);
        return acc;
    }, {});
}
