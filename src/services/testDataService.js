/**
 * Service pour générer des données de test
 */

/**
 * Vérifie si aujourd'hui a des cours
 */
function hasCoursesToday(events) {
    const today = new Date();
    const todayString = today.toDateString();
    
    console.log('[Test Mode] Vérification des cours pour aujourd\'hui:', todayString);
    
    const hasCourses = events.some(event => {
        if (!event.start) return false;
        
        const eventDate = new Date(event.start);
        const eventString = eventDate.toDateString();
        
        console.log('[Test Mode] Événement trouvé:', {
            summary: event.summary,
            start: event.start,
            eventDate: eventString,
            isToday: eventString === todayString
        });
        
        return eventString === todayString;
    });
    
    console.log('[Test Mode] Résultat de hasCoursesToday:', hasCourses);
    return hasCourses;
}

/**
 * Génère des cours de test pour aujourd'hui (9h-18h) si aucun cours n'existe
 */
export function addTestCoursesForToday(existingEvents) {
    const today = new Date();
    console.log('[Test Mode] Date d\'aujourd\'hui:', today.toDateString());
    
    // Vérifier si c'est un jour de semaine
    const todayDayOfWeek = today.getDay();
    console.log('[Test Mode] Jour de la semaine:', todayDayOfWeek);
    
    if (todayDayOfWeek < 1 || todayDayOfWeek > 5) {
        console.log('[Test Mode] Weekend détecté, pas d\'ajout de cours');
        return existingEvents; // Pas de cours le weekend
    }
    
    // Vérifier si aujourd'hui a déjà des cours
    const hasCourses = hasCoursesToday(existingEvents);
    console.log('[Test Mode] Aujourd\'hui a des cours:', hasCourses);
    console.log('[Test Mode] Nombre d\'événements existants:', existingEvents.length);
    
    if (hasCourses) {
        console.log('[Test Mode] Aujourd\'hui a déjà des cours, pas d\'ajout de cours de test');
        return existingEvents;
    }
    
    console.log('[Test Mode] Aujourd\'hui n\'a pas de cours, ajout de cours de test 9h-17h');
    
    // Générer des cours de 9h à 17h
    const testEvents = [];
    const courses = [
        { subject: 'Mathématiques Appliquées', prof: 'M. Dupont', location: 'Salle A101' },
        { subject: 'Informatique', prof: 'Mme Martin', location: 'Labo Informatique' },
        { subject: 'Économie', prof: 'M. Bernard', location: 'Salle B205' },
        { subject: 'Gestion de Projet', prof: 'Mme Dubois', location: 'Salle C301' }
    ];
    
    // Créer 4 cours de 2h chacun de 9h à 17h
    for (let i = 0; i < 4; i++) {
        const startHour = 9 + i * 2; // 9h, 11h, 13h, 15h
        const course = courses[i];
        
        const startTime = new Date(today);
        startTime.setHours(startHour, 0, 0, 0);
        
        const endTime = new Date(today);
        endTime.setHours(startHour + 2, 0, 0, 0);
        
        console.log(`[Test Mode] Création cours ${i + 1}: ${course.subject} de ${startTime.toLocaleTimeString()} à ${endTime.toLocaleTimeString()}`);
        
        testEvents.push({
            summary: course.subject,
            start: startTime,
            end: endTime,
            location: course.location,
            description: `Professeur : ${course.prof}\nMatière : ${course.subject}\n\n[Cours de test généré automatiquement]`
        });
    }
    
    // Ajouter les cours de test aux événements existants
    const allEvents = [...existingEvents, ...testEvents];
    
    console.log('[Test Mode] Total d\'événements après ajout:', allEvents.length);
    console.log('[Test Mode] Cours de test créés:', testEvents.length);
    
    // Trier par date
    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    return allEvents;
}

/**
 * Vérifie si le mode test est activé
 */
export function isTestModeEnabled() {
    return localStorage.getItem('testMode') === 'true';
}

/**
 * Active ou désactive le mode test
 */
export function setTestMode(enabled) {
    localStorage.setItem('testMode', enabled.toString());
}

/**
 * Récupère les événements selon le mode (test ou normal)
 */
export async function getEvents(isNative, CapacitorHttp, fetchICSEvents) {
    console.log('[Normal Mode] Fetching real data');
    return await fetchICSEvents(isNative, CapacitorHttp);
}
