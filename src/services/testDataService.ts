/**
 * Service pour générer des données de test
 */
import type { CourseEvent } from "../types/domain";

/**
 * Vérifie si aujourd'hui a des cours
 */
function hasCoursesToday(events: CourseEvent[]): boolean {
  const today = new Date();
  const todayString = today.toDateString();

  console.log("[Test Mode] Vérification des cours pour aujourd'hui:", todayString);

  const hasCourses = events.some((event) => {
    if (!event.start) return false;

    const eventDate = new Date(event.start);
    const eventString = eventDate.toDateString();

    console.log("[Test Mode] Événement trouvé:", {
      summary: event.summary,
      start: event.start,
      eventDate: eventString,
      isToday: eventString === todayString,
    });

    return eventString === todayString;
  });

  console.log("[Test Mode] Résultat de hasCoursesToday:", hasCourses);
  return hasCourses;
}

/**
 * Génère des cours de test pour aujourd'hui (9h-18h) si aucun cours n'existe
 */
export function addTestCoursesForToday(existingEvents: CourseEvent[]): CourseEvent[] {
  const today = new Date();
  console.log("[Test Mode] Date d'aujourd'hui:", today.toDateString());

  // Vérifier si c'est un jour de semaine
  const todayDayOfWeek = today.getDay();
  console.log("[Test Mode] Jour de la semaine:", todayDayOfWeek);

  if (todayDayOfWeek < 1 || todayDayOfWeek > 5) {
    console.log("[Test Mode] Weekend détecté, pas d'ajout de cours");
    return existingEvents; // Pas de cours le weekend
  }

  // Vérifier si aujourd'hui a déjà des cours
  const hasCourses = hasCoursesToday(existingEvents);
  console.log("[Test Mode] Aujourd'hui a des cours:", hasCourses);
  console.log("[Test Mode] Nombre d'événements existants:", existingEvents.length);

  if (hasCourses) {
    console.log("[Test Mode] Aujourd'hui a déjà des cours, pas d'ajout de cours de test");
    return existingEvents;
  }

  console.log("[Test Mode] Aujourd'hui n'a pas de cours, ajout de cours de test 6h30-20h");

  // Générer 7 cours d'affilée de 6h30 à 20h avec 15 minutes de pause entre chaque
  const testEvents: CourseEvent[] = [];
  const courses = [
    { subject: "Mathématiques Appliquées", prof: "M. Dupont", location: "3.1.08" }, // Saint-Martin
    { subject: "Informatique Théorique", prof: "Mme Martin", location: "35.1.15" }, // Conté
    { subject: "Base de Données", prof: "M. Bernard", location: "2.2.18" }, // Saint-Martin
    { subject: "Développement Web", prof: "Mme Dubois", location: "33.1.10" }, // Conté
    { subject: "Architecture Logicielle", prof: "M. Lefebvre", location: "11.1.12" }, // Saint-Martin
    { subject: "Intelligence Artificielle", prof: "Mme Garcia", location: "34.1.16" }, // Conté
    { subject: "Sécurité Informatique", prof: "M. Moreau", location: "15.2.13" }, // Saint-Martin
  ];

  // Calcul de la durée optimale pour finir exactement à 20h
  // De 6h30 à 20h = 13h30 = 810 minutes
  // 6 pauses * 15 min = 90 minutes
  // Temps disponible pour les cours = 810 - 90 = 720 minutes
  // Durée par cours = 720 / 7 ≈ 102.86 minutes ≈ 1h43
  const totalMinutes = 13 * 60 + 30; // 6h30 à 20h = 810 minutes
  const pauseDurationMinutes = 15;
  const totalPauseMinutes = 6 * pauseDurationMinutes; // 6 pauses entre 7 cours
  const availableMinutes = totalMinutes - totalPauseMinutes;
  const courseDurationMinutes = Math.floor(availableMinutes / 7); // ≈ 102 minutes (1h42)

  // Premier cours commence à 6h30
  let currentStartHour = 6;
  let currentStartMinute = 30;

  // Créer 7 cours d'affilée
  for (let i = 0; i < 7; i++) {
    const course = courses[i]!;

    const startTime = new Date(today);
    startTime.setHours(currentStartHour, currentStartMinute, 0, 0);

    const endTime = new Date(startTime);

    // Pour le dernier cours (index 6), on force la fin à 20h
    if (i === 6) {
      endTime.setHours(20, 0, 0, 0);
    } else {
      endTime.setMinutes(startTime.getMinutes() + courseDurationMinutes);
    }

    console.log(
      `[Test Mode] Création cours ${i + 1}: ${course.subject} de ${startTime.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })} à ${endTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    );

    testEvents.push({
      summary: course.subject,
      start: startTime,
      end: endTime,
      location: course.location,
      description: `Professeur : ${course.prof}\nMatière : ${course.subject}\n\n[Cours de test généré automatiquement]`,
    });

    // Calculer l'heure de début du prochain cours (fin du cours actuel + pause)
    // Sauf pour le dernier cours
    if (i < 6) {
      const nextStartTime = new Date(endTime);
      nextStartTime.setMinutes(nextStartTime.getMinutes() + pauseDurationMinutes);
      currentStartHour = nextStartTime.getHours();
      currentStartMinute = nextStartTime.getMinutes();
    }
  }

  // Ajouter les cours de test aux événements existants
  const allEvents: CourseEvent[] = [...existingEvents, ...testEvents];

  console.log("[Test Mode] Total d'événements après ajout:", allEvents.length);
  console.log("[Test Mode] Cours de test créés:", testEvents.length);

  // Trier par date
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return allEvents;
}

/**
 * Vérifie si le mode test est activé
 */
export function isTestModeEnabled(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("testMode") === "true";
}

/**
 * Active ou désactive le mode test
 */
export function setTestMode(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("testMode", enabled.toString());
}

/**
 * Génère une semaine complète de test (dimanche à dimanche)
 * avec des horaires variés de 7h30 à 20h
 */
export function generateTestWeek(): CourseEvent[] {
  console.log("[Test Week] Génération d'une semaine complète de test");

  const testEvents: CourseEvent[] = [];

  // Trouver le dimanche de cette semaine (ou le prochain si on est dimanche)
  const today = new Date();
  const currentDay = today.getDay(); // 0 = dimanche, 1 = lundi, etc.

  // Calculer le dimanche de cette semaine
  const startSunday = new Date(today);
  if (currentDay === 0) {
    // On est dimanche, on commence aujourd'hui
    startSunday.setHours(0, 0, 0, 0);
  } else {
    // Sinon, on recule jusqu'au dimanche précédent
    startSunday.setDate(today.getDate() - currentDay);
    startSunday.setHours(0, 0, 0, 0);
  }

  console.log("[Test Week] Dimanche de départ:", startSunday.toLocaleDateString("fr-FR"));

  // Cours variés avec différents horaires
  // Utilisation des vrais numéros de salles CNAM pour tester les badges de site
  const coursesSchedule: {
    subject: string;
    prof: string;
    location: string;
    start: [number, number];
    duration: number;
  }[][] = [
    // Dimanche - Conté
    [{ subject: "Atelier Web Avancé", prof: "M. Rousseau", location: "30.2.12", start: [10, 0], duration: 3 }],
    // Lundi - Mix Saint-Martin et Conté
    [
      { subject: "Mathématiques Appliquées", prof: "M. Dupont", location: "3.1.08", start: [8, 0], duration: 2 },
      { subject: "Informatique Théorique", prof: "Mme Martin", location: "35.1.15", start: [10, 30], duration: 2.5 },
      { subject: "Algorithmique", prof: "M. Bernard", location: "16.3.20", start: [14, 0], duration: 3 },
    ],
    // Mardi - Saint-Martin principalement
    [
      { subject: "Base de Données", prof: "Mme Dubois", location: "2.2.18", start: [7, 30], duration: 2 },
      { subject: "Réseaux", prof: "M. Lefebvre", location: "11.1.12", start: [10, 0], duration: 2 },
      { subject: "Systèmes d'Exploitation", prof: "M. Moreau", location: "4.0.09", start: [13, 30], duration: 2.5 },
      { subject: "TP Réseaux", prof: "M. Lefebvre", location: "31.2.05", start: [16, 30], duration: 2 },
    ],
    // Mercredi - Conté principalement
    [
      { subject: "Développement Web", prof: "Mme Petit", location: "33.1.10", start: [9, 0], duration: 3 },
      { subject: "Architecture Logicielle", prof: "M. Roux", location: "37.2.14", start: [13, 0], duration: 2 },
      { subject: "Gestion de Projet", prof: "Mme Laurent", location: "5.3.07", start: [15, 30], duration: 2.5 },
    ],
    // Jeudi - Mix
    [
      { subject: "Intelligence Artificielle", prof: "M. Simon", location: "34.1.16", start: [8, 30], duration: 2.5 },
      { subject: "Machine Learning", prof: "Mme Garcia", location: "13.2.11", start: [11, 30], duration: 3 },
      { subject: "Programmation Python", prof: "M. Thomas", location: "7.1.05", start: [15, 0], duration: 2 },
      { subject: "Séminaire Tech", prof: "M. Simon", location: "39.0.01", start: [18, 0], duration: 2 },
    ],
    // Vendredi - Saint-Martin
    [
      { subject: "Sécurité Informatique", prof: "M. Durand", location: "15.2.13", start: [9, 0], duration: 2 },
      { subject: "Cryptographie", prof: "Mme Robert", location: "21.1.09", start: [11, 30], duration: 2.5 },
      { subject: "TP Sécurité", prof: "M. Durand", location: "27.3.18", start: [14, 30], duration: 3 },
    ],
    // Samedi - Conté
    [
      { subject: "Cloud Computing", prof: "Mme Bonnet", location: "30.1.08", start: [9, 30], duration: 3 },
      { subject: "DevOps et CI/CD", prof: "M. Leclerc", location: "31.2.12", start: [13, 0], duration: 2.5 },
    ],
    // Dimanche suivant - Saint-Martin
    [{ subject: "Conférence Innovation", prof: "Invité Spécial", location: "9bis.0.01", start: [14, 0], duration: 2 }],
  ];

  // Générer les événements pour chaque jour
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    // 0 à 7 = dimanche à dimanche
    const currentDate = new Date(startSunday);
    currentDate.setDate(startSunday.getDate() + dayOffset);

    const dayCourses = coursesSchedule[dayOffset] || [];

    dayCourses.forEach((course) => {
      const startTime = new Date(currentDate);
      startTime.setHours(course.start[0], course.start[1], 0, 0);

      const endTime = new Date(startTime);
      const durationMinutes = course.duration * 60;
      endTime.setMinutes(startTime.getMinutes() + durationMinutes);

      console.log(
        `[Test Week] ${currentDate.toLocaleDateString("fr-FR", { weekday: "long" })} : ${course.subject} de ${startTime.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })} à ${endTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
      );

      testEvents.push({
        summary: course.subject,
        start: startTime,
        end: endTime,
        location: course.location,
        description: `Professeur : ${course.prof}\nMatière : ${course.subject}\n\n[Cours de test - Semaine complète]`,
      });
    });
  }

  console.log("[Test Week] Total de cours générés:", testEvents.length);

  // Trier par date
  testEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return testEvents;
}

/**
 * Vérifie si le mode "Test Semaine" est activé
 */
export function isTestWeekEnabled(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("testWeekMode") === "true";
}

/**
 * Active ou désactive le mode "Test Semaine"
 */
export function setTestWeekMode(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("testWeekMode", enabled.toString());
}

/**
 * Récupère les événements selon le mode (test ou normal)
 */
export async function getEvents(
  isNative: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CapacitorHttp: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchICSEvents: any,
): Promise<CourseEvent[]> {
  console.log("[Normal Mode] Fetching real data");
  return await fetchICSEvents(isNative, CapacitorHttp);
}

