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
            if (typeof entry === "string") {
                return entry.replace(/\r/g, "").trim();
            }
            if (entry == null) {
                return "";
            }
            return String(entry).replace(/\r/g, "").trim();
        })
        .filter((entry) => entry.length > 0);
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

