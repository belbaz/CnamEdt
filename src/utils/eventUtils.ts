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
 *
 *  DEMI-GROUPE LABELLISÉ (typique cours d'anglais)
 *  - "Cours/Exercices Dirigés - 2ME GROUPE avec Monsieur JEAN AUCHE
 *          - Professeur : - Madame Kirti SARDESAI"
 *  - "1ER GROUPE avec Mr X salle 21.104 - 2ME GROUPE avec Mme Y salle 30.-1.16"
 *  - "Groupe 1 : Mr X - Groupe 2 : Mme Y"
 *  - "GROUPE A avec …", "1ère GROUPE…", "1/2 GROUPE…", "DEMI-GROUPE…"
 */

/** Préfixe de titre (Mr, Mme, Monsieur, Madame, M., MMe, Dr, Pr, Mlle…) */
const TITLE_PREFIX_REGEX =
  /^(?:MMe|Mme|Mr\.?|M\.|Madame|Monsieur|Mlle|Mademoiselle|Dr\.?|Docteur|Pr\.?|Professeur|Prof\.?|Ms\.?|Mrs\.?|Miss|Sir)\s+/i;

/**
 * Regex de salle au format CNAM.
 * Exemples valides : 30.-1.16, 30.-1.27, 21.104, 30.0.15, 11bis.2.10
 * On accepte des étages négatifs (sous-sol) et un éventuel suffixe "bis".
 */
const ROOM_REGEX = /\b(\d{1,3}(?:bis)?\.-?\d+(?:\.-?\d+)*)\b/g;

/**
 * Séparateurs courants entre deux segments.
 * Couvre : tiret (simple/demi/cadratin), saut de ligne, virgule,
 *          point-virgule, pipe, puces typographiques (•, ·, ★),
 *          slash entouré d'espaces.
 *
 * NB : on garde "\s" autour des tirets pour ne pas couper "DU-MOUZA"
 *      ou "DEMI-GROUPE" par inadvertance.
 */
const SEGMENT_SEPARATOR =
  /\s[-–—]\s|\r?\n+|\s*[;|·•★]\s*|,\s+|\s\/\s/;

/** Mots-clés qui indiquent un type de cours et non un prof */
const COURSE_TYPE_KEYWORDS =
  /^(?:Cours(?:\s*\/\s*Exercices\s*Dirigés)?|Exercices\s*Dirigés|TP|TD|CM|Conférence|Examen|EXAMEN|Évaluation|Contrôle|Atelier|Séminaire|Soutenance)\b/i;

/**
 * Motif détectant un préfixe de "groupe" au début d'un segment.
 *
 * Couvre notamment (FR + EN, singulier/pluriel, abréviations) :
 *  - Ordinaux FR : "1ER", "1ERS", "2ME", "1ère", "2ème", "2nd", "2nde", "PREMIER",
 *                  "PREMIÈRE", "DEUXIÈME", "TROISIÈME", "QUATRIÈME"…
 *  - Ordinaux EN : "1ST", "2ND", "3RD", "4TH"…
 *  - Fraction     : "1/2", "2/3"…
 *  - Préfixés     : "DEMI", "DEMI-", "SOUS", "SOUS-", "HALF", "HALF-"
 *  - Mot "groupe" : "GROUPE", "GROUP", "GRP", "GPE", "GR.", "GR"
 *                   "SECTION", "SS-GROUPE", "SOUS-GROUPE"
 *  - Suffixé d'un identifiant : "GROUPE 1", "GROUPE A", "GRP 2", "GR.B"
 *  - Séparateur post-label : "avec", "with", ":", "-", "–", "—", "=", "→", rien
 *
 * Ne consomme PAS le nom du prof (qui reste après le match).
 */
const GROUP_LABEL_REGEX = new RegExp(
  "^\\s*(?:" +
    // Forme 1 : <ordinal|fraction|préfixe> + mot-groupe + identifiant OPTIONNEL
    "(?:" +
    "\\d+\\s*(?:ER|ERS|ERE|ERES|ÈRE|ÈRES|EME|EMES|ÈME|ÈMES|ME|MES|ND|NDE|NDS|NDES|ST|RD|TH)?" +
    "|PREMIER|PREMIÈRE|PREMIERE|PREMIERS?|PREMIÈRES?|PREMIERES?" +
    "|DEUXIEME|DEUXIÈME|DEUXIEMES?|DEUXIÈMES?" +
    "|TROISIEME|TROISIÈME|TROISIEMES?|TROISIÈMES?" +
    "|QUATRIEME|QUATRIÈME|QUATRIEMES?|QUATRIÈMES?" +
    "|FIRST|SECOND|THIRD|FOURTH" +
    "|\\d+\\s*\\/\\s*\\d+" +
    "|DEMI[-\\s]?|SOUS[-\\s]?|HALF[-\\s]?|SUB[-\\s]?" +
    ")\\s*(?:GROUPES?|GROUPS?|SECTIONS?|PROMOS?|PROMOTIONS?)" +
    "\\.?\\s*(?:n[°o]\\s*)?(?:\\d+|[A-Z]\\b)?" +
    "|" +
    // Forme 2 : mot-groupe + identifiant (numéro ou lettre) obligatoire
    "(?:GROUPES?|GROUPS?|GRP|GPE|GR|SS[-\\s]?GROUPE|SOUS[-\\s]?GROUPE|SECTIONS?|PROMOS?|PROMOTIONS?)" +
    "\\.?\\s*(?:n[°o]\\s*)?(?:\\d+|[A-Z]\\b)" +
    ")" +
    // Séparateur optionnel entre le label et le prof
    "\\s*(?:avec\\b|with\\b|chez\\b|par\\b|by\\b|[:\\-–—=→])?\\s*",
  "i",
);

/**
 * Si le segment commence par un label de type "1ER GROUPE avec", retourne
 * le segment sans ce préfixe. Sinon retourne `null`.
 */
function stripGroupLabel(segment: string): string | null {
  const m = segment.match(GROUP_LABEL_REGEX);
  if (!m || m[0].trim().length === 0) return null;
  return segment.slice(m[0].length).trim();
}

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

    // Retirer l'éventuel préfixe "1ER GROUPE avec" / "Groupe 2 :" etc.
    const withoutGroup = stripGroupLabel(seg) ?? seg;
    // Retirer la/les salle(s) éventuelles et le mot "salle"
    const withoutRooms = withoutGroup.replace(ROOM_REGEX, " ").replace(/\bsalle\b/gi, " ");
    const candidate = cleanProfName(withoutRooms);

    if (isValidProfName(candidate)) return candidate;
  }
  return "";
}

