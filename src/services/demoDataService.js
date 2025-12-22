/**
 * Service pour générer des données de démo complètes pour toute l'année scolaire
 * Utilisé quand MODE_DEMO=true dans les variables d'environnement
 */

/**
 * Liste de matières variées pour le mode démo
 */
const DEMO_SUBJECTS = [
    'Mathématiques Appliquées',
    'Informatique Théorique',
    'Base de Données',
    'Développement Web',
    'Architecture Logicielle',
    'Intelligence Artificielle',
    'Sécurité Informatique',
    'Algorithmique',
    'Réseaux',
    'Systèmes d\'Exploitation',
    'Machine Learning',
    'Programmation Python',
    'Cloud Computing',
    'DevOps et CI/CD',
    'Cryptographie',
    'Gestion de Projet',
    'Atelier Web Avancé',
    'TP Réseaux',
    'TP Sécurité',
    'Séminaire Tech',
    'Conférence Innovation',
    'Architecture Microservices',
    'Big Data',
    'Blockchain',
    'IoT et Systèmes Embarqués'
];

/**
 * Liste de professeurs variés
 */
const DEMO_PROFESSORS = [
    'M. Dupont',
    'Mme Martin',
    'M. Bernard',
    'Mme Dubois',
    'M. Lefebvre',
    'Mme Garcia',
    'M. Moreau',
    'Mme Petit',
    'M. Roux',
    'Mme Laurent',
    'M. Simon',
    'M. Thomas',
    'M. Durand',
    'Mme Robert',
    'Mme Bonnet',
    'M. Leclerc',
    'M. Rousseau',
    'M. Vincent',
    'Mme Blanc',
    'M. Girard'
];

/**
 * Salles variées (Saint-Martin et Conté)
 */
const DEMO_LOCATIONS = [
    '3.1.08', '35.1.15', '2.2.18', '33.1.10', '11.1.12', '34.1.16', '15.2.13',
    '16.3.20', '4.0.09', '31.2.05', '37.2.14', '5.3.07', '13.2.11', '7.1.05',
    '39.0.01', '21.1.09', '27.3.18', '30.1.08', '31.2.12', '9bis.0.01',
    '30.2.12', '6.1.10', '8.2.15', '10.3.20', '12.1.05', '14.2.08', '17.0.12'
];

/**
 * Horaires de cours possibles (début en heures)
 */
const DEMO_TIME_SLOTS = [
    { start: [7, 30], duration: 2 },   // 7h30-9h30
    { start: [8, 0], duration: 2 },    // 8h-10h
    { start: [8, 30], duration: 2.5 },  // 8h30-11h
    { start: [9, 0], duration: 3 },     // 9h-12h
    { start: [9, 30], duration: 2 },    // 9h30-11h30
    { start: [10, 0], duration: 2.5 },  // 10h-12h30
    { start: [10, 30], duration: 2 },   // 10h30-12h30
    { start: [11, 30], duration: 3 },   // 11h30-14h30
    { start: [13, 0], duration: 2 },    // 13h-15h
    { start: [13, 30], duration: 2.5 }, // 13h30-16h
    { start: [14, 0], duration: 3 },    // 14h-17h
    { start: [14, 30], duration: 2 },   // 14h30-16h30
    { start: [15, 0], duration: 2.5 },  // 15h-17h30
    { start: [15, 30], duration: 2 },   // 15h30-17h30
    { start: [16, 30], duration: 2 },   // 16h30-18h30
    { start: [18, 0], duration: 2 },    // 18h-20h
    { start: [18, 30], duration: 1.5 }  // 18h30-20h
];

/**
 * Génère un UID unique pour un événement
 */
function generateEventUID(date, subject, index) {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const subjectHash = subject.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `DEMO-${dateStr}-${subjectHash}-${index}@demo.cnam.fr`;
}

/**
 * Génère des notes aléatoires pour certains cours (1-2 fois par semaine)
 */
