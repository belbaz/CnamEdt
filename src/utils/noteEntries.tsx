// @ts-nocheck
/**
 * Nettoie un tableau de notes en supprimant les entrées vides
 * et en normalisant les retours chariot.
 */
export function sanitizeNoteEntries(entries = []) {
    if (!Array.isArray(entries)) {
        return [];
    }

    return entries
        .map((entry) => {
            // Conserver le placeholder tel quel (entrée "vide" mais avec labels)
            if (entry === HIDDEN_LABEL_PLACEHOLDER) {
                return HIDDEN_LABEL_PLACEHOLDER;
            }
            if (typeof entry === "string") {
                return entry.replace(/\r/g, "").trim();
            }
            if (entry == null) {
                return "";
            }
            return String(entry).replace(/\r/g, "").trim();
        })
        .filter((entry) => entry === HIDDEN_LABEL_PLACEHOLDER || entry.length > 0);
}

/**
 * Convertit la valeur stockée (texte ou JSON array) en tableau de notes.
 */
export function parseStoredNoteValue(rawValue) {
    if (!rawValue) {
        return [];
    }

    if (Array.isArray(rawValue)) {
        return sanitizeNoteEntries(rawValue);
    }

    if (typeof rawValue === "string") {
        const trimmed = rawValue.trim();
        if (!trimmed) {
            return [];
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return sanitizeNoteEntries(parsed);
            }
        } catch (_err) {
            // Ignorer : la valeur n'est pas un JSON valide, on retombe sur le fallback
        }

        return sanitizeNoteEntries([rawValue]);
    }

    return sanitizeNoteEntries([String(rawValue)]);
}

/**
 * Normalise les notes envoyées dans l'API (string ou tableau côté client).
 */
export function normalizeIncomingNotes(value) {
    if (Array.isArray(value)) {
        return sanitizeNoteEntries(value);
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return sanitizeNoteEntries(parsed);
            }
        } catch (_err) {
            // Ignorer et traiter comme une note unique
        }

        return sanitizeNoteEntries([value]);
    }

    return [];
}

/**
 * Compare deux listes de notes (après nettoyage).
 */
export function areNoteEntriesEqual(a = [], b = []) {
    const left = sanitizeNoteEntries(Array.isArray(a) ? a : []);
    const right = sanitizeNoteEntries(Array.isArray(b) ? b : []);

    if (left.length !== right.length) {
        return false;
    }

    return left.every((entry, index) => entry === right[index]);
}

// Placeholder invisible pour représenter une note "vide" mais avec des labels
// Utilisé pour stocker les entrées qui n'ont pas de texte mais ont des labels associés.
export const HIDDEN_LABEL_PLACEHOLDER = "\u200B";

/** Par défaut, une entrée est visible par tous. */
export const NOTE_PRIVACY_PUBLIC = "public";
/** Note visible uniquement par l'utilisateur auteur (côté serveur + client connecté). */
export const NOTE_PRIVACY_PERSONAL = "personal";

/**
 * La ligne agenda contient au moins une entrée marquée personnelle (données non stripées).
 */
export function agendaRowHasPersonalEntries(row) {
    if (!row?.entry_privacy || typeof row.entry_privacy !== "object") {
        return false;
    }
    return Object.values(row.entry_privacy).some((v) => v === NOTE_PRIVACY_PERSONAL);
}

/**
 * Contenu réellement affichable pour les invités / l’onglet « public »
 * (texte non vide ou labels), après retrait éventuel des entrées personnelles.
 */
export function agendaRowHasPublicDisplayContent(row) {
    if (!row) return false;
    const entries = Array.isArray(row.entries)
        ? row.entries
        : parseStoredNoteValue(row.notes);
    const sanitized = sanitizeNoteEntries(entries);
    if (sanitized.length > 0) {
        return true;
    }
    const entryLabels =
        row.entry_labels && typeof row.entry_labels === "object" ? row.entry_labels : {};
    return Object.values(entryLabels).some(
        (labelsArray) => Array.isArray(labelsArray) && labelsArray.length > 0
    );
}

/**
 * Interprète entry_privacy (JSONB / API) : objet, chaîne JSON, ou null.
 * Certaines chaines (PostgREST) renvoient parfois une string au lieu d'un objet.
 */
export function parseEntryPrivacyFromDb(raw) {
    if (raw == null) {
        return {};
    }
    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) {
            return {};
        }
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return pickPersonalPrivacyKeys(parsed);
            }
        } catch {
            return {};
        }
        return {};
    }
    if (typeof raw === "object" && !Array.isArray(raw)) {
        return pickPersonalPrivacyKeys(raw);
    }
    return {};
}

function pickPersonalPrivacyKeys(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === NOTE_PRIVACY_PERSONAL) {
            out[String(k)] = NOTE_PRIVACY_PERSONAL;
        }
    }
    return out;
}

/**
 * Reindexe un objet { "0": v, "1": w } quand l'entrée `removedIndex` est supprimée.
 */
export function reindexEntryKeyedState(state, removedIndex) {
    const prev = state && typeof state === "object" ? state : {};
    const next = {};
    for (const [k, v] of Object.entries(prev)) {
        const i = parseInt(k, 10);
        if (Number.isNaN(i) || i < 0) continue;
        if (i === removedIndex) continue;
        const newI = i > removedIndex ? i - 1 : i;
        next[String(newI)] = v;
    }
    return next;
}

