// @ts-nocheck
// ---- src/app/api/fetch-ics/route.js ----
import {NextResponse} from "next/server";
import ical from "node-ical";
import { createHash } from "crypto";
import https from "https";
import http from "http";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { parseStoredNoteValue, normalizeIncomingNotes } from "@/utils/noteEntries";

// Note: Les routes API ne fonctionnent pas avec output: 'export'
// Le dossier API doit être renommé avant le build (voir scripts de build ou package.json)

// Force dynamic rendering pour cette route API
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Fetch une URL en ignorant les erreurs de certificat SSL
 * Supporte HTTP et HTTPS (même avec certificat expiré/invalide)
 */
function fetchInsecure(url, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const lib = isHttps ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'Accept': 'text/calendar,text/plain,*/*',
                'User-Agent': 'EDT-CNAM/1.0'
            },
            timeout: timeoutMs,
            // Ignorer les erreurs de certificat SSL (certificat expiré, auto-signé, etc.)
            rejectUnauthorized: false
        };
        
        const req = lib.request(options, (res) => {
            // Gérer les redirections (301, 302, 307, 308)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log(`[API fetch-ics] Redirection ${res.statusCode} vers:`, res.headers.location);
                // Résoudre l'URL relative si nécessaire
                const redirectUrl = new URL(res.headers.location, url).toString();
                fetchInsecure(redirectUrl, timeoutMs).then(resolve).catch(reject);
                return;
            }
            
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    statusText: res.statusMessage || '',
                    text: () => Promise.resolve(data),
                    headers: res.headers
                });
            });
        });
        
        req.on('error', (err) => {
            console.error('[API fetch-ics] Erreur requête:', err.message);
            reject(err);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout après ${timeoutMs}ms`));
        });
        
        req.end();
    });
}

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
 * Archive une note dans la table d'archive avant suppression/fusion
 * Retourne true si l'archivage a réussi, false sinon (ne bloque pas le processus)
 */
async function archiveNote(supabase, note, reason, metadata = {}) {
    try {
        const { error: archiveError } = await supabase
            .from('edt_agenda_archive')
            .insert({
                original_id: note.id,
                user_id: note.user_id,
                course_uid: note.course_uid,
                notes: note.notes || '',
                labels: note.labels || [],
                entry_labels: note.entry_labels || {},
                modification_history: note.modification_history || [],
                archive_reason: reason,
                new_course_uid: metadata.new_course_uid || null,
                metadata: metadata
            });

        if (archiveError) {
            // Si la table n'existe pas encore, on log un warning mais on continue
            if (archiveError.code === '42P01' || archiveError.message?.includes('does not exist')) {
                console.warn(`[API fetch-ics] Table edt_agenda_archive n'existe pas encore. Exécutez le script create_agenda_archive_table.sql dans Supabase.`);
            } else {
                console.warn(`[API fetch-ics] Erreur archivage note (id: ${note.id}):`, archiveError.message);
            }
            return false;
        }
        console.log(`[API fetch-ics] Note archivée (id: ${note.id}, raison: ${reason})`);
        return true;
    } catch (error) {
        // Ne pas bloquer le processus si l'archivage échoue
        console.warn(`[API fetch-ics] Erreur archivage note (id: ${note.id}):`, error.message);
        return false;
    }
}

/**
 * Fusionne deux notes en combinant leurs contenus et labels
 * Retourne un objet avec les notes fusionnées, labels fusionnés, et entry_labels fusionnés
 */