/**
 * Parse un segment type "… salle …" ou "… 30.-1.16 …" et renvoie prof + salle.
 * Le prof et la salle peuvent apparaître dans n'importe quel ordre.
 *
 * Gère également les segments préfixés par un label de groupe,
 * ex: "2ME GROUPE avec Mr AUCHE salle 21.104".
 */
function parseSegment(segment: string): { prof: string; room: string } | null {
  // On retire un éventuel préfixe "1ER GROUPE avec", "GROUPE 2 :", etc.
  const normalized = stripGroupLabel(segment) ?? segment;

  const match = normalized.match(ROOM_REGEX);
  if (!match || match.length === 0) return null;

  const room = match[0]!;
  const profPart = normalized
    .replace(room, " ")
    .replace(/\bsalle\b/gi, " ");
  const prof = cleanProfName(profPart);

  return { prof, room };
}

/**
 * Parse un segment explicitement labellisé "X GROUPE avec <prof>" (sans salle).
 * Typique des cours d'anglais où la salle n'est présente que dans le champ
 * LOCATION de l'ICS.
 *
 * Exemples gérés :
 *  - "2ME GROUPE avec Monsieur JEAN AUCHE"
 *  - "1ER GROUPE avec Mme SARDESAI"
 *  - "Groupe 1 : Mr DUPONT"
 *  - "GROUPE A avec M. MARTIN"
 */