/**
 * Construit entries + entry_labels + entry_privacy prête à être persistée.
 * - On ne stocke dans privacy que les index en NOTE_PRIVACY_PERSONAL (absent = public).
 */
export function buildPersistableNotesLabelsAndPrivacy(
    rawEntries = [],
    rawEntryLabels = {},
    rawEntryPrivacy = {}
) {
    const entries = Array.isArray(rawEntries) ? rawEntries : [];
    const entryLabels = rawEntryLabels && typeof rawEntryLabels === "object" ? rawEntryLabels : {};
    const entryPrivacy = rawEntryPrivacy && typeof rawEntryPrivacy === "object" ? rawEntryPrivacy : {};

    const labelIndexes = Object.keys(entryLabels)
        .map((k) => parseInt(k, 10))
        .filter((n) => !Number.isNaN(n) && n >= 0);
    const privacyIndexes = Object.keys(entryPrivacy)
        .map((k) => parseInt(k, 10))
        .filter((n) => !Number.isNaN(n) && n >= 0);
    const maxIndex = Math.max(
        entries.length - 1,
        labelIndexes.length > 0 ? Math.max(...labelIndexes) : -1,
        privacyIndexes.length > 0 ? Math.max(...privacyIndexes) : -1
    );

    if (maxIndex < 0) {
        return { entries: [], labels: {}, privacy: {} };
    }

    const resultEntries = [];
    const resultLabels = {};
    const resultPrivacy = {};
    let nextIndex = 0;

    for (let i = 0; i <= maxIndex; i++) {
        const raw = entries[i] ?? "";
        let text = typeof raw === "string"
            ? raw.replace(/\r/g, "").trim()
            : String(raw ?? "").replace(/\r/g, "").trim();

        const labelsForOldIndex = Array.isArray(entryLabels[String(i)])
            ? entryLabels[String(i)].filter((label) => typeof label === "string" && label.trim().length > 0)
            : [];

        const hasLabels = labelsForOldIndex.length > 0;

        if (!text && !hasLabels) {
            continue;
        }

        if (!text && hasLabels) {
            text = HIDDEN_LABEL_PLACEHOLDER;
        }

        resultEntries.push(text);

        if (hasLabels) {
            resultLabels[String(nextIndex)] = labelsForOldIndex;
        }

        const pRaw = entryPrivacy[String(i)];
        if (pRaw === NOTE_PRIVACY_PERSONAL) {
            resultPrivacy[String(nextIndex)] = NOTE_PRIVACY_PERSONAL;
        }

        nextIndex++;
    }

    return { entries: resultEntries, labels: resultLabels, privacy: resultPrivacy };
}

/**
 * Construit la paire (entries, entry_labels) prête à être persistée.
 * @deprecated Préférer buildPersistableNotesLabelsAndPrivacy si la confidentialité par entrée est utilisée.
 */
export function buildPersistableNotesAndLabels(rawEntries = [], rawEntryLabels = {}) {
    const { entries, labels } = buildPersistableNotesLabelsAndPrivacy(
        rawEntries,
        rawEntryLabels,
        {}
    );
    return { entries, labels: labels };
}

/**
 * Retire les entrées personnelles d'une note déjà formatée (API GET pour utilisateurs non authentifiés / mode public).
 */
export function stripPersonalEntriesFromAgendaRow(row) {
    if (!row) return row;

    const entries = Array.isArray(row.entries)
        ? row.entries
        : parseStoredNoteValue(row.notes);
    const privacy = parseEntryPrivacyFromDb(row.entry_privacy);
    const entryLabels = row.entry_labels && typeof row.entry_labels === "object" ? row.entry_labels : {};

    const keep = [];
    for (let i = 0; i < entries.length; i++) {
        if ((privacy[String(i)] || NOTE_PRIVACY_PUBLIC) !== NOTE_PRIVACY_PERSONAL) {
            keep.push(i);
        }
    }

    if (keep.length === entries.length) {
        return {
            ...row,
            entry_privacy: { ...privacy },
        };
    }

    const newEntries = keep.map((i) => entries[i]);
    const newLabels = {};
    const newPrivacy = {};
    keep.forEach((oldIdx, j) => {
        if (Array.isArray(entryLabels[String(oldIdx)]) && entryLabels[String(oldIdx)].length > 0) {
            newLabels[String(j)] = entryLabels[String(oldIdx)];
        }
        const p = privacy[String(oldIdx)] || NOTE_PRIVACY_PUBLIC;
        if (p === NOTE_PRIVACY_PERSONAL) {
            newPrivacy[String(j)] = NOTE_PRIVACY_PERSONAL;
        }
    });

    return {
        ...row,
        entries: newEntries,
        notes: JSON.stringify(newEntries),
        entry_labels: newLabels,
        entry_privacy: newPrivacy,
    };
}

/**
 * Génère un résumé court pour affichage (badge / tooltip).
 */
export function buildNotePreview(entries = [], maxEntries = 2) {
    const sanitized = sanitizeNoteEntries(entries);
    if (sanitized.length === 0) {
        return "";
    }

    const limit = Math.max(1, maxEntries);
    const selected = sanitized.slice(0, limit);
    let preview = selected.join(" • ");
    const remaining = sanitized.length - selected.length;
    if (remaining > 0) {
        preview += ` (+${remaining} autre${remaining > 1 ? "s" : ""})`;
    }
    return preview;
}


