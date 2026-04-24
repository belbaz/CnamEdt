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

/* ==========================================================================
 * Helpers d'extraction des professeurs / salles depuis la description ICS
 * ==========================================================================
 *
 * Cas réels rencontrés dans les .ics du CNAM :
 *
 *  NORMAL
 *  - "Professeur : - M. DUPONT"
 *  - "Professeur : M. DUPONT"
 *  - "Professeur : - Monsieur Cédric DU MOUZA"
 *  - "Professeur :\n- Madame Kirti SARDESAI"             (saut de ligne)
 *  - "Cours/Exercices Dirigés - Mr CEDRIC FONTAINE - Professeur : - ?"
 *        (le label Professeur est "?" → fallback sur le nom dans la desc)
 *
 *  DEMI-GROUPE
 *  - "MMe SARDESAI salle 30.-1.16 - Mr AUCHE salle 30.-1.27"   (prof avant salle)
 *  - "Mr AUCHE salle 21.104 - Mme SARDESAI salle 30.-1.16"
 *  - "JEAN AUCHE salle 21.104 - Professeur : - Madame Kirti SARDESAI"  (sans titre)
 *  - "Mr Auche salle 30.-1.19 - Professeur : - Madame Kirti SARDESAI"
 *        (mixte : 1 prof "salle" + 1 prof dans label, 2e salle via LOCATION ICS)
 *  - "Cours/Exercices Dirigés - 30.-1.16 Mme SARDESAI - 30.-1.27 Mr AUCHE
 *          - Professeur : - Madame Kirti SARDESAI"              (salle avant prof)
 */

/** Préfixe de titre (Mr, Mme, Monsieur, Madame, M., MMe…) en début de chaîne */
const TITLE_PREFIX_REGEX = /^(?:MMe|Mme|Mr|M\.|Madame|Monsieur)\s+/i;

/**
 * Regex de salle au format CNAM.
 * Exemples valides : 30.-1.16, 30.-1.27, 21.104, 30.0.15, 11bis.2.10
 * On accepte des étages négatifs (sous-sol) et un éventuel suffixe "bis".
 */
const ROOM_REGEX = /\b(\d{1,3}(?:bis)?\.-?\d+(?:\.-?\d+)*)\b/g;

/** Séparateurs courants entre deux segments (tiret, em/en-dash, saut de ligne) */
const SEGMENT_SEPARATOR = /\s[-–—]\s|\r?\n+/;

/** Mots-clés qui indiquent un type de cours et non un prof */
const COURSE_TYPE_KEYWORDS =
  /^(?:Cours(?:\s*\/\s*Exercices\s*Dirigés)?|Exercices\s*Dirigés|TP|TD|CM|Conférence|Examen|EXAMEN|Évaluation|Contrôle)\b/i;

/** Nettoie un nom de prof : retire titres, tirets résiduels, mot "salle", "?" */
function cleanProfName(raw: string | undefined): string {
  if (!raw) return "";
  let name = String(raw).trim();
  // Retirer tirets collés en début / fin
  name = name.replace(/^[-–—\s]+/, "").replace(/[-–—\s]+$/, "");
  // Retirer "salle" résiduel (ex: "Mr AUCHE salle" -> "Mr AUCHE")
  name = name.replace(/\bsalle\b/gi, " ").trim();
  // Retirer le préfixe de titre
  name = name.replace(TITLE_PREFIX_REGEX, "").trim();
  // Normaliser les espaces
  name = name.replace(/\s+/g, " ").trim();
  if (!name || name === "?" || name === "-") return "";
  return name;
}

/** Vrai si la chaîne ressemble à un nom de prof exploitable */
function isValidProfName(name: string): boolean {
  if (!name || name.length < 2) return false;
  if (COURSE_TYPE_KEYWORDS.test(name)) return false;
  // Doit contenir au moins une lettre alphabétique
  if (!/[A-Za-zÀ-ÿ]/.test(name)) return false;
  return true;
}

/**
 * Extrait le nom du prof depuis le label "Professeur : …" ou "Professor : …".
 * Gère les sauts de ligne entre le label et le nom.
 */
function extractProfFromLabel(description: string): string {
  // \s* englobe \n donc un prof sur la ligne suivante est capturé
  const re = /(?:Professeur|Professor)\s*:\s*-?\s*([^\r\n]*)/i;
  const m = description.match(re);
  if (!m) return "";
  return cleanProfName(m[1]);
}