function parseGroupSegment(segment: string): { prof: string; room: string } | null {
  const stripped = stripGroupLabel(segment);
  if (stripped === null) return null;

  // Si aucun texte après le label, on ignore
  if (!stripped) return null;

  const roomMatch = stripped.match(ROOM_REGEX);
  const room = roomMatch ? roomMatch[0]! : "";
  const profPart = stripped
    .replace(ROOM_REGEX, " ")
    .replace(/\bsalle\b/gi, " ");
  const prof = cleanProfName(profPart);

  if (!isValidProfName(prof)) return null;
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

  // 3) Parser chaque segment pour trouver salle + prof.
  //    On essaye d'abord parseSegment (qui gère le préfixe de groupe + salle),
  //    puis parseGroupSegment pour les segments "X GROUPE avec <prof>" SANS salle.
  const parsed: { prof: string; room: string }[] = [];
  for (const seg of segments) {
    const normal = parseSegment(seg);
    if (normal) {
      parsed.push(normal);
      continue;
    }
    const group = parseGroupSegment(seg);
    if (group) parsed.push(group);
  }

  // Helper : construire la liste de salles finale à partir d'un champ LOCATION
  // (utile quand un ou plusieurs segments n'ont pas de salle inline).
  const locationRoom = (() => {
    if (!location) return "";
    const cleaned = location.replace(/^Salle\s*:\s*/i, "").trim();
    if (!cleaned || cleaned === "-") return "";
    return cleaned;
  })();

  // CAS A : au moins 2 segments "prof (+ salle éventuelle)" → demi-groupe direct
  if (parsed.length >= 2) {
    const professors = parsed.map((p) => p.prof).filter(Boolean);
    // Certains segments (ex: "2ME GROUPE avec X") n'ont pas de salle inline.
    // On complète avec la salle LOCATION si elle n'est pas déjà présente.
    let rooms = parsed.map((p) => p.room).filter(Boolean);
    if (locationRoom && !rooms.includes(locationRoom) && rooms.length < parsed.length) {
      rooms.push(locationRoom);
    }
    if (professors.length >= 2) {
      return { professors, rooms };
    }
  }

  // CAS B : 1 seul segment exploité + un second prof dans "Professeur : …"
  //         → la 2e salle vient du champ LOCATION de l'ICS (si présente)
  if (parsed.length === 1) {
    const labelProf = extractProfFromLabel(description);
    const first = parsed[0]!;

    if (labelProf && labelProf.toLowerCase() !== first.prof.toLowerCase()) {
      const room2 =
        locationRoom && locationRoom !== first.room ? locationRoom : "";

      const prof1 = first.prof || extractProfFromMain(description);
      const rooms = [first.room, room2].filter(Boolean);
      const professors = [prof1, labelProf].filter(Boolean);

      if (professors.length >= 2) {
        return { professors, rooms };
      }
    }
  }

  // CAS C (heuristique) : aucun mot-clé "GROUPE" détecté, mais la description
  //  contient ≥ 2 salles distinctes → c'est presque toujours un demi-groupe.
  //  On associe à chaque salle le prof le plus proche dans le texte.
  const heuristic = parseByRoomHeuristic(mainPart);
  if (heuristic) return heuristic;

  return null;
}

/**
 * Heuristique : si la description contient au moins 2 salles distinctes,
 * c'est probablement un demi-groupe. Pour chaque salle on cherche le prof
 * dans une fenêtre de texte autour de la salle (entre la salle précédente
 * et la suivante).
 *
 * Les séparateurs entre profs peuvent être absents, variés ("-", ",", "|",
 * "/", saut de ligne, "et", "&", "with"…) — on tente donc d'abord un split
 * sur le SEGMENT_SEPARATOR, et en dernier recours on prend tout le texte
 * de la fenêtre comme candidat prof.
 */
