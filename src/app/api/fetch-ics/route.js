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
        
        const parsed = ical.sync.parseICS(text);

        const events = Object.values(parsed)
            .filter((e) => e.type === "VEVENT")
            .map((e) => ({
                summary: e.summary,
                start: e.start,
                description: e.description,
                end: e.end,
                location: e.location,
            }));

        console.log('[API fetch-ics] Events parsed:', events.length);

        // Server-side history snapshot (Supabase only)
        try {
            const supabase = getSupabaseServerClient();
            if (!supabase) {
                console.warn('[API fetch-ics] Supabase client not available (missing env vars)');
            } else {
                console.log('[API fetch-ics] Supabase client initialized');
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

                // Insert first-seen events (each course individually)
                const eventKey = (ev) => {
                    const s = new Date(ev.start).toISOString();
                    const sum = (ev.summary || '').trim();
                    const loc = (ev.location || '').trim();
                    return `${s}|${sum}|${loc}`;
                };
                const eventKeys = events.map(eventKey);
                console.log('[API fetch-ics] events total:', events.length);
                console.log('[API fetch-ics] eventKeys sample:', eventKeys.slice(0, 2));
                if (eventKeys.length > 0) {
                    console.log('[API fetch-ics] Querying Supabase for existing events...');
                    // Split into batches (Supabase has limits on .in() size)
                    const BATCH_SIZE = 100;
                    const existingSet = new Set();
                    for (let i = 0; i < eventKeys.length; i += BATCH_SIZE) {
                        const batch = eventKeys.slice(i, i + BATCH_SIZE);
                        const { data: batchRows, error: batchErr } = await supabase
                            .from('events_first_seen')
                            .select('event_key')
                            .in('event_key', batch);
                        if (batchErr) {
                            console.error('[API fetch-ics] Supabase select batch error:', batchErr.message, batchErr.code, batchErr.details, batchErr.hint);
                            // If table doesn't exist, skip this entirely
                            if (batchErr.code === '42P01') {
                                console.error('[API fetch-ics] Table events_first_seen does not exist! Please create it in Supabase.');
                                break;
                            }
                            continue;
                        }
                        (batchRows || []).forEach(r => existingSet.add(r.event_key));
                    }
                    console.log('[API fetch-ics] events existing in DB:', existingSet.size);
                    const toInsert = events
                        .filter(ev => !existingSet.has(eventKey(ev)))
                        .map(ev => ({
                            event_key: eventKey(ev),
                            summary: (ev.summary || '').trim(),
                            start: new Date(ev.start).toISOString(),
                            end_time: new Date(ev.end).toISOString(),
                            location: (ev.location || '').trim(),
                            description: (ev.description || '').trim(),
                            first_seen: new Date().toISOString()
                        }));
                    console.log('[API fetch-ics] events to insert:', toInsert.length);
                    if (toInsert.length > 0) {
                        // Insert in batches too
                        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
                            const batch = toInsert.slice(i, i + BATCH_SIZE);
                            const { data: insData, error: insFirstErr } = await supabase.from('events_first_seen').insert(batch);
                            if (insFirstErr) {
                                console.error('[API fetch-ics] Supabase insert batch error:', {
                                    message: insFirstErr.message,
                                    code: insFirstErr.code,
                                    details: insFirstErr.details,
                                    hint: insFirstErr.hint,
                                    fullError: insFirstErr
                                });
                                console.error('[API fetch-ics] Batch sample:', JSON.stringify(batch[0], null, 2));
                                if (insFirstErr.code === '42P01') {
                                    console.error('[API fetch-ics] Table events_first_seen does not exist! Please create it in Supabase.');
                                    break;
                                }
                            } else {
                                console.log(`[API fetch-ics] ${batch.length} event(s) inserted (batch ${Math.floor(i/BATCH_SIZE)+1})`);
                            }
                        }
                    } else {
                        console.log('[API fetch-ics] no new events to insert');
                    }
                }

                // 2) Weekly event-level snapshot (disabled)
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

        return NextResponse.json(events);
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