function shouldHaveNote(date, eventIndex) {
    // Augmenter la probabilité pour avoir plus de notes (environ 25% des cours = ~2-3 par semaine)
    // Utiliser la date comme seed pour avoir des notes cohérentes
    const seed = date.getTime() + eventIndex;
    const random = (seed * 9301 + 49297) % 233280; // Générateur pseudo-aléatoire simple
    return (random / 233280) < 0.25; // 25% au lieu de 15% pour avoir plus de notes
}

/**
 * Détermine si un cours doit être un examen (environ 5% des cours)
 */
function shouldBeExam(date, eventIndex) {
    const seed = date.getTime() + eventIndex + 10000; // Offset différent pour éviter la corrélation avec les notes
    const random = (seed * 9301 + 49297) % 233280;
    return (random / 233280) < 0.05; // 5% des cours sont des examens
}

/**
 * Détermine si un cours doit être en distanciel (environ 12% des cours)
 */
function shouldBeDistanciel(date, eventIndex) {
    const seed = date.getTime() + eventIndex + 20000; // Offset différent pour éviter la corrélation
    const random = (seed * 9301 + 49297) % 233280;
    return (random / 233280) < 0.12; // 12% des cours sont en distanciel
}

/**
 * Génère une note de démo
 */
function generateDemoNote(subject, prof) {
    const noteTemplates = [
        `Rappel : ${subject}\n\nRéviser les chapitres 3 et 4 pour le prochain cours.`,
        `${subject} - ${prof}\n\nTP à rendre pour la semaine prochaine.`,
        `Note ${subject} :\n\nContrôle prévu dans 2 semaines.`,
        `${subject}\n\nPenser à préparer la présentation orale.`,
        `Rappel ${subject} :\n\nDevoir à faire : exercices 5 à 10.`,
        `${subject} - ${prof}\n\nRéunion projet le vendredi prochain.`
    ];
    const seed = subject.length + prof.length;
    const random = (seed * 9301 + 49297) % 233280;
    return noteTemplates[Math.floor((random / 233280) * noteTemplates.length)];
}

/**
 * Vérifie si une date est dans une période de vacances scolaires
 * NOTE: En mode démo, on génère des cours même pendant les vacances (sauf samedi/dimanche)
 * pour avoir des données toute l'année
 */
function isHoliday(date) {
    // En mode démo, on ne veut pas exclure de périodes
    // On génère des cours tous les jours de la semaine (lundi-vendredi)
    // même en juillet-août
    return false;
}

/**
 * Génère des événements de démo pour toute l'année scolaire
 * Année scolaire : septembre à juin
 */