function parseByRoomHeuristic(mainPart: string): SplitGroupInfo | null {
  const roomRegex = new RegExp(ROOM_REGEX.source, "g");
  const matches = Array.from(mainPart.matchAll(roomRegex));
  if (matches.length < 2) return null;

  const seenRooms = new Set<string>();
  const pairs: { prof: string; room: string }[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const room = m[0];
    if (seenRooms.has(room)) continue;
    seenRooms.add(room);

    // Fenêtre autour de la salle : entre la salle précédente et la suivante
    const prev = matches[i - 1];
    const next = matches[i + 1];
    const start = prev ? prev.index! + prev[0].length : 0;
    const end = next ? next.index! : mainPart.length;

    let window = mainPart.slice(start, end);
    // Retirer la salle + mots-clés de contexte (liaisons, prépositions, adverbes
    // qui n'ont aucune valeur informative pour identifier un prof)
    window = window
      .replace(room, " ")
      .replace(/\bsalles?\b/gi, " ")
      .replace(
        /\b(?:en|chez|avec|with|by|par|dans|puis|ensuite|alors|après|apres|suivi\s+de|then|and|et|&|ou|or|pour|for|à|a)\b/gi,
        " ",
      );

    // Retirer marqueurs de cours et préfixes de groupe
    window = window.replace(COURSE_TYPE_KEYWORDS, " ");
    window = stripGroupLabel(window) ?? window;

    // 1) Stratégie principale : chercher un motif "<titre> <nom>" (Mr DUPONT, Mme MARTIN…)
    //    et ne garder que la PREMIÈRE occurrence. Le lookahead (?!...) empêche
    //    d'avaler un second prof comme suite du premier (ex: "Mr DUPONT Mr DUPONT"
    //    → on capture uniquement "DUPONT").
    let prof = "";
    const titleNameRegex =
      /(?:MMe|Mme|Mr\.?|M\.|Madame|Monsieur|Mlle|Mademoiselle|Dr\.?|Docteur|Pr\.?|Prof\.?|Ms\.?|Mrs\.?|Miss|Sir)\s+([A-ZÀ-Ÿa-zà-ÿ][\w'\-À-ÿ]*(?:\s+(?!MMe\b|Mme\b|Mr\.?\b|M\.\B|Madame\b|Monsieur\b|Mlle\b|Mademoiselle\b|Dr\.?\b|Docteur\b|Pr\.?\b|Prof\.?\b|Ms\.?\b|Mrs\.?\b|Miss\b|Sir\b)[A-ZÀ-Ÿa-zà-ÿ][\w'\-À-ÿ]*){0,3})/;
    const titleMatch = window.match(titleNameRegex);
    if (titleMatch && titleMatch[1]) {
      const candidate = cleanProfName(titleMatch[1]);
      if (isValidProfName(candidate)) prof = candidate;
    }

    // 2) Fallback : split par séparateurs et chercher le meilleur candidat prof
    if (!prof) {
      const candidates = window
        .split(SEGMENT_SEPARATOR)
        .map((s) => {
          const stripped = stripGroupLabel(s) ?? s;
          return cleanProfName(stripped.replace(ROOM_REGEX, " "));
        })
        .filter(isValidProfName);
      prof = candidates[0] ?? "";
    }

    // 3) Dernier recours : nettoyer toute la fenêtre
    if (!prof) {
      const full = cleanProfName(window);
      if (isValidProfName(full)) prof = full;
    }

    if (prof) pairs.push({ prof, room });
  }

  if (pairs.length < 2) return null;

  // On exige au moins 2 profs distincts (sinon ce n'est pas un "vrai" demi-groupe,
  // p.ex. le même prof utilise 2 salles sur le créneau).
  const distinctProfs = new Set(pairs.map((p) => p.prof.toLowerCase()));
  if (distinctProfs.size < 2) return null;

  return {
    professors: pairs.map((p) => p.prof),
    rooms: pairs.map((p) => p.room),
  };
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
 * Extrait les informations non gérées/inconnues de la description.
 * Typiquement des types de cours spéciaux ("Soutenance de projet", etc.)
 */
export function getUnhandledDescriptionInfo(description: string | undefined): string[] {
  if (!description) return [];

  const parts = description.split(/(?:Professeur|Professor)\s*:/i);
  const mainPart = parts[0] ?? "";

  const segments = mainPart
    .split(SEGMENT_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);

  const unhandled: string[] = [];

  for (const seg of segments) {
    if (seg === "?" || seg === "-" || seg === "") continue;

    const withoutGroup = stripGroupLabel(seg) ?? seg;
    const withoutRooms = withoutGroup.replace(ROOM_REGEX, " ").replace(/\bsalle\b/gi, " ");
    const candidateProf = cleanProfName(withoutRooms);

    // Si ça ressemble fortement à un nom de prof, on ignore
    if (isValidProfName(candidateProf)) continue;

    // Si c'est juste une salle, on ignore
    if (!withoutRooms.trim() || withoutRooms.trim() === "?") continue;

    // Ignorer les types de cours standards ou ceux déjà gérés ailleurs (ex: Examen a déjà son propre badge)
    const isStandardCourseType = /^(?:Cours(?:\s*\/\s*Exercices\s*Dirigés)?|Exercices\s*Dirigés|TP|TD|CM|Cours\s+Magistral|Examen|EXAMEN)$/i.test(seg);
    if (isStandardCourseType) continue;

    unhandled.push(seg);
  }

  // Vérifier aussi la partie après "Professeur :" au cas où
  if (parts.length > 1) {
    const afterProf = parts.slice(1).join("Professeur :");
    const afterSegments = afterProf
        .split(SEGMENT_SEPARATOR)
        .map((s) => s.trim())
        .filter(Boolean);

    for (const seg of afterSegments) {
        if (seg === "?" || seg === "-" || seg === "") continue;
        const candidateProf = cleanProfName(seg);
        if (isValidProfName(candidateProf)) continue;
        unhandled.push(seg);
    }
  }

  return unhandled;
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
