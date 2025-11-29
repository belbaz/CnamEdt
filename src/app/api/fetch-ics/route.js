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
    // ⚠️ NE JAMAIS utiliser l'UID du fichier ICS car il peut changer à chaque génération
    // (timestamps, UUIDs dynamiques générés par le serveur, etc.)
    // 
    // ✅ TOUJOURS calculer un UID stable basé sur le contenu immuable :
    // - Date de début (identifie le créneau)
    // - Titre du cours (identifie la matière)
    // - Lieu (identifie la salle)
    // 
    // Ces 3 champs ensemble forment un identifiant unique et stable pour un cours
    
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
    // Normaliser les dates pour éviter les différences de format (millisecondes, etc.)
    const normalizeDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            // Utiliser le timestamp en millisecondes pour éviter les problèmes de format
            return date.getTime().toString();
        } catch {
            return '';
        }
    };
    
    const normalized = [
        event.uid || '',
        (event.summary || '').toLowerCase(),
        normalizeDate(event.start),
        normalizeDate(event.end),
        (event.location || '').toLowerCase(),
        normalizeDescriptionForHash(event.description || '')
    ].join('\u241F');
    return createHash('sha256').update(normalized).digest('hex');
}

// Fonction pour comparer deux événements et retourner les champs qui ont changé
function compareEvents(oldEvent, newEvent) {
    const changes = [];
    
    // Normaliser les dates pour la comparaison
    const normalizeDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.getTime().toString();
        } catch {
            return '';
        }
    };
    
    // Comparer UID
    if ((oldEvent.uid || '') !== (newEvent.uid || '')) {
        changes.push(`uid: "${oldEvent.uid}" → "${newEvent.uid}"`);
    }
    
    // Comparer summary
    if ((oldEvent.summary || '').toLowerCase() !== (newEvent.summary || '').toLowerCase()) {
        changes.push(`summary: "${oldEvent.summary}" → "${newEvent.summary}"`);
    }
    
    // Comparer dates
    const oldStart = normalizeDate(oldEvent.start);
    const newStart = normalizeDate(newEvent.start);
    if (oldStart !== newStart) {
        changes.push(`start: ${oldEvent.start} → ${newEvent.start}`);
    }
    
    const oldEnd = normalizeDate(oldEvent.end);
    const newEnd = normalizeDate(newEvent.end);
    if (oldEnd !== newEnd) {
        changes.push(`end: ${oldEvent.end} → ${newEvent.end}`);
    }
    
    // Comparer location
    if ((oldEvent.location || '').toLowerCase() !== (newEvent.location || '').toLowerCase()) {
        changes.push(`location: "${oldEvent.location}" → "${newEvent.location}"`);
    }
    
    // Comparer description
    const oldDesc = normalizeDescriptionForHash(oldEvent.description || '');
    const newDesc = normalizeDescriptionForHash(newEvent.description || '');
    if (oldDesc !== newDesc) {
        changes.push(`description: [${oldDesc.length} chars] → [${newDesc.length} chars]`);
    }
    
    return changes;
}

/**
 * Migre automatiquement les notes orphelines vers le nouveau course_uid
 * si seule la salle (location) a changé.
 * 
 * Règles de migration :
 * - Même date/heure de début (start)
 * - Même titre (summary) - normalisé
 * - Salle différente (location)
 * 
 * Si le titre ou la date change, la note n'est PAS migrée (considérée invalide).
 */
