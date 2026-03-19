// @ts-nocheck
// Simple local history storage using localStorage
// Each snapshot: { id, timestamp, subjects, added, removed, total }

const STORAGE_KEY = "cnam_edt.history.snapshots";

function safeParse(json, fallback) {
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
}

export function loadHistory() {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = safeParse(raw, []);
    return Array.isArray(list) ? list : [];
}

export function saveHistory(historyList) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(historyList));
}

export function extractSubjectsFromEvents(events) {
    const subjectsSet = new Set();
    events.forEach(ev => {
        const summary = ev.summary?.trim() || "";
        let matiere = summary.replace(/^(USS|UAS)[A-Z0-9]*\s*:\s*/i, "").trim();
        if (matiere && matiere !== ":") subjectsSet.add(matiere);
    });
    return Array.from(subjectsSet).sort((a, b) => a.localeCompare(b));
}

export function fingerprintSubjects(subjects) {
    // Align with server: use the raw joined string as fingerprint
    // This keeps client/server dedup logic consistent.
    return subjects.join("|#|");
}

export function diffSubjects(prevSubjects, nextSubjects) {
    const prev = new Set(prevSubjects || []);
    const next = new Set(nextSubjects || []);
    const added = [];
    const removed = [];
    for (const s of next) if (!prev.has(s)) added.push(s);
    for (const s of prev) if (!next.has(s)) removed.push(s);
    added.sort((a, b) => a.localeCompare(b));
    removed.sort((a, b) => a.localeCompare(b));
    return { added, removed };
}

export async function saveSnapshotIfChanged(events, options = {}) {
    if (typeof window === "undefined") return null;
    const { skip = false } = options;
    if (skip) return null;

    const subjects = extractSubjectsFromEvents(events);
    const fp = fingerprintSubjects(subjects);
    const history = loadHistory();
    const last = history[history.length - 1];
    if (last && last.fingerprint === fp) {
        return null;
    }
    const { added, removed } = diffSubjects(last?.subjects || [], subjects);
    const snapshot = {
        id: `${Date.now()}`,
        timestamp: new Date().toISOString(),
        total: subjects.length,
        added,
        removed,
        subjects,
        fingerprint: fp
    };

    // Server persistence disabled (handled in /api/fetch-ics). Keep a local copy for UI fallback only.

    // Always keep a local copy as well (acts as client cache)
    const nextHistory = [...history, snapshot];
    saveHistory(nextHistory);
    return snapshot;
}



