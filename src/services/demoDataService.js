/**
 * Service pour générer des données de démo complètes pour toute l'année scolaire
 * Utilisé quand MODE_DEMO=true dans les variables d'environnement
 */

/** Matières démo (FR / EN) */
const DEMO_SUBJECTS = [
    { fr: 'Mathématiques Appliquées', en: 'Applied Mathematics' },
    { fr: 'Informatique Théorique', en: 'Theoretical Computer Science' },
    { fr: 'Base de Données', en: 'Databases' },
    { fr: 'Développement Web', en: 'Web Development' },
    { fr: 'Architecture Logicielle', en: 'Software Architecture' },
    { fr: 'Intelligence Artificielle', en: 'Artificial Intelligence' },
    { fr: 'Sécurité Informatique', en: 'Computer Security' },
    { fr: 'Algorithmique', en: 'Algorithms' },
    { fr: 'Réseaux', en: 'Networks' },
    { fr: 'Systèmes d\'Exploitation', en: 'Operating Systems' },
    { fr: 'Machine Learning', en: 'Machine Learning' },
    { fr: 'Programmation Python', en: 'Python Programming' },
    { fr: 'Cloud Computing', en: 'Cloud Computing' },
    { fr: 'DevOps et CI/CD', en: 'DevOps and CI/CD' },
    { fr: 'Cryptographie', en: 'Cryptography' },
    { fr: 'Gestion de Projet', en: 'Project Management' },
    { fr: 'Atelier Web Avancé', en: 'Advanced Web Workshop' },
    { fr: 'TP Réseaux', en: 'Networks Lab' },
    { fr: 'TP Sécurité', en: 'Security Lab' },
    { fr: 'Séminaire Tech', en: 'Tech Seminar' },
    { fr: 'Conférence Innovation', en: 'Innovation Conference' },
    { fr: 'Architecture Microservices', en: 'Microservices Architecture' },
    { fr: 'Big Data', en: 'Big Data' },
    { fr: 'Blockchain', en: 'Blockchain' },
    { fr: 'IoT et Systèmes Embarqués', en: 'IoT and Embedded Systems' }
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

/** Durées de cours autorisées : 1h30, 2h ou 3h uniquement */
const DEMO_DURATIONS = [1.5, 2, 3];

/**
 * Pauses déjeuner possibles : au moins 1h, max 1h30.
 * Début : 12h00, 12h15 ou 12h30. Fin : 13h00, 13h15 ou 13h30.
 * Chaque entrée : { startMin, endMin } (minutes depuis minuit).
 */
const DEMO_LUNCH_BREAKS = [
    { startMin: 12 * 60 + 0, endMin: 13 * 60 + 0 },   // 12h-13h (1h)
    { startMin: 12 * 60 + 0, endMin: 13 * 60 + 15 },  // 12h-13h15 (1h15)
    { startMin: 12 * 60 + 0, endMin: 13 * 60 + 30 },  // 12h-13h30 (1h30)
    { startMin: 12 * 60 + 15, endMin: 13 * 60 + 15 }, // 12h15-13h15 (1h)
    { startMin: 12 * 60 + 15, endMin: 13 * 60 + 30 }, // 12h15-13h30 (1h15)
    { startMin: 12 * 60 + 30, endMin: 13 * 60 + 30 }, // 12h30-13h30 (1h)
];

/**
 * Générateur pseudo-aléatoire déterministe
 */
function rnd(seed) {
    return (seed * 9301 + 49297) % 233280;
}

/** Découpe un total de minutes en durées 90, 120 ou 180. Retourne null si impossible. */
function decomposeToDurations(totalMin, dateSeed) {
    const durs = [90, 120, 180];
    if (totalMin === 0) return [];
    const order = (rnd(dateSeed) / 233280) < 0.33 ? [90, 120, 180] : (rnd(dateSeed + 1) / 233280) < 0.5 ? [180, 120, 90] : [120, 90, 180];
    for (const d of order) {
        if (totalMin >= d) {
            const rest = decomposeToDurations(totalMin - d, dateSeed + d);
            if (rest !== null) return [d / 60, ...rest];
        }
    }
    return null;
}

/**
 * Paires (début matin, début pause) pour lesquelles le matin se remplit exactement sans trou.
 * Totaux fillables avec 1.5h, 2h, 3h : 90, 120, 180, 210, 240, 270 min.
 */
const VALID_MORNING_CONFIGS = [
    [8 * 60, 12 * 60], [8 * 60, 12 * 60 + 30],                 // 8h -> 12h (240), 12h30 (270)
    [8 * 60 + 30, 12 * 60], [8 * 60 + 30, 12 * 60 + 30],
    [9 * 60, 12 * 60], [9 * 60, 12 * 60 + 30],
    [7 * 60 + 45, 12 * 60 + 15], [8 * 60 + 15, 12 * 60 + 15], // pause 12h15
    [10 * 60 + 30, 12 * 60], [10 * 60 + 30, 12 * 60 + 30],   // 10h30 (rare)
];

/**
 * Construit une journée : cours enchaînés sans aucun espace.
 * Le dernier cours du matin finit exactement quand la pause commence.
 * 10h30 en début : rare (1 jour / semaine max).
 */
function buildBackToBackSlots(pauseStartMin, pauseEndMin, dateSeed, useRareStart = false) {
    const slots = [];
    const endAfternoonMax = 18 * 60 + 30;

    let configs = VALID_MORNING_CONFIGS.filter(([start, pStart]) => {
        if (pStart !== pauseStartMin) return false;
        if (start === 10 * 60 + 30) return useRareStart;
        return !useRareStart;
    });
    if (configs.length === 0) {
        configs = VALID_MORNING_CONFIGS.filter(([start, pStart]) => pStart === pauseStartMin && start !== 10 * 60 + 30);
    }
    if (configs.length === 0) {
        configs = VALID_MORNING_CONFIGS.filter(([, pStart]) => pStart === pauseStartMin);
    }
    if (configs.length === 0) {
        configs = VALID_MORNING_CONFIGS.filter(([start]) => start !== 10 * 60 + 30).slice(0, 3);
    }
    const [mornStart, actualPauseStart] = configs[Math.floor((rnd(dateSeed) / 233280) * configs.length)];

    const morningTotal = actualPauseStart - mornStart;
    const morningDurations = decomposeToDurations(morningTotal, dateSeed);
    let currentMin = mornStart;
    for (const dur of morningDurations) {
        slots.push({ start: [Math.floor(currentMin / 60), currentMin % 60], duration: dur });
        currentMin += dur * 60;
    }

    currentMin = pauseEndMin;
    while (currentMin + 90 <= endAfternoonMax) {
        const durIdx = Math.floor((rnd(dateSeed + currentMin + 5000) / 233280) * DEMO_DURATIONS.length);
        const dur = DEMO_DURATIONS[durIdx];
        const endMin = currentMin + dur * 60;
        if (endMin > endAfternoonMax) break;
        slots.push({ start: [Math.floor(currentMin / 60), currentMin % 60], duration: dur });
        currentMin = endMin;
    }
    return slots;
}

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
 * Détermine si un cours doit être en distanciel (probabilité de base, utilisée une fois les 3 obligatoires par semaine assurées)
 */
function shouldBeDistanciel(date, eventIndex) {
    const seed = date.getTime() + eventIndex + 20000;
    const random = (seed * 9301 + 49297) % 233280;
    return (random / 233280) < 0.15;
}

/** Textes des notes démo (FR/EN) */
const DEMO_NOTE_TEMPLATES = [
    { fr: 'Réviser les chapitres 3 et 4 pour le prochain cours.', en: 'Review chapters 3 and 4 for the next class.', labels: { fr: ['Révision'], en: ['Revision'] } },
    { fr: 'TP à rendre pour la semaine prochaine.', en: 'Lab report due next week.', labels: { fr: ['TP', 'Devoir'], en: ['Lab', 'Assignment'] } },
    { fr: 'Contrôle prévu dans 2 semaines.', en: 'Test scheduled in 2 weeks.', labels: { fr: ['Examen'], en: ['Exam'] } },
    { fr: 'Penser à préparer la présentation orale.', en: 'Remember to prepare the oral presentation.', labels: { fr: ['Présentation'], en: ['Presentation'] } },
    { fr: 'Devoir à faire : exercices 5 à 10.', en: 'Assignment: exercises 5 to 10.', labels: { fr: ['Devoir'], en: ['Assignment'] } },
    { fr: 'Réunion projet le vendredi prochain.', en: 'Project meeting next Friday.', labels: { fr: ['Projet', 'Réunion'], en: ['Project', 'Meeting'] } },
    { fr: 'TP noté à préparer pour le prochain cours.', en: 'Graded lab to prepare for next class.', labels: { fr: ['TP', 'Examen'], en: ['Lab', 'Exam'] } },
    { fr: 'Devoir maison à rendre.', en: 'Homework to hand in.', labels: { fr: ['Devoir'], en: ['Assignment'] } },
    { fr: 'Présentation de projet en groupe. Deadline : semaine prochaine.', en: 'Group project presentation. Deadline: next week.', labels: { fr: ['Projet', 'Présentation', 'Urgent'], en: ['Project', 'Presentation', 'Urgent'] } },
    { fr: 'TP pratique à faire.', en: 'Practical lab to complete.', labels: { fr: ['TP'], en: ['Lab'] } },
    { fr: 'Réviser les bases avant le prochain cours.', en: 'Review the basics before the next class.', labels: { fr: ['Révision'], en: ['Revision'] } },
    { fr: 'Contrôle continu prévu.', en: 'Continuous assessment scheduled.', labels: { fr: ['Examen'], en: ['Exam'] } },
    { fr: 'Préparer les slides pour la prochaine séance.', en: 'Prepare the slides for the next session.', labels: { fr: ['Présentation'], en: ['Presentation'] } },
    { fr: 'Rendre le compte-rendu avant vendredi.', en: 'Submit the report before Friday.', labels: { fr: ['Devoir', 'TP'], en: ['Assignment', 'Lab'] } }
];

/**
 * Génère une note de démo avec des labels appropriés (bilingue).
 * Retourne un objet avec entries (tableau de textes) et entry_labels (objet).
 * 3/5 des notes ont 2 entrées, 1/6 ont 3 entrées, le reste 1 entrée.
 */
function generateDemoNote(subject, prof, entrySeed, lang = 'fr') {
    const langKey = lang === 'en' ? 'en' : 'fr';
    const seed = subject.length + prof.length + entrySeed;
    const r = (seed * 9301 + 49297) % 233280;
    const numEntries = (r / 233280) < 7 / 30 ? 1 : (r / 233280) < 25 / 30 ? 2 : 3;

    const entries = [];
    const entryLabels = {};
    for (let i = 0; i < numEntries; i++) {
        const idx = Math.floor(((seed + i * 111 + r) * 9301 + 49297) % 233280 / 233280 * DEMO_NOTE_TEMPLATES.length);
        const t = DEMO_NOTE_TEMPLATES[idx];
        entries.push(t[langKey]);
        if (t.labels[langKey]?.length > 0) entryLabels[String(i)] = t.labels[langKey];
    }
    return { entries, entry_labels: entryLabels };
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
export function generateDemoYearData(lang = 'fr') {
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
    let currentWeekStart = null;
    /** Jours de la semaine (lun=1..ven=5) ayant déjà au moins une note cette semaine */
    let notesDaysThisWeek = new Set();
    /** Nombre de cours en distanciel déjà placés cette semaine */
    let distancielCountThisWeek = 0;

    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = dimanche, 6 = samedi

        const weekKey = getWeekNumber(currentDate);
        if (currentWeekStart !== weekKey) {
            currentWeekStart = weekKey;
            notesDaysThisWeek = new Set();
            distancielCountThisWeek = 0;
        }

        if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday(currentDate)) {
            const dateSeed = currentDate.getTime();
            let notesCountThisDay = 0;

            // Pause déjeuner variée pour ce jour (12h-13h, 12h15-13h30, etc.)
            const lunchIndex = Math.floor((dateSeed * 17) % DEMO_LUNCH_BREAKS.length);
            const lunch = DEMO_LUNCH_BREAKS[lunchIndex];
            const weekSeedNum = currentWeekStart ? parseInt(currentWeekStart.split('-W')[1], 10) || 0 : 0;
            const useRareStart = (dayOfWeek === ((weekSeedNum % 5) + 1)); // 10h30 max 1 jour / semaine
            const selectedSlots = buildBackToBackSlots(lunch.startMin, lunch.endMin, dateSeed, useRareStart);
            // 3/5 → 2 notes, 1/6 → 3 notes, le reste → 1 note (plafonné au nb de cours)
            const numCourses = selectedSlots.length;
            const r = rnd(dateSeed + 60000) / 233280;
            const rawMax = r < 7 / 30 ? 1 : r < 25 / 30 ? 2 : 3;
            const maxNotesThisDay = Math.min(rawMax, numCourses);

            // Générer les cours pour ce jour (weekSeedNum déjà défini plus haut)
            selectedSlots.forEach((slot, slotIndex) => {
                // Sélectionner aléatoirement une matière, un prof et une salle (déterministe)
                // Ajouter le numéro de semaine pour varier par semaine
                const selectionSeed = currentDate.getTime() + slotIndex * 100 + weekSeedNum * 10000;
                const random3 = (selectionSeed * 9301 + 49297) % 233280;
                const random4 = ((selectionSeed + 1000) * 9301 + 49297) % 233280;
                const random5 = ((selectionSeed + 2000) * 9301 + 49297) % 233280;
                
                // Varier les matières par semaine (traduites selon la langue)
                const langKey = lang === 'en' ? 'en' : 'fr';
                const subjectIndex = (Math.floor((random3 / 233280) * DEMO_SUBJECTS.length) + weekSeedNum) % DEMO_SUBJECTS.length;
                const profIndex = (Math.floor((random4 / 233280) * DEMO_PROFESSORS.length) + weekSeedNum) % DEMO_PROFESSORS.length;
                const locationIndex = (Math.floor((random5 / 233280) * DEMO_LOCATIONS.length) + weekSeedNum) % DEMO_LOCATIONS.length;
                
                const subject = DEMO_SUBJECTS[subjectIndex][langKey];
                const prof = DEMO_PROFESSORS[profIndex];
                const location = DEMO_LOCATIONS[locationIndex];
                
                // Créer les dates de début et fin
                const startTime = new Date(currentDate);
                startTime.setHours(slot.start[0], slot.start[1], 0, 0);
                
                const endTime = new Date(startTime);
                endTime.setMinutes(startTime.getMinutes() + (slot.duration * 60));
                
                // Générer l'UID
                const uid = generateEventUID(currentDate, subject, eventIndex);
                
                const isExam = shouldBeExam(currentDate, eventIndex);

                // Garantir au moins 3 cours en distanciel par semaine (lun, mar, mer : 1er cours du jour)
                let isDistanciel = false;
                if (distancielCountThisWeek < 3 && slotIndex === 0 && dayOfWeek <= 3) {
                    isDistanciel = true;
                }
                if (!isDistanciel) {
                    isDistanciel = shouldBeDistanciel(currentDate, eventIndex);
                }
                if (isDistanciel) distancielCountThisWeek++;
                
                // Construire la description avec le prof (traduite)
                const profLabel = langKey === 'en' ? 'Professor' : 'Professeur';
                let description = `${profLabel} : - ${prof}`;
                if (isExam) {
                    const examLabel = langKey === 'en' ? 'EXAM' : 'EXAMEN';
                    description = `${examLabel} - ${description}`;
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
                
                // Au moins 3 notes par semaine sur des jours différents ; 3/5 → 2 notes, 1/6 → 3 notes
                if (notesCountThisDay < maxNotesThisDay) {
                    const thisDayHasNote = notesDaysThisWeek.has(dayOfWeek);
                    const needMoreDaysWithNote = 3 - notesDaysThisWeek.size;
                    let shouldAddNote = false;
                    if (notesCountThisDay === 0) {
                        if (!thisDayHasNote && needMoreDaysWithNote > 0 && slotIndex === 0) {
                            shouldAddNote = true;
                        } else if (!thisDayHasNote && needMoreDaysWithNote > 0) {
                            const rn = rnd(currentDate.getTime() + slotIndex + 40000) / 233280;
                            shouldAddNote = rn < 0.5;
                        } else {
                            shouldAddNote = shouldHaveNote(currentDate, eventIndex);
                        }
                    } else {
                        // 2e ou 3e note du jour : forte proba pour atteindre maxNotesThisDay (3/5 et 1/6)
                        const rn = rnd(currentDate.getTime() + slotIndex + 50000) / 233280;
                        shouldAddNote = rn < 0.85;
                    }
                    if (shouldAddNote) {
                        notes.set(uid, generateDemoNote(subject, prof, eventIndex, lang));
                        notesDaysThisWeek.add(dayOfWeek);
                        notesCountThisDay++;
                    }
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