async function migrateOrphanNotes(supabase, currentEvents) {
    try {
        // Créer un Map des events actuels par (date+summary) pour recherche rapide
        const eventsByDateAndTitle = new Map();
        const currentUids = new Set();
        
        for (const event of currentEvents) {
            if (!event.start || !event.summary) continue;
            
            const startISO = toISOStringSafe(event.start);
            const summaryNormalized = sanitizeText(event.summary).toLowerCase();
            const key = `${startISO}|${summaryNormalized}`;
            
            if (!eventsByDateAndTitle.has(key)) {
                eventsByDateAndTitle.set(key, []);
            }
            eventsByDateAndTitle.get(key).push(event);
            currentUids.add(event.uid);
        }
        
        // Récupérer toutes les notes de l'agenda
        const { data: allNotes, error: notesError } = await supabase
            .from('edt_agenda')
            .select('id, course_uid, user_id, notes, created_at, updated_at, labels, entry_labels, modification_history');
        
        if (notesError) {
            console.warn('[API fetch-ics] Erreur récupération notes pour migration:', notesError.message);
            return;
        }
        
        if (!allNotes || allNotes.length === 0) {
            return; // Aucune note à migrer
        }
        
        // Identifier les notes orphelines (course_uid qui n'existe plus dans les events actuels)
        const orphanNotes = allNotes.filter(note => 
            note.course_uid && !currentUids.has(note.course_uid)
        );
        
        if (orphanNotes.length === 0) {
            return; // Aucune note orpheline
        }
        
        console.log(`[API fetch-ics] Migration: ${orphanNotes.length} note(s) orpheline(s) détectée(s)`);
        
        // Récupérer les anciennes versions des cours pour comparer
        const orphanUids = orphanNotes.map(n => n.course_uid);
        const { data: oldEvents, error: oldEventsError } = await supabase
            .from('events_versions')
            .select('uid, summary, start, location')
            .in('uid', orphanUids)
            .order('version_no', { ascending: false });
        
        if (oldEventsError) {
            console.warn('[API fetch-ics] Erreur récupération anciens events pour migration:', oldEventsError.message);
            return;
        }
        
        // Créer un Map des anciens events par uid
        const oldEventsMap = new Map();
        for (const oldEvent of oldEvents || []) {
            if (!oldEventsMap.has(oldEvent.uid)) {
                oldEventsMap.set(oldEvent.uid, oldEvent);
            }
        }
        
        let migratedCount = 0;
        let skippedCount = 0;
        
        // Pour chaque note orpheline, chercher un event correspondant
        for (const note of orphanNotes) {
            const oldEvent = oldEventsMap.get(note.course_uid);
            if (!oldEvent || !oldEvent.start || !oldEvent.summary) {
                skippedCount++;
                continue; // Pas d'info sur l'ancien event, on ne peut pas migrer
            }
            
            const oldStartISO = toISOStringSafe(oldEvent.start);
            const oldSummaryNormalized = sanitizeText(oldEvent.summary).toLowerCase();
            const oldLocationNormalized = sanitizeText(oldEvent.location || '').toLowerCase();
            
            // Chercher un event avec même date/heure et même titre
            const searchKey = `${oldStartISO}|${oldSummaryNormalized}`;
            const candidates = eventsByDateAndTitle.get(searchKey) || [];
            
            // Filtrer pour trouver un event avec une salle différente
            const matchingEvent = candidates.find(event => {
                const newLocationNormalized = sanitizeText(event.location || '').toLowerCase();
                // Même date/heure + même titre + salle différente = migration possible
                return newLocationNormalized !== oldLocationNormalized;
            });
            
            if (matchingEvent) {
                // Migration possible : seule la salle a changé
                const newCourseUid = matchingEvent.uid;
                
                // Vérifier qu'il n'existe pas déjà une note pour ce nouveau course_uid et cet utilisateur
                const { data: existingNote, error: checkError } = await supabase
                    .from('edt_agenda')
                    .select('id')
                    .eq('user_id', note.user_id)
                    .eq('course_uid', newCourseUid)
                    .maybeSingle();
                
                if (checkError) {
                    console.warn(`[API fetch-ics] Erreur vérification note existante pour migration (user: ${note.user_id}, new_uid: ${newCourseUid}):`, checkError.message);
                    skippedCount++;
                    continue;
                }
                
                if (existingNote) {
                    // Une note existe déjà pour ce nouveau course_uid
                    // On supprime l'ancienne note orpheline
                    const { error: deleteError } = await supabase
                        .from('edt_agenda')
                        .delete()
                        .eq('id', note.id);
                    
                    if (deleteError) {
                        console.warn(`[API fetch-ics] Erreur suppression note orpheline (id: ${note.id}):`, deleteError.message);
                    } else {
                        console.log(`[API fetch-ics] Migration: Note orpheline supprimée (id: ${note.id}, old_uid: ${note.course_uid}) - note existe déjà pour new_uid: ${newCourseUid}`);
                        migratedCount++;
                    }
                } else {
                    // Migrer la note vers le nouveau course_uid
                    const { error: updateError } = await supabase
                        .from('edt_agenda')
                        .update({ course_uid: newCourseUid })
                        .eq('id', note.id);
                    
                    if (updateError) {
                        console.warn(`[API fetch-ics] Erreur migration note (id: ${note.id}, old_uid: ${note.course_uid} → new_uid: ${newCourseUid}):`, updateError.message);
                        skippedCount++;
                    } else {
                        console.log(`[API fetch-ics] Migration: Note migrée (id: ${note.id}, old_uid: ${note.course_uid} → new_uid: ${newCourseUid}, salle: "${oldEvent.location}" → "${matchingEvent.location}")`);
                        migratedCount++;
                    }
                }
            } else {
                // Pas de correspondance : le titre ou la date a changé, la note n'est plus valide
                skippedCount++;
            }
        }
        
        if (migratedCount > 0 || skippedCount > 0) {
            console.log(`[API fetch-ics] Migration terminée: ${migratedCount} migrée(s), ${skippedCount} ignorée(s) (titre/date changé ou pas de correspondance)`);
        }
    } catch (error) {
        console.error('[API fetch-ics] Erreur lors de la migration des notes:', error);
        throw error;
    }
}