export function generateDemoYearData() {
    console.log('[Demo Data] Génération des données de démo pour toute l\'année scolaire');
    
    const events = [];
    const notes = new Map(); // Map<eventKey, note>
    
    // Déterminer l'année scolaire actuelle
    // Cette logique fonctionne pour toutes les années (même 2030, 2050, etc.)
    // car getFullYear() retourne toujours l'année complète (4 chiffres)
    const now = new Date();
    const currentYear = now.getFullYear(); // Retourne l'année complète (ex: 2030, 2050, etc.)
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // Année scolaire : septembre (mois 9) à juin (mois 6)
    // Exemple : si on est en octobre 2030, année scolaire = 2030-2031
    // Exemple : si on est en mars 2030, année scolaire = 2029-2030
    let startYear, endYear;
    if (currentMonth >= 9) {
        // On est entre septembre et décembre, année scolaire en cours
        // Ex: octobre 2030 → année scolaire 2030-2031
        startYear = currentYear;
        endYear = currentYear + 1;
    } else {
        // On est entre janvier et août, on est dans la 2e partie de l'année scolaire
        // Ex: mars 2030 → année scolaire 2029-2030
        startYear = currentYear - 1;
        endYear = currentYear;
    }
    
    // Créer les dates de début et fin de l'année scolaire
    // Note: new Date() accepte n'importe quelle année (même très lointaine)
    // En mode démo, on génère des cours de septembre à août (toute l'année)
    const startDate = new Date(startYear, 8, 1); // 1er septembre (mois 8 = septembre en JS)
    const endDate = new Date(endYear, 7, 31); // 31 août (mois 7 = août en JS)
    
    console.log(`[Demo Data] Génération du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`);
    
    // Fonction pour obtenir le numéro de semaine (pour varier les choses par semaine)
    const getWeekNumber = (date) => {
        const monday = new Date(date);
        monday.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
        monday.setHours(0, 0, 0, 0);
        const yearStart = new Date(monday.getFullYear(), 0, 1);
        const weekNumber = Math.floor((monday.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return `${monday.getFullYear()}-W${weekNumber}`;
    };
    
    // Parcourir tous les jours de l'année scolaire
    const currentDate = new Date(startDate);
    let eventIndex = 0;
    let currentWeekStart = null; // Pour suivre le début de chaque semaine
    let hasNoteThisWeek = false; // Pour garantir au moins une note par semaine
    let hasDistancielThisWeek = false; // Pour garantir au moins un cours en distanciel par semaine
    
    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = dimanche, 6 = samedi
        
        // Détecter le début d'une nouvelle semaine (lundi)
        const weekKey = getWeekNumber(currentDate);
        if (currentWeekStart !== weekKey) {
            currentWeekStart = weekKey;
            hasNoteThisWeek = false; // Réinitialiser pour la nouvelle semaine
            hasDistancielThisWeek = false; // Réinitialiser pour la nouvelle semaine
        }
        
        // Générer des cours uniquement du lundi au vendredi (pas le samedi ni le dimanche)
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday(currentDate)) {
            // Nombre de cours par jour : variable (3 à 7 cours pour avoir plus de cours)
            // Utiliser un générateur pseudo-aléatoire déterministe basé sur la date
            const dateSeed = currentDate.getTime();
            const random1 = (dateSeed * 9301 + 49297) % 233280;
            const numCourses = Math.floor((random1 / 233280) * 5) + 3; // 3 à 7 cours
            
            // Fonction pour vérifier si un créneau chevauche avec les créneaux déjà sélectionnés
            const doesOverlap = (slot, selectedSlots) => {
                const slotStartMin = slot.start[0] * 60 + slot.start[1];
                const slotEndMin = slotStartMin + (slot.duration * 60);
                
                for (const selectedSlot of selectedSlots) {
                    const selectedStartMin = selectedSlot.start[0] * 60 + selectedSlot.start[1];
                    const selectedEndMin = selectedStartMin + (selectedSlot.duration * 60);
                    
                    // Vérifier le chevauchement : le nouveau créneau ne doit pas commencer avant la fin d'un créneau existant
                    // et ne doit pas finir après le début d'un créneau existant
                    if (!(slotEndMin <= selectedStartMin || slotStartMin >= selectedEndMin)) {
                        return true; // Il y a chevauchement
                    }
                }
                return false; // Pas de chevauchement
            };
            
            // Sélectionner des créneaux horaires sans chevauchement (avec des trous)
            const selectedSlots = [];
            const availableSlots = [...DEMO_TIME_SLOTS];
            
            // Trier d'abord les créneaux disponibles par heure de début pour faciliter la sélection
            availableSlots.sort((a, b) => {
                const timeA = a.start[0] * 60 + a.start[1];
                const timeB = b.start[0] * 60 + b.start[1];
                return timeA - timeB;
            });
            
            // Sélectionner les créneaux un par un en évitant les chevauchements
            let attempts = 0;
            const maxAttempts = availableSlots.length * 2; // Limite pour éviter une boucle infinie
            
            while (selectedSlots.length < numCourses && availableSlots.length > 0 && attempts < maxAttempts) {
                const slotSeed = dateSeed + selectedSlots.length * 1000 + attempts;
                const random2 = (slotSeed * 9301 + 49297) % 233280;
                const randomIndex = Math.floor((random2 / 233280) * availableSlots.length);
                const candidateSlot = availableSlots[randomIndex];
                
                // Vérifier si ce créneau chevauche avec ceux déjà sélectionnés
                if (!doesOverlap(candidateSlot, selectedSlots)) {
                    // Pas de chevauchement, on peut l'ajouter
                    selectedSlots.push(candidateSlot);
                    availableSlots.splice(randomIndex, 1);
                } else {
                    // Il y a chevauchement, on essaie le suivant
                    attempts++;
                }
            }
            
            // Trier les créneaux sélectionnés par heure de début (déjà fait mais on s'assure)
            selectedSlots.sort((a, b) => {
                const timeA = a.start[0] * 60 + a.start[1];
                const timeB = b.start[0] * 60 + b.start[1];
                return timeA - timeB;
            });
            
            // Générer les cours pour ce jour
            // Utiliser le numéro de semaine pour varier les matières/profs par semaine
            const weekSeed = currentWeekStart ? currentWeekStart.split('-W')[1] : '0';
            const weekSeedNum = parseInt(weekSeed) || 0;
            
            selectedSlots.forEach((slot, slotIndex) => {
                // Sélectionner aléatoirement une matière, un prof et une salle (déterministe)
                // Ajouter le numéro de semaine pour varier par semaine
                const selectionSeed = currentDate.getTime() + slotIndex * 100 + weekSeedNum * 10000;
                const random3 = (selectionSeed * 9301 + 49297) % 233280;
                const random4 = ((selectionSeed + 1000) * 9301 + 49297) % 233280;
                const random5 = ((selectionSeed + 2000) * 9301 + 49297) % 233280;
                
                // Varier les matières par semaine en utilisant le numéro de semaine comme offset
                const subjectIndex = (Math.floor((random3 / 233280) * DEMO_SUBJECTS.length) + weekSeedNum) % DEMO_SUBJECTS.length;
                const profIndex = (Math.floor((random4 / 233280) * DEMO_PROFESSORS.length) + weekSeedNum) % DEMO_PROFESSORS.length;
                const locationIndex = (Math.floor((random5 / 233280) * DEMO_LOCATIONS.length) + weekSeedNum) % DEMO_LOCATIONS.length;
                
                const subject = DEMO_SUBJECTS[subjectIndex];
                const prof = DEMO_PROFESSORS[profIndex];
                const location = DEMO_LOCATIONS[locationIndex];
                
                // Créer les dates de début et fin
                const startTime = new Date(currentDate);
                startTime.setHours(slot.start[0], slot.start[1], 0, 0);
                
                const endTime = new Date(startTime);
                endTime.setMinutes(startTime.getMinutes() + (slot.duration * 60));
                
                // Générer l'UID
                const uid = generateEventUID(currentDate, subject, eventIndex);
                
                // Déterminer si ce cours est un examen ou en distanciel
                const isExam = shouldBeExam(currentDate, eventIndex);
                
                // Garantir au moins un cours en distanciel par semaine
                let isDistanciel = false;
                if (!hasDistancielThisWeek && (dayOfWeek === 4 || dayOfWeek === 5)) {
                    // Si on n'a pas encore de cours en distanciel cette semaine et qu'on est jeudi ou vendredi, forcer un cours en distanciel
                    isDistanciel = true;
                } else {
                    // Sinon, utiliser la probabilité normale (12%)
                    isDistanciel = shouldBeDistanciel(currentDate, eventIndex);
                }
                
                if (isDistanciel) {
                    hasDistancielThisWeek = true; // Marquer qu'on a un cours en distanciel cette semaine
                }
                
                // Construire la description avec le prof
                let description = `Professeur : - ${prof}`;
                
                // Ajouter "EXAMEN" dans la description si c'est un examen
                if (isExam) {
                    description = `EXAMEN - ${description}`;
                }
                
                // Modifier la localisation si c'est en distanciel
                let finalLocation = location;
                if (isDistanciel) {
                    finalLocation = 'Visio'; // Format attendu par isVisioLocation()
                }
                
                // Créer l'événement avec le prof dans la description
                // Format de description similaire à l'ICS réel
                // Le regex dans eventUtils.js cherche "Professeur\s*:\s*-?\s*(.*)$/i"
                // Il cherche "Professeur :" suivi optionnellement de "-" puis le nom jusqu'à la fin de la ligne
                // Format réel de l'ICS : "Professeur : - M. DUPONT" ou "Professeur : M. DUPONT"
                // On utilise le format avec le tiret pour correspondre exactement au format ICS
                const event = {
                    uid: uid,
                    summary: subject,
                    start: startTime.toISOString(),
                    end: endTime.toISOString(),
                    location: finalLocation,
                    description: description,
                    prof: prof // Ajouter le champ prof pour l'affichage direct
                };
                
                events.push(event);
                
                // Générer une note pour certains cours
                // Garantir au moins une note par semaine
                let shouldAddNote = false;
                
                // Si on n'a pas encore de note cette semaine et qu'on est jeudi ou vendredi, forcer une note
                if (!hasNoteThisWeek && (dayOfWeek === 4 || dayOfWeek === 5)) {
                    shouldAddNote = true;
                } else {
                    // Sinon, utiliser la probabilité normale (25%)
                    shouldAddNote = shouldHaveNote(currentDate, eventIndex);
                }
                
                if (shouldAddNote) {
                    const note = generateDemoNote(subject, prof);
                    // Utiliser l'UID de l'événement comme clé (course_uid)
                    // C'est ce que l'API /api/agenda attend pour mapper les notes
                    notes.set(uid, note);
                    hasNoteThisWeek = true; // Marquer qu'on a une note cette semaine
                }
                
                eventIndex++;
            });
        }
        
        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Trier les événements par date
    events.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    console.log(`[Demo Data] Génération terminée : ${events.length} événements, ${notes.size} notes`);
    
    return {
        events: events,
        notes: notes
    };
}

/**
 * Vérifie si le mode démo est activé
 * Le mode démo s'active si :
 * - Le domaine est demo-edt.vercel.app
 * - OU la variable d'environnement NEXT_PUBLIC_MODE_DEMO=true
 */
export function isDemoModeEnabled() {
    if (typeof window !== 'undefined') {
        // Côté client : vérifier le hostname OU la variable d'environnement
        const hostname = window.location.hostname;
        const envMode = process.env.NEXT_PUBLIC_MODE_DEMO === 'true';
        return hostname === 'demo-edt.vercel.app' || envMode;
    }
    // Côté serveur : cette fonction ne devrait pas être appelée côté serveur
    // Utiliser checkDemoModeFromRequest() dans les API routes
    return false;
}

/**
 * Vérifie si le mode démo est activé depuis une requête API
 * Le mode démo s'active si :
 * - Le domaine est demo-edt.vercel.app
 * - OU la variable d'environnement MODE_DEMO=true ou NEXT_PUBLIC_MODE_DEMO=true
 * @param {Request} request - La requête HTTP
 * @returns {boolean}
 */
export function checkDemoModeFromRequest(request) {
    // Vérifier d'abord la variable d'environnement
    const envMode = process.env.MODE_DEMO === 'true' || process.env.NEXT_PUBLIC_MODE_DEMO === 'true';
    if (envMode) {
        return true;
    }
    
    // Sinon, vérifier le domaine
    try {
        const url = new URL(request.url);
        const hostname = url.hostname;
        // Vérifier aussi le header Host au cas où
        const hostHeader = request.headers.get('host') || '';
        return hostname === 'demo-edt.vercel.app' || hostHeader === 'demo-edt.vercel.app';
    } catch {
        return false;
    }
}

