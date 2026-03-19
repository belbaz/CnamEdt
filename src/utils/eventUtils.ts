/**
 * Utilitaires pour la gestion des événements
 */
import { getLocale } from "./dateUtils";
import type { CourseEvent, SplitGroupInfo } from "../types/domain";

/**
 * Crée un mapping des couleurs par matière
 */
export function createSubjectColorMapping(data: CourseEvent[]): Record<string, number> {
  const subjectsSet = new Set<string>();
  data.forEach((event) => {
    let matiere = (event.summary as string | undefined)?.trim() ?? "";
    matiere = matiere.replace(/^(USS|UAS)[A-Z0-9]*\s*:\s*/i, "").trim();
    if (matiere && matiere !== ":") {
      subjectsSet.add(matiere);
    }
  });
  const subjects = Array.from(subjectsSet).sort();
  const mapping: Record<string, number> = {};
  subjects.forEach((subject, index) => {
    mapping[subject] = index % 20;
  });
  return mapping;
}

/**
 * Parse les descriptions de cours en demi-groupe
 * Supporte plusieurs formats:
 * - Format 1: "MMe SARDESAI salle 30.-1.16 - Mr AUCHE salle 30.-1.27"
 * - Format 2: "Mr Auche salle 30.-1.19 - Professeur : - Madame Kirti SARDESAI" + LOCATION
 * - Format 3: "JEAN AUCHE salle 21.104 - Professeur : - Madame Kirti SARDESAI" + LOCATION (sans titre)
 */
function parseSplitGroup(description: string | undefined, location: string = ""): SplitGroupInfo | null {
  if (!description) return null;

  // Regex amélioré : rendre le titre (Mr/Mme) optionnel
  // Capture soit "Mr/Mme NOM salle X" soit "NOM salle X"
  const groupRegex =
    /(?:(?:MMe|Mr|Mme|M\.|Madame|Monsieur)\s+)?([A-ZÀ-ÿ][A-ZÀ-ÿ\s]+?)\s+salle\s+([\d\.\-]+)/gi;
  const matches = [...description.matchAll(groupRegex)];

  // Cas 1: Au moins 2 groupes avec format "X salle Y"
  if (matches.length >= 2) {
    const professors = matches.map((m) => m[1]!.trim());
    const rooms = matches.map((m) => m[2]!.trim());
    return { professors, rooms };
  }

  // Cas 2: Format mixte - 1 prof avec "salle X" + 1 prof dans "Professeur : Y"
  if (matches.length === 1) {
    const profMatch = description.match(
      /Professeur\s*:\s*-?\s*(?:Madame|Monsieur|Mme|M\.|MMe|Mr)\s+([A-ZÀ-ÿ\s]+?)(?:\s*$|-|Professeur)/i,
    );

    if (profMatch) {
      const prof1 = matches[0]![1]!.trim();
      const room1 = matches[0]![2]!.trim();
      const prof2 = profMatch[1]!.trim();

      // Utiliser la LOCATION pour la salle du 2e prof
      let room2 = "";
      if (location) {
        const locationCleaned = location.replace(/^Salle\s*:\s*/i, "").trim();
        // Ignorer si location est "-" ou identique à room1
        if (locationCleaned && locationCleaned !== room1 && locationCleaned !== "-") {
          room2 = locationCleaned;
        }
      }

      const rooms = room2 ? [room1, room2] : [room1];
      return {
        professors: [prof1, prof2],
        rooms,
      };
    }
  }

  return null; // Pas un demi-groupe
}

/**
 * Extrait les informations d'un événement (matière, prof, description)
 */
export function getEventTitle(ev: CourseEvent): {
  matiere: string;
  prof: string;
  description: string;
  splitGroup?: SplitGroupInfo;
} {
  let matiere = (ev.summary as string | undefined)?.trim() ?? "";
  const description = (ev.description as string | undefined) ?? "";
  const location = (ev.location as string | undefined) ?? "";
  let prof = "";
  matiere = matiere.replace(/^(USS|UAS)[A-Z0-9]*\s*:\s*/i, "").trim();

  // Essayer de parser les demi-groupes (passer la location pour le cas mixte)
  const splitGroup = parseSplitGroup(description, location);

  if (splitGroup) {
    // Mode demi-groupe: combiner les professeurs avec "/"
    prof = splitGroup.professors.join(" / ");
    return { matiere, prof, description, splitGroup };
  }

  // Mode normal: extraire le professeur depuis "Professeur : ..." ou "Professor : ..."
  const match = description.match(/(?:Professeur|Professor)\s*:\s*-?\s*(.*)$/im);
  if (match) {
    prof = match[1]!.trim().replace(/^-\s*/, "").trim();
    prof = prof.replace(/^(Madame|Monsieur|Mme|M\.)\s+/i, "").trim();
  }
  // Fallback : propriété prof directe (ex. événements démo)
  if (!prof && ev.prof) {
    prof = String(ev.prof);
  }
  return { matiere, prof, description };
}

/**
 * Retourne l'index de couleur pour une matière donnée
 */
export function getColorIndexForSubject(matiere: string, subjectColors: Record<string, number>): number {
  if (!matiere) return 0;
  return subjectColors[matiere] ?? 0;
}

/**
 * Groupe les événements par jour
 * @param {Array} events - Liste des événements
 * @param {string} monthFormat - Format du mois ("short" ou "long")
 * @param {string} language - Langue ('fr' ou 'en', par défaut 'fr')
 */
export function groupEventsByDay(
  events: CourseEvent[],
  monthFormat: "short" | "long" = "short",
  language: "fr" | "en" = "fr",
): Record<string, CourseEvent[]> {
  const locale = getLocale(language);
  return events.reduce<Record<string, CourseEvent[]>>((acc, ev) => {
    const d = new Date(ev.start);
    const weekday = d.toLocaleDateString(locale, { weekday: "long" });
    const date = d.toLocaleDateString(locale, { day: "numeric", month: "long" });
    const date_short = d.toLocaleDateString(locale, { day: "numeric", month: "short" });
    const monthLabel = monthFormat === "long" ? date : date_short;
    const key = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${monthLabel}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});
}