async function loadLatestEventMap(supabase) {
    try {
        // Récupérer TOUS les événements avec pagination si nécessaire
        // Supabase a une limite par défaut, donc on utilise une limite élevée
        const LIMIT = 10000; // Limite suffisamment élevée pour tous les événements
        
        const { data, error } = await supabase
            .from('events_versions')
            .select('uid, version_no, summary, start, end_time, location, description, content_hash')
            .order('uid', { ascending: true })
            .order('version_no', { ascending: false })
            .limit(LIMIT);

        if (error) {
            console.warn('[API fetch-ics] Error loading latest events:', error.message);
            return new Map();
        }

        if (!data || data.length === 0) {
            console.log('[API fetch-ics] No existing events in DB (first sync)');
            return new Map();
        }

        // Filtrer pour ne garder que la dernière version de chaque UID
        const map = new Map();
        for (const row of data) {
            if (!row?.uid) continue;
            
            // Si cet UID n'est pas encore dans la map, l'ajouter
            // (comme les données sont triées par uid puis version_no DESC, la première occurrence est la plus récente)
            if (!map.has(row.uid)) {
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
        }
        
        console.log('[API fetch-ics] Loaded', map.size, 'unique events (latest versions) from', data.length, 'total rows');
        
        if (data.length >= LIMIT) {
            console.warn('[API fetch-ics] WARNING: Retrieved maximum rows (', LIMIT, '), some events may be missing!');
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

function buildDatabasePayload(events, metaOverrides = {}) {
    return {
        events,
        diff: {
            added: [],
            updated: [],
            removed: []
        },
        meta: {
            source: 'database',
            fromCache: true,
            changed: 0,
            ...metaOverrides
        }
    };
}

/**
 * Récupère les événements depuis Supabase avec un timeout
 */
async function fetchEventsFromDBWithTimeout(supabase, timeoutMs = 15000) {
    return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Supabase timeout'));
        }, timeoutMs);

        try {
            const events = await fetchEventsFromDB(supabase);
            clearTimeout(timeoutId);
            resolve(events);
        } catch (err) {
            clearTimeout(timeoutId);
            reject(err);
        }
    });
}