function mergeNotes(oldNote, newNote) {
    // Parser les notes des deux sources
    const oldEntries = parseStoredNoteValue(oldNote.notes || '');
    const newEntries = parseStoredNoteValue(newNote.notes || '');

    // Fusionner les entrées : anciennes d'abord, puis nouvelles (éviter les doublons exacts)
    const mergedEntries = [...oldEntries];
    for (const entry of newEntries) {
        // Ajouter seulement si ce n'est pas un doublon exact
        if (!mergedEntries.includes(entry)) {
            mergedEntries.push(entry);
        }
    }

    // Fusionner les labels (ancien système)
    const oldLabels = Array.isArray(oldNote.labels) ? oldNote.labels : [];
    const newLabels = Array.isArray(newNote.labels) ? newNote.labels : [];
    const mergedLabels = [...new Set([...oldLabels, ...newLabels])]; // Union sans doublons

    // Fusionner les entry_labels (nouveau système par paragraphe)
    const oldEntryLabels = oldNote.entry_labels && typeof oldNote.entry_labels === 'object' 
        ? oldNote.entry_labels 
        : {};
    const newEntryLabels = newNote.entry_labels && typeof newNote.entry_labels === 'object'
        ? newNote.entry_labels
        : {};

    // Calculer les décalages d'index pour les entry_labels de l'ancienne note
    const oldEntriesCount = oldEntries.length;
    const mergedEntryLabels = { ...oldEntryLabels };

    // Ajouter les entry_labels de la nouvelle note avec décalage d'index
    for (const [indexStr, labels] of Object.entries(newEntryLabels)) {
        const newIndex = parseInt(indexStr, 10);
        if (!isNaN(newIndex) && Array.isArray(labels) && labels.length > 0) {
            const mergedIndex = oldEntriesCount + newIndex;
            // Si l'index existe déjà, fusionner les labels
            if (mergedEntryLabels[String(mergedIndex)]) {
                const existingLabels = Array.isArray(mergedEntryLabels[String(mergedIndex)])
                    ? mergedEntryLabels[String(mergedIndex)]
                    : [];
                mergedEntryLabels[String(mergedIndex)] = [...new Set([...existingLabels, ...labels])];
            } else {
                mergedEntryLabels[String(mergedIndex)] = labels;
            }
        }
    }

    // Fusionner l'historique des modifications
    const oldHistory = Array.isArray(oldNote.modification_history) ? oldNote.modification_history : [];
    const newHistory = Array.isArray(newNote.modification_history) ? newNote.modification_history : [];
    const mergedHistory = [...oldHistory, ...newHistory];

    return {
        notes: JSON.stringify(mergedEntries),
        labels: mergedLabels,
        entry_labels: mergedEntryLabels,
        modification_history: mergedHistory
    };
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
 * 
 * NOUVELLE LOGIQUE : Fusionne les notes au lieu de les supprimer.
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
                    .select('id, notes, labels, entry_labels, modification_history')
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
                    // NOUVELLE LOGIQUE : Fusionner les notes au lieu de supprimer
                    
                    // Archiver l'ancienne note orpheline avant fusion
                    await archiveNote(supabase, note, 'merged', {
                        new_course_uid: newCourseUid,
                        reason: 'Note orpheline fusionnée avec note existante lors de la migration',
                        old_location: oldEvent.location,
                        new_location: matchingEvent.location
                    });

                    // Fusionner les notes
                    const merged = mergeNotes(note, existingNote);

                    // Mettre à jour la note existante avec le contenu fusionné
                    const { error: updateError } = await supabase
                        .from('edt_agenda')
                        .update({
                            notes: merged.notes,
                            labels: merged.labels,
                            entry_labels: merged.entry_labels,
                            modification_history: merged.modification_history
                        })
                        .eq('id', existingNote.id);

                    if (updateError) {
                        console.warn(`[API fetch-ics] Erreur fusion note (id: ${note.id} → ${existingNote.id}):`, updateError.message);
                        skippedCount++;
                    } else {
                        // Supprimer l'ancienne note orpheline après fusion réussie
                        const { error: deleteError } = await supabase
                            .from('edt_agenda')
                            .delete()
                            .eq('id', note.id);

                        if (deleteError) {
                            console.warn(`[API fetch-ics] Erreur suppression note orpheline après fusion (id: ${note.id}):`, deleteError.message);
                        }

                        console.log(`[API fetch-ics] Migration: Note orpheline fusionnée (id: ${note.id}, old_uid: ${note.course_uid}) avec note existante (id: ${existingNote.id}, new_uid: ${newCourseUid})`);
                        migratedCount++;
                    }
                } else {
                    // Migrer la note vers le nouveau course_uid
                    // Archiver l'ancienne version avant migration
                    await archiveNote(supabase, note, 'orphan_migration', {
                        new_course_uid: newCourseUid,
                        reason: 'Note orpheline migrée vers nouveau course_uid (changement de salle)',
                        old_location: oldEvent.location,
                        new_location: matchingEvent.location
                    });

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
    
    // Vérifier si le mode démo est activé (uniquement sur demo-edt.vercel.app)
    const { checkDemoModeFromRequest } = await import('@/services/demoDataService');
    const isDemoMode = checkDemoModeFromRequest(request);
    
    if (isDemoMode) {
        console.log('[API fetch-ics] Mode démo activé, génération de données de démo');
        try {
            const url = new URL(request.url);
            const langParam = url.searchParams.get('lang');
            const acceptLang = request.headers.get('accept-language') || '';
            const lang = langParam || (acceptLang.toLowerCase().startsWith('en') ? 'en' : 'fr');
            const { generateDemoYearData } = await import('@/services/demoDataService');
            const demoData = generateDemoYearData(lang);
            
            // Convertir les notes Map en format compatible
            const notesArray = Array.from(demoData.notes.entries()).map(([key, noteData]) => {
                // noteData peut être soit un objet {entries, entry_labels} soit une string (ancien format)
                let noteValue;
                if (typeof noteData === 'object' && noteData !== null && Array.isArray(noteData.entries)) {
                    // Nouveau format : convertir entries en string JSON
                    noteValue = JSON.stringify(noteData.entries);
                } else {
                    // Ancien format (string)
                    noteValue = typeof noteData === 'string' ? noteData : String(noteData);
                }
                return {
                    eventKey: key,
                    note: noteValue
                };
            });
            
            return NextResponse.json({
                events: demoData.events,
                diff: {
                    added: demoData.events,
                    updated: [],
                    removed: []
                },
                meta: {
                    source: 'demo',
                    fromCache: false,
                    changed: demoData.events.length,
                    isDemo: true
                },
                notes: notesArray // Inclure les notes générées
            });
        } catch (demoError) {
            console.error('[API fetch-ics] Erreur lors de la génération des données de démo:', demoError);
            return NextResponse.json({
                error: 'Erreur lors de la génération des données de démo',
                details: demoError.message
            }, { status: 500 });
        }
    }
    
    // Vérifier si le client demande un parsing forcé (pas de cache local)
    const url = new URL(request.url);
    const forceParser = url.searchParams.get('force') === 'true';
    
    try {
        supabaseClient = getSupabaseServerClient();
        
        // Utiliser .env.local ou fallback sur l'URL par défaut
        // Note: ICS_URL pour le serveur, NEXT_PUBLIC_ICS_URL pour le client
        const icsUrl = process.env.ICS_URL || process.env.NEXT_PUBLIC_ICS_URL;
        
        if (!icsUrl) {
            throw new Error("URL ICS non configurée. Créer .env.local avec ICS_URL=...");
        }

        console.log('[API fetch-ics] Fetching from:', icsUrl);
        console.log('[API fetch-ics] Force parsing:', forceParser);
        
        // Utiliser fetchInsecure pour supporter HTTP et HTTPS avec certificat invalide
        try {
            const res = await fetchInsecure(icsUrl, TIMEOUT_MS);
            console.log('[API fetch-ics] Response status:', res.status, res.statusText);
            
            if (!res.ok) {
                throw new Error(`Erreur HTTP ${res.status}: ${res.statusText}`);
            }

            const text = await res.text();
            
            if (!text || text.length === 0) {
                throw new Error("Fichier ICS vide");
            }
            
            // Vérifier que c'est bien un fichier ICS et pas une page d'erreur HTML
            if (!text.includes('BEGIN:VCALENDAR')) {
                console.error('[API fetch-ics] Réponse non-ICS reçue:', text.substring(0, 200));
                throw new Error("Le serveur n'a pas renvoyé un fichier ICS valide");
            }

            console.log('[API fetch-ics] ICS downloaded, length:', text.length);

            // Calculer le hash de l'ICS UNE SEULE FOIS (utilisé pour le cache client)
            const currentIcsHash = createHash('sha256').update(text).digest('hex');
            // Extraire les 8 premiers caractères pour le client (suffisant pour détecter les changements)
            const hashForClient = currentIcsHash.substring(0, 8);

            // Vérifier le hash du dernier ICS téléchargé (si Supabase disponible)
            // Si le hash est identique ET que le client n'a pas demandé un force,
            // dire au client d'utiliser son cache localStorage
            // (on n'interroge PAS Supabase pour éviter les requêtes inutiles)
            if (supabaseClient && !forceParser) {
                try {
                    const ics_hash = currentIcsHash;
                    
                    const { data: lastRows, error: lastErr } = await supabaseClient
                        .from('ics_history')
                        .select('ics_hash')
                        .order('timestamp', { ascending: false })
                        .limit(1);
                    
                    if (!lastErr && lastRows && lastRows.length > 0) {
                        const lastHash = lastRows[0].ics_hash;
                        
                        if (ics_hash === lastHash) {
                            // Hash identique : dire au client d'utiliser son cache localStorage
                            // On ne va PAS chercher dans Supabase (events_versions)
                            console.log('[API fetch-ics] ICS hash unchanged, telling client to use local cache');
                            return NextResponse.json({
                                unchanged: true,
                                meta: {
                                    source: 'unchanged',
                                    fromCache: true,
                                    hash: ics_hash.substring(0, 8) // Pour debug
                                }
                            });
                        }
                    }
                } catch (checkErr) {
                    console.warn('[API fetch-ics] Error checking hash, will parse:', checkErr.message);
                }
            } else if (forceParser) {
                console.log('[API fetch-ics] Force parsing requested, skipping hash check');
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

                    // Load last snapshot fingerprint AND ics_hash
                    const { data: lastRows, error: lastErr } = await supabaseClient
                        .from('ics_history')
                        .select('fingerprint, subjects, ics_hash')
                        .order('timestamp', { ascending: false })
                        .limit(1);
                    if (lastErr) {
                        console.warn('[API fetch-ics] Supabase select last error:', lastErr.message);
                    } else {
                        const last = lastRows && lastRows[0];
                        const lastHash = last?.ics_hash;
                        
                        // Si le hash ICS est identique, ne rien faire (pas de modification de l'EDT)
                        if (lastHash && lastHash === ics_hash) {
                            console.log('[API fetch-ics] ICS hash unchanged, no ics_history update needed');
                        } else {
                            // Hash différent = modification de l'EDT détectée
                            // SUPPRIMER TOUT dans ics_history pour éviter les doublons
                            console.log('[API fetch-ics] ICS hash CHANGED - Clearing ics_history table');
                            console.log('[API fetch-ics] Old hash:', lastHash ? lastHash.substring(0, 16) + '...' : 'none');
                            console.log('[API fetch-ics] New hash:', ics_hash.substring(0, 16) + '...');
                            
                            const { error: deleteErr } = await supabaseClient
                                .from('ics_history')
                                .delete()
                                .neq('id', '___impossible___'); // Trick pour supprimer toutes les lignes
                            
                            if (deleteErr) {
                                console.warn('[API fetch-ics] Error deleting ics_history:', deleteErr.message);
                            } else {
                                console.log('[API fetch-ics] ics_history table cleared');
                            }
                            
                            // Calculer les changements de matières (added/removed)
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
                            
                            // Insérer le nouveau snapshot
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
                                console.log('[API fetch-ics] New history snapshot inserted (old data cleared)');
                            }
                        }
                    }

                    // Removed: legacy first-seen insertion into events_first_seen (table deprecated)

                    // 2) Per-UID event tracking (UPDATE existing, INSERT new, DELETE removed)
                    // Option B : Pas d'historique, toujours 1 ligne par événement
                    try {
                        const inserts = [];
                        const updates = [];
                        const deletes = [];
                        const nowISO = new Date().toISOString();
                        const seenUids = new Set();

                        console.log('[API fetch-ics] Computing diffs: comparing', events.length, 'fetched events vs', latestEventMap.size, 'DB events');

                        for (const event of events) {
                            const contentHash = computeEventContentHash(event);
                            const latest = latestEventMap.get(event.uid);
                            seenUids.add(event.uid);

                            if (!latest) {
                                // Nouvel événement jamais vu → INSERT
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
                                // Le contenu a changé → UPDATE (pas de nouvelle version)
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
                                    changedFields
                                });
                                updates.push({
                                    uid: event.uid,
                                    data: {
                                        version_no: latest.version_no + 1,
                                        changed_at: nowISO,
                                        summary: event.summary,
                                        start: event.start,
                                        end_time: event.end,
                                        location: event.location,
                                        description: event.description,
                                        content_hash: contentHash
                                    }
                                });
                            }
                            // Hash identique = aucun changement
                        }

                        // Détecter les événements supprimés → DELETE
                        for (const [uid, latest] of latestEventMap.entries()) {
                            if (!seenUids.has(uid)) {
                                console.log('[API fetch-ics] REMOVED event:', uid, '-', latest.event.summary);
                                diff.removed.push({
                                    uid,
                                    ...latest.event,
                                    version_no: latest.version_no,
                                    content_hash: latest.content_hash
                                });
                                deletes.push(uid);
                            }
                        }

                        console.log('[API fetch-ics] Diff computed:', diff.added.length, 'added,', diff.updated.length, 'updated,', diff.removed.length, 'removed');

                        // INSERT nouveaux événements
                        if (inserts.length > 0) {
                            console.log('[API fetch-ics] Inserting', inserts.length, 'new event(s)');
                            const BATCH_SIZE = 100;
                            for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
                                const batch = inserts.slice(i, i + BATCH_SIZE);
                                const { error: insErr } = await supabaseClient.from('events_versions').insert(batch);
                                if (insErr) {
                                    console.warn('[API fetch-ics] Insert error:', insErr.message, insErr.code);
                                    break;
                                }
                                console.log(`[API fetch-ics] ${batch.length} event(s) inserted`);
                            }
                        }

                        // UPDATE événements modifiés (1 par 1 car Supabase ne supporte pas batch update)
                        if (updates.length > 0) {
                            console.log('[API fetch-ics] Updating', updates.length, 'event(s)');
                            for (const upd of updates) {
                                const { error: updErr } = await supabaseClient
                                    .from('events_versions')
                                    .update(upd.data)
                                    .eq('uid', upd.uid);
                                if (updErr) {
                                    console.warn('[API fetch-ics] Update error for', upd.uid, ':', updErr.message);
                                }
                            }
                            console.log(`[API fetch-ics] ${updates.length} event(s) updated`);
                        }

                        // ⚠️ IMPORTANT: Migrer les notes orphelines AVANT de supprimer les anciens events
                        // Sinon, on perd les infos (start, summary, location) nécessaires pour la migration !
                        // 4) Migration automatique des notes orphelines (si seule la salle a changé)
                        if (deletes.length > 0 || inserts.length > 0) {
                            try {
                                console.log('[API fetch-ics] Migration des notes AVANT suppression des anciens events...');
                                await migrateOrphanNotes(supabaseClient, events);
                            } catch (migErr) {
                                console.warn('[API fetch-ics] Note migration skipped:', migErr.message);
                            }
                        }

                        // DELETE événements supprimés (APRÈS la migration des notes)
                        if (deletes.length > 0) {
                            console.log('[API fetch-ics] Deleting', deletes.length, 'event(s)');
                            const { error: delErr } = await supabaseClient
                                .from('events_versions')
                                .delete()
                                .in('uid', deletes);
                            if (delErr) {
                                console.warn('[API fetch-ics] Delete error:', delErr.message);
                            } else {
                                console.log(`[API fetch-ics] ${deletes.length} event(s) deleted`);
                            }
                        }

                        if (inserts.length === 0 && updates.length === 0 && deletes.length === 0) {
                            console.log('[API fetch-ics] No changes detected, no DB writes needed');
                        }
                        
                        // 5) Mettre à jour le timestamp de ics_history si des changements ont été faits
                        // Comme ça en mode fallback Supabase, on affiche la date de dernière modification réelle
                        const totalChanges = inserts.length + updates.length + deletes.length;
                        if (totalChanges > 0) {
                            try {
                                // Récupérer l'ID de la dernière entrée
                                const { data: lastEntry } = await supabaseClient
                                    .from('ics_history')
                                    .select('id')
                                    .order('timestamp', { ascending: false })
                                    .limit(1)
                                    .single();
                                
                                if (lastEntry?.id) {
                                    const { error: updateTimestampErr } = await supabaseClient
                                        .from('ics_history')
                                        .update({ timestamp: nowISO })
                                        .eq('id', lastEntry.id);
                                    if (updateTimestampErr) {
                                        console.warn('[API fetch-ics] Error updating ics_history timestamp:', updateTimestampErr.message);
                                    } else {
                                        console.log('[API fetch-ics] ics_history timestamp updated to:', nowISO);
                                    }
                                }
                            } catch (tsErr) {
                                console.warn('[API fetch-ics] Error updating timestamp:', tsErr.message);
                            }
                        }
                        
                        // Return immediately after computing diff
                        return NextResponse.json({
                            events,
                            diff,
                            meta: {
                                source: 'parsed',
                                fromCache: false,
                                changed: diff.added.length + diff.updated.length + diff.removed.length,
                                hash: hashForClient  // Pour que le client puisse sauvegarder le hash du cache
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
                    changed: diff.added.length + diff.updated.length + diff.removed.length,
                    hash: hashForClient  // Pour que le client puisse sauvegarder le hash du cache
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