/**
 * Cherche un nom de prof ailleurs que dans le label "Professeur :".
 * Utile quand le label est vide ou contient "?".
 * Exemple : "Cours/Exercices Dirigés - Mr CEDRIC FONTAINE - Professeur : - ?"
 *          → renvoie "CEDRIC FONTAINE"
 */
function extractProfFromMain(description: string): string {
  const mainPart = description.split(/(?:Professeur|Professor)\s*:/i)[0] ?? "";

  const segments = mainPart
    .split(SEGMENT_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const seg of segments) {
    if (COURSE_TYPE_KEYWORDS.test(seg)) continue;

    // Retirer la/les salle(s) éventuelles et le mot "salle"
    const withoutRooms = seg.replace(ROOM_REGEX, " ").replace(/\bsalle\b/gi, " ");
    const candidate = cleanProfName(withoutRooms);

    if (isValidProfName(candidate)) return candidate;
  }
  return "";
}

/**
 * Parse un segment type "… salle …" ou "… 30.-1.16 …" et renvoie prof + salle.
 * Le prof et la salle peuvent apparaître dans n'importe quel ordre.
 */
function parseSegment(segment: string): { prof: string; room: string } | null {
  const match = segment.match(ROOM_REGEX);
  if (!match || match.length === 0) return null;

  const room = match[0]!;
  const profPart = segment
    .replace(room, " ")
    .replace(/\bsalle\b/gi, " ");
  const prof = cleanProfName(profPart);

  return { prof, room };
}

/**
 * Détecte les cours en demi-groupe (plusieurs profs sur le même créneau).
 * Renvoie `null` si ce n'est pas un demi-groupe.
 */
function parseSplitGroup(
  description: string | undefined,
  location = "",
): SplitGroupInfo | null {
  if (!description) return null;

  // 1) Isoler la partie principale (avant "Professeur :")
  const mainPart = description.split(/(?:Professeur|Professor)\s*:/i)[0] ?? description;

  // 2) Découper en segments
  const segments = mainPart
    .split(SEGMENT_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !COURSE_TYPE_KEYWORDS.test(s));

  // 3) Parser chaque segment pour trouver salle + prof
  const parsed = segments
    .map(parseSegment)
    .filter((p): p is { prof: string; room: string } => p !== null);

  // CAS A : au moins 2 segments complets "prof + salle" → demi-groupe direct
  if (parsed.length >= 2) {
    return {
      professors: parsed.map((p) => p.prof).filter(Boolean),
      rooms: parsed.map((p) => p.room),
    };
  }

  // CAS B : 1 seul segment "prof + salle" + un second prof dans "Professeur : …"
  //         → la 2e salle vient du champ LOCATION de l'ICS
  if (parsed.length === 1) {
    const labelProf = extractProfFromLabel(description);
    const first = parsed[0]!;

    if (labelProf && labelProf.toLowerCase() !== first.prof.toLowerCase()) {
      let room2 = "";
      if (location) {
        const cleaned = location.replace(/^Salle\s*:\s*/i, "").trim();
        if (cleaned && cleaned !== "-" && cleaned !== first.room) {
          room2 = cleaned;
        }
      }

      const prof1 = first.prof || extractProfFromMain(description);
      const rooms = room2 ? [first.room, room2] : [first.room];
      const professors = [prof1, labelProf].filter(Boolean);

      if (professors.length >= 2) {
        return { professors, rooms };
      }
    }
  }

  return null;
}

/**
 * Extrait les informations d'un événement (matière, prof, description).
 * Gère les cours normaux et les demi-groupes.
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

  // 1) Tentative de parsing demi-groupe
  const splitGroup = parseSplitGroup(description, location);
  if (splitGroup && splitGroup.professors.length > 0) {
    prof = splitGroup.professors.join(" / ");
    return { matiere, prof, description, splitGroup };
  }

  // 2) Prof via le label "Professeur : …"
  prof = extractProfFromLabel(description);

  // 3) Fallback : chercher ailleurs dans la description
  if (!prof) {
    prof = extractProfFromMain(description);
  }

  // 4) Fallback : propriété `prof` de l'événement (ex. données démo)
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