export async function GET(request) {
    let supabaseClient = null;
    let icsError = null;
    const TIMEOUT_MS = 15000; // 15 secondes
    
    try {
        supabaseClient = getSupabaseServerClient();
        
        // Utiliser .env.local ou fallback sur l'URL par défaut
        // Note: ICS_URL pour le serveur, NEXT_PUBLIC_ICS_URL pour le client
        const icsUrl = process.env.ICS_URL || process.env.NEXT_PUBLIC_ICS_URL;
        
        if (!icsUrl) {
            throw new Error("URL ICS non configurée. Créer .env.local avec ICS_URL=...");
        }

        console.log('[API fetch-ics] Fetching from:', icsUrl);
        
        // Gérer le timeout de manière compatible (AbortSignal.timeout peut ne pas exister)
        let controller;
        let signal;
        try {
            // @ts-ignore
            signal = AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
        } catch {
            controller = new AbortController();
            signal = controller.signal;
            setTimeout(() => controller.abort(), TIMEOUT_MS);
        }

        try {
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
            let shouldParse = true;
            let cachedEvents = null;

            if (supabaseClient) {
                try {
                    const ics_hash = createHash('sha256').update(text).digest('hex');
                    
                    const { data: lastRows, error: lastErr } = await supabaseClient
                        .from('ics_history')
                        .select('ics_hash')
                        .order('timestamp', { ascending: false })
                        .limit(1);
                    
                    if (!lastErr && lastRows && lastRows.length > 0) {
                        const lastHash = lastRows[0].ics_hash;
                        
                        if (ics_hash === lastHash) {
                            console.log('[API fetch-ics] ICS hash unchanged, returning cached events from DB');
                            // Hash identique : récupérer depuis la base de données au lieu de parser
                            cachedEvents = await fetchEventsFromDB(supabaseClient);
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
                return NextResponse.json(buildDatabasePayload(cachedEvents, {
                    source: 'cache',
                    fromCache: true
                }));
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
            
            // Si aucun événement n'a été parsé, considérer comme une erreur et utiliser Supabase
            if (events.length === 0) {
                throw new Error("Fichier ICS valide mais aucun événement trouvé (fichier vide ou invalide)");
            }

            let diff = {
                added: [],
                updated: [],
                removed: []
            };

            // Server-side history snapshot (Supabase only)
            // Note: supabase est déjà défini plus haut si disponible
            try {
                if (!supabaseClient) {
                    supabaseClient = getSupabaseServerClient();
                }
                if (!supabaseClient) {
                    console.warn('[API fetch-ics] Supabase client not available (missing env vars)');
                } else {
                    console.log('[API fetch-ics] Supabase client initialized');
                    
                    // IMPORTANT: Load latest event map BEFORE computing subjects
                    // This map is needed for diff computation
                    const latestEventMap = await loadLatestEventMap(supabaseClient);
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
                    const { data: lastRows, error: lastErr } = await supabaseClient
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
                            const { error: insErr } = await supabaseClient.from('ics_history').insert(record);
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
                                // Nouvel événement jamais vu
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

                            // Comparer les hashs de contenu
                            if (latest.content_hash !== contentHash) {
                                // Le contenu a changé, créer une nouvelle version
                                const changedFields = compareEvents(latest.event, event);
                                console.log('[API fetch-ics] UPDATED event:', event.uid, '-', event.summary);
                                console.log('  → Hash: old:', latest.content_hash.substring(0, 8), '| new:', contentHash.substring(0, 8));
                                console.log('  → Changed fields:', changedFields.length > 0 ? changedFields.join(', ') : 'NONE (hash mismatch without field changes - BUG!)');
                                
                                diff.updated.push({
                                    uid: event.uid,
                                    before: {
                                        ...latest.event,
                                        version_no: latest.version_no,
                                        content_hash: latest.content_hash
                                    },
                                    after: event,
                                    changedFields // Ajouter les champs modifiés au diff
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
                                // Hash identique = aucun changement, ne rien insérer
                                // console.log('[API fetch-ics] UNCHANGED event:', event.uid, '-', event.summary);
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
                                const { error: insVerErr } = await supabaseClient.from('events_versions').insert(batch);
                                if (insVerErr) {
                                    console.warn('[API fetch-ics] Insert events_versions error:', insVerErr.message, insVerErr.code);
                                    break;
                                }
                                console.log(`[API fetch-ics] ${batch.length} event version(s) recorded`);
                            }
                        } else {
                            console.log('[API fetch-ics] No changes detected, no DB writes needed');
                        }
                        
                        // 4) Migration automatique des notes orphelines (si seule la salle a changé)
                        try {
                            await migrateOrphanNotes(supabaseClient, events);
                        } catch (migErr) {
                            console.warn('[API fetch-ics] Note migration skipped:', migErr.message);
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

                    const { data: lastWeekRows, error: lastWeekErr } = await supabaseClient
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
                    const { error: insWeekErr } = await supabaseClient.from('ics_week_history').insert(record);
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
        } catch (icsErr) {
            // Erreur lors du fetch/parse ICS - sauvegarder pour affichage
            icsError = icsErr;
            console.error('[API fetch-ics] ICS error:', icsErr.message);
            
            // Essayer Supabase en fallback
            if (supabaseClient) {
                try {
                    console.log('[API fetch-ics] Attempting Supabase fallback...');
                    const fallbackEvents = await fetchEventsFromDBWithTimeout(supabaseClient, TIMEOUT_MS);
                    if (fallbackEvents && fallbackEvents.length > 0) {
                        console.warn('[API fetch-ics] Fallback: serving events from Supabase cache');
                        const payload = buildDatabasePayload(fallbackEvents, {
                            source: 'database-fallback',
                            reason: icsErr.message
                        });
                        console.log('[API fetch-ics] Fallback payload meta:', payload.meta);
                        return NextResponse.json(payload);
                    }
                } catch (supabaseErr) {
                    console.error('[API fetch-ics] Supabase fallback failed:', supabaseErr.message);
                    // Les deux ont échoué - retourner erreur spécifique
                    return NextResponse.json({
                        error: "Galao indisponible et Supabase indisponible",
                        details: "Aucune donnée à afficher. Contacter l'administrateur !",
                        icsError: icsErr.message,
                        supabaseError: supabaseErr.message
                    }, {status: 503});
                }
            }
            
            // Si pas de Supabase disponible, retourner erreur ICS
            return NextResponse.json({
                error: "Galao indisponible",
                details: icsErr.message || 'Impossible de récupérer le fichier ICS',
                icsError: icsErr.message
            }, {status: 503});
        }
    } catch (err) {
        // Erreur générale (configuration, etc.)
        console.error('[API fetch-ics] General error:', err.message);
        return NextResponse.json({
            error: err.message,
            details: err.cause?.message || 'Vérifier la configuration'
        }, {status: 500});
    }
}

// Répondre aux requêtes HEAD pour les checks de connectivité
export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}