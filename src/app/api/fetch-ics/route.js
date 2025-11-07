// ---- src/app/api/fetch-ics/route.js ----
import {NextResponse} from "next/server";
import ical from "node-ical";
import { createHash } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// Note: Les routes API ne fonctionnent pas avec output: 'export'
// Le dossier API doit être renommé avant le build (voir scripts de build ou package.json)

// Force dynamic rendering pour cette route API
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// URL par défaut (fallback si .env.local n'existe pas)
const DEFAULT_ICS_URL = 'https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics';

function sanitizeText(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim();
}

function sanitizeDescription(value) {
    if (typeof value !== 'string') return '';
    return value
        .replace(/\r?\n/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\n');
}

function normalizeDescriptionForHash(description) {
    return sanitizeDescription(description)
        .split('\n')
        .filter(line => !/^derni[eè]re mise à jour/i.test(line) && !/^updated/i.test(line))
        .join('\n');
}

function toISOStringSafe(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
}

function computeStableUid(rawEvent) {
    const explicitUid = (rawEvent.uid || '').trim();
    if (explicitUid) return explicitUid;
    const startISO = toISOStringSafe(rawEvent.start) || '';
    const summary = sanitizeText(rawEvent.summary || '');
    const location = sanitizeText(rawEvent.location || '');
    const payload = [startISO, summary.toLowerCase(), location.toLowerCase()].join('|');
    return createHash('sha1').update(payload).digest('hex');
}

function buildEventPayload(rawEvent) {
    const uid = computeStableUid(rawEvent);
    const summary = sanitizeText(rawEvent.summary || '');
    const description = sanitizeDescription(rawEvent.description || '');
    const location = sanitizeText(rawEvent.location || '');
    const start = toISOStringSafe(rawEvent.start);
    const end = toISOStringSafe(rawEvent.end);
    return {
        uid,
        summary,
        start,
        end,
        location,
        description
    };
}

function computeEventContentHash(event) {
    const normalized = [
        event.uid || '',
        (event.summary || '').toLowerCase(),
        event.start || '',
        event.end || '',
        (event.location || '').toLowerCase(),
        normalizeDescriptionForHash(event.description || '')
    ].join('\u241F');
    return createHash('sha256').update(normalized).digest('hex');
}

async function loadLatestEventMap(supabase) {
    const MAX_ROWS = 10000;
    try {
        const { data, error } = await supabase
            .from('events_versions')
            .select('uid, version_no, summary, start, end_time, location, description, content_hash')
            .order('uid', { ascending: true })
            .order('version_no', { ascending: false })
            .limit(MAX_ROWS);

        if (error) {
            console.warn('[API fetch-ics] Error loading latest events:', error.message);
            return new Map();
        }

        const map = new Map();
        for (const row of (data || [])) {
            if (!row?.uid || map.has(row.uid)) continue;
            const event = buildEventPayload({
                uid: row.uid,
                summary: row.summary,
                description: row.description,
                location: row.location,
                start: row.start,
                end: row.end_time
            });
            map.set(row.uid, {
                event,
                content_hash: row.content_hash,
                version_no: row.version_no
            });
        }
        return map;
    } catch (err) {
        console.warn('[API fetch-ics] loadLatestEventMap error:', err.message);
        return new Map();
    }
}

// Helper function to fetch events from database (latest version of each UID)
async function fetchEventsFromDB(supabase) {
    try {
        const latestMap = await loadLatestEventMap(supabase);
        return Array.from(latestMap.values()).map(({ event }) => event);
    } catch (e) {
        console.warn('[API fetch-ics] Error in fetchEventsFromDB:', e.message);
        return null;
    }
}

export async function GET() {
    try {
        
        // Utiliser .env.local ou fallback sur l'URL par défaut
        const icsUrl = process.env.ICS_URL || DEFAULT_ICS_URL;
        
        if (!icsUrl) {
            throw new Error("URL ICS non configurée. Créer .env.local avec ICS_URL=...");
        }

        console.log('[API fetch-ics] Fetching from:', icsUrl);
        
        // Gérer le timeout de manière compatible (AbortSignal.timeout peut ne pas exister)
        let controller;
        let signal;
        try {
            // @ts-ignore
            signal = AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined;
        } catch {
            controller = new AbortController();
            signal = controller.signal;
            setTimeout(() => controller.abort(), 10000);
        }

        const res = await fetch(icsUrl, {
            headers: {
                'Accept': 'text/calendar,text/plain,*/*',
            },
            signal
        });
        
        if (!res.ok) {
            throw new Error(`Erreur HTTP ${res.status}: ${res.statusText}`);
        }

        const text = await res.text();
        
        if (!text || text.length === 0) {
            throw new Error("Fichier ICS vide");
        }
        
        console.log('[API fetch-ics] ICS downloaded, length:', text.length);

        // Vérifier le hash du dernier ICS téléchargé (si Supabase disponible)
        let supabase = getSupabaseServerClient();
        let shouldParse = true;
        let cachedEvents = null;

        if (supabase) {
            try {
                const ics_hash = createHash('sha256').update(text).digest('hex');
                
                const { data: lastRows, error: lastErr } = await supabase
                    .from('ics_history')
                    .select('ics_hash')
                    .order('timestamp', { ascending: false })
                    .limit(1);
                
                if (!lastErr && lastRows && lastRows.length > 0) {
                    const lastHash = lastRows[0].ics_hash;
                    
                    if (ics_hash === lastHash) {
                        console.log('[API fetch-ics] ICS hash unchanged, returning cached events from DB');
                        // Hash identique : récupérer depuis la base de données au lieu de parser
                        cachedEvents = await fetchEventsFromDB(supabase);
                        if (cachedEvents && cachedEvents.length > 0) {
                            shouldParse = false;
                        }
                    }
                }
            } catch (checkErr) {
                console.warn('[API fetch-ics] Error checking hash, will parse:', checkErr.message);
            }
        }

        // Si les événements sont en cache et identiques, les retourner sans parser
        if (!shouldParse && cachedEvents) {
            return NextResponse.json({
                events: cachedEvents,
                diff: {
                    added: [],
                    updated: [],
                    removed: []
                },
                meta: {
                    source: 'cache',
                    fromCache: true,
                    changed: 0
                }
            });
        }

        const parsed = ical.sync.parseICS(text);

        const eventMap = new Map();
        for (const value of Object.values(parsed)) {
            if (!value || value.type !== 'VEVENT') continue;
            const payload = buildEventPayload(value);
            if (!payload.uid) continue;

            const existing = eventMap.get(payload.uid);
            if (!existing) {
                eventMap.set(payload.uid, payload);
                continue;
            }

            const existingStart = existing.start ? new Date(existing.start).getTime() : -Infinity;
            const newStart = payload.start ? new Date(payload.start).getTime() : -Infinity;
            if (newStart >= existingStart) {
                eventMap.set(payload.uid, payload);
            }
        }

        const events = Array.from(eventMap.values()).sort((a, b) => {
            const timeA = a.start ? new Date(a.start).getTime() : 0;
            const timeB = b.start ? new Date(b.start).getTime() : 0;
            return timeA - timeB;
        });

        console.log('[API fetch-ics] Events parsed:', events.length);

        let diff = {
            added: [],
            updated: [],
            removed: []
        };

        // Server-side history snapshot (Supabase only)
        // Note: supabase est déjà défini plus haut si disponible
        try {
            if (!supabase) {
                supabase = getSupabaseServerClient();
            }
            if (!supabase) {
                console.warn('[API fetch-ics] Supabase client not available (missing env vars)');
            } else {
                console.log('[API fetch-ics] Supabase client initialized');
                
                // IMPORTANT: Load latest event map BEFORE computing subjects
                // This map is needed for diff computation
                const latestEventMap = await loadLatestEventMap(supabase);
                console.log('[API fetch-ics] Loaded', latestEventMap.size, 'existing events from DB');
                // 1) Global subjects snapshot (as before)
                // Compute subjects list (sorted) and fingerprint
                const subjectsSet = new Set();
                for (const ev of events) {
                    const s = (ev.summary || '').trim();
                    const mat = s.replace(/^(USS|UAS)[A-Z0-9]*\s*:\s*/i, '').trim();
                    if (mat && mat !== ':') subjectsSet.add(mat);
                }
                const subjects = Array.from(subjectsSet).sort((a, b) => a.localeCompare(b));
                const fingerprint = subjects.join('|#|');

                // Hash of raw ICS content
                const ics_hash = createHash('sha256').update(text).digest('hex');

                // Load last snapshot fingerprint
                const { data: lastRows, error: lastErr } = await supabase
                    .from('ics_history')
                    .select('fingerprint, subjects')
                    .order('timestamp', { ascending: false })
                    .limit(1);
                if (lastErr) {
                    console.warn('[API fetch-ics] Supabase select last error:', lastErr.message);
                } else {
                    const last = lastRows && lastRows[0];
                    let added = [];
                    let removed = [];
                    if (last && Array.isArray(last.subjects)) {
                        const prev = new Set(last.subjects);
                        const next = new Set(subjects);
                        for (const s of next) if (!prev.has(s)) added.push(s);
                        for (const s of prev) if (!next.has(s)) removed.push(s);
                        added.sort((a, b) => a.localeCompare(b));
                        removed.sort((a, b) => a.localeCompare(b));
                    }

                    if (!last || last.fingerprint !== fingerprint) {
                        const record = {
                            id: String(Date.now()),
                            timestamp: new Date().toISOString(),
                            total: subjects.length,
                            subjects,
                            added,
                            removed,
                            fingerprint,
                            ics_hash,
                            ics_url: icsUrl
                        };
                        const { error: insErr } = await supabase.from('ics_history').insert(record);
                        if (insErr) {
                            console.warn('[API fetch-ics] Supabase insert error:', insErr.message);
                        } else {
                            console.log('[API fetch-ics] History snapshot inserted');
                        }
                    } else {
                        console.log('[API fetch-ics] No history change (fingerprint unchanged)');
                    }
                }

                // Removed: legacy first-seen insertion into events_first_seen (table deprecated)

                // 2) Per-UID event version tracking (insert new version when fields change)
                try {
                    const inserts = [];
                    const nowISO = new Date().toISOString();
                    const seenUids = new Set();

                    console.log('[API fetch-ics] Computing diffs: comparing', events.length, 'fetched events vs', latestEventMap.size, 'DB events');

                    for (const event of events) {
                        const contentHash = computeEventContentHash(event);
                        const latest = latestEventMap.get(event.uid);
                        seenUids.add(event.uid);

                        if (!latest) {
                            console.log('[API fetch-ics] NEW event:', event.uid, '-', event.summary);
                            diff.added.push(event);
                            inserts.push({
                                uid: event.uid,
                                version_no: 1,
                                changed_at: nowISO,
                                summary: event.summary,
                                start: event.start,
                                end_time: event.end,
                                location: event.location,
                                description: event.description,
                                content_hash: contentHash
                            });
                            continue;
                        }

                        if (latest.content_hash !== contentHash) {
                            console.log('[API fetch-ics] UPDATED event:', event.uid, '-', event.summary, '| old hash:', latest.content_hash.substring(0, 8), '| new hash:', contentHash.substring(0, 8));
                            diff.updated.push({
                                uid: event.uid,
                                before: {
                                    ...latest.event,
                                    version_no: latest.version_no,
                                    content_hash: latest.content_hash
                                },
                                after: event
                            });
                            inserts.push({
                                uid: event.uid,
                                version_no: latest.version_no + 1,
                                changed_at: nowISO,
                                summary: event.summary,
                                start: event.start,
                                end_time: event.end,
                                location: event.location,
                                description: event.description,
                                content_hash: contentHash
                            });
                        } else {
                            // Hash identique, aucun changement
                            // Ne rien faire, ne pas insérer
                        }
                    }

                    for (const [uid, latest] of latestEventMap.entries()) {
                        if (!seenUids.has(uid)) {
                            console.log('[API fetch-ics] REMOVED event:', uid, '-', latest.event.summary);
                            diff.removed.push({
                                uid,
                                ...latest.event,
                                version_no: latest.version_no,
                                content_hash: latest.content_hash
                            });
                        }
                    }

                    console.log('[API fetch-ics] Diff computed:', diff.added.length, 'added,', diff.updated.length, 'updated,', diff.removed.length, 'removed');
                    console.log('[API fetch-ics] Will insert', inserts.length, 'new version(s) in DB');

                    if (inserts.length > 0) {
                        const BATCH_SIZE = 100;
                        for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
                            const batch = inserts.slice(i, i + BATCH_SIZE);
                            const { error: insVerErr } = await supabase.from('events_versions').insert(batch);
                            if (insVerErr) {
                                console.warn('[API fetch-ics] Insert events_versions error:', insVerErr.message, insVerErr.code);
                                break;
                            }
                            console.log(`[API fetch-ics] ${batch.length} event version(s) recorded`);
                        }
                    } else {
                        console.log('[API fetch-ics] No changes detected, no DB writes needed');
                    }
                    
                    // Return immediately after computing diff
                    return NextResponse.json({
                        events,
                        diff,
                        meta: {
                            source: 'parsed',
                            fromCache: false,
                            changed: diff.added.length + diff.updated.length + diff.removed.length
                        }
                    });
                } catch (verErr) {
                    console.warn('[API fetch-ics] Version tracking skipped:', verErr.message);
                    // If diff computation failed, return events without diff
                }

                // 3) Weekly event-level snapshot (disabled)
                /*
                const toMonday = (d) => {
                    const date = new Date(d);
                    const day = date.getDay(); // 0..6 (Sun..Sat)
                    const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
                    date.setHours(0,0,0,0);
                    date.setDate(date.getDate() + diff);
                    date.setHours(0,0,0,0);
                    return new Date(date);
                };
                const weekMap = new Map(); // mondayISO -> { keys:Set, events:[] }
                for (const ev of events) {
                    const start = new Date(ev.start);
                    const monday = toMonday(start);
                    const mondayISO = monday.toISOString().slice(0,10); // YYYY-MM-DD
                    const key = `${new Date(ev.start).toISOString()}|${(ev.summary||'').trim()}|${(ev.location||'').trim()}`;
                    if (!weekMap.has(mondayISO)) weekMap.set(mondayISO, { keys: new Set(), events: [] });
                    const entry = weekMap.get(mondayISO);
                    entry.keys.add(key);
                    entry.events.push({
                        key,
                        summary: (ev.summary||'').trim(),
                        start: new Date(ev.start).toISOString(),
                        end: new Date(ev.end).toISOString(),
                        location: ev.location || '',
                        description: ev.description || ''
                    });
                }

                for (const [mondayISO, data] of weekMap.entries()) {
                    const keys = Array.from(data.keys).sort();
                    const weekFingerprint = keys.join('|@|');

                    const { data: lastWeekRows, error: lastWeekErr } = await supabase
                        .from('ics_week_history')
                        .select('fingerprint, event_keys')
                        .eq('week_monday', mondayISO)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    if (lastWeekErr) {
                        console.warn('[API fetch-ics] Supabase select week error:', mondayISO, lastWeekErr.message);
                        continue;
                    }
                    const last = lastWeekRows && lastWeekRows[0];
                    if (last && last.fingerprint === weekFingerprint) continue; // unchanged

                    let added = [];
                    let removed = [];
                    const prevKeys = new Set(last?.event_keys || []);
                    const nextKeys = new Set(keys);
                    for (const k of nextKeys) if (!prevKeys.has(k)) added.push(k);
                    for (const k of prevKeys) if (!nextKeys.has(k)) removed.push(k);

                    const record = {
                        id: String(Date.now()) + Math.floor(Math.random()*1000),
                        week_monday: mondayISO,
                        fingerprint: weekFingerprint,
                        event_keys: keys,
                        added_keys: added,
                        removed_keys: removed,
                        events: data.events,
                        created_at: new Date().toISOString()
                    };
                    const { error: insWeekErr } = await supabase.from('ics_week_history').insert(record);
                    if (insWeekErr) {
                        console.warn('[API fetch-ics] Supabase insert week error:', mondayISO, insWeekErr.message);
                    }
                }
                */
            }
        } catch (e) {
            console.warn('[API fetch-ics] History snapshot write skipped:', e.message);
        }

        return NextResponse.json({
            events,
            diff,
            meta: {
                source: 'parsed',
                fromCache: false,
                changed: diff.added.length + diff.updated.length + diff.removed.length
            }
        });
    } catch (err) {
        console.error('[API fetch-ics] Error:', err.message);
        return NextResponse.json({
            error: err.message,
            details: err.cause?.message || 'Vérifier la connexion réseau et l\'URL ICS'
        }, {status: 500});
    }
}

// Répondre aux requêtes HEAD pour les checks de connectivité
export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}