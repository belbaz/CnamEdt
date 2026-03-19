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

/**
 * Construit la paire (entries, entry_labels) prête à être persistée.
 * - Supprime les entrées sans texte ET sans label.
 * - Conserve les entrées avec label mais sans texte en utilisant un placeholder invisible.
 * - Recompacte les index et recalcule entry_labels pour rester aligné avec entries.
 */
export function buildPersistableNotesAndLabels(rawEntries = [], rawEntryLabels = {}) {
    const entries = Array.isArray(rawEntries) ? rawEntries : [];
    const entryLabels = rawEntryLabels && typeof rawEntryLabels === "object" ? rawEntryLabels : {};

    const labelIndexes = Object.keys(entryLabels)
        .map((k) => parseInt(k, 10))
        .filter((n) => !Number.isNaN(n) && n >= 0);

    const maxIndex = Math.max(entries.length - 1, labelIndexes.length > 0 ? Math.max(...labelIndexes) : -1);

    if (maxIndex < 0) {
        return { entries: [], labels: {} };
    }

    const resultEntries = [];
    const resultLabels = {};
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

        // Rien à conserver pour cet index
        if (!text && !hasLabels) {
            continue;
        }

        // Si seulement des labels, utiliser le placeholder invisible
        if (!text && hasLabels) {
            text = HIDDEN_LABEL_PLACEHOLDER;
        }

        resultEntries.push(text);

        if (hasLabels) {
            resultLabels[String(nextIndex)] = labelsForOldIndex;
        }

        nextIndex++;
    }

    return { entries: resultEntries, labels: resultLabels };
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


