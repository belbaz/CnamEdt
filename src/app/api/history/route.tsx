// @ts-nocheck
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "history.jsonl");

async function ensureDataFile() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(FILE_PATH);
    } catch {
        await fs.writeFile(FILE_PATH, "", "utf8");
    }
}

async function readAll() {
    await ensureDataFile();
    const content = await fs.readFile(FILE_PATH, "utf8");
    return content
        .split("\n")
        .filter(Boolean)
        .map(line => {
            try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);
}

async function appendOne(record) {
    await ensureDataFile();
    await fs.appendFile(FILE_PATH, JSON.stringify(record) + "\n", "utf8");
}

export async function GET() {
    try {
        const supabase = getSupabaseServerClient();
        if (supabase) {
            // Read initial versions from edt_events_versions (version_no = 1)
            const { data, error } = await supabase
                .from('edt_events_versions')
                .select('uid, version_no, changed_at, summary, start, end_time, location, description')
                .eq('version_no', 1)
                .order('changed_at', { ascending: false });
            if (error) {
                console.error('[history][GET] Supabase error:', error.message);
                return NextResponse.json({ items: [], error: error.message, backend: 'supabase' }, { status: 500 });
            }
            // Compute event_key and first_seen from version rows to keep the same contract
            const items = (data || []).map(r => {
                const startISO = r.start ? new Date(r.start).toISOString() : '';
                const summary = (r.summary || '').trim();
                const location = (r.location || '').trim();
                const event_key = `${startISO}|${summary}|${location}`;
                return {
                    uid: r.uid,
                    event_key,
                    summary: r.summary,
                    start: r.start,
                    end_time: r.end_time,
                    location: r.location,
                    description: r.description,
                    first_seen: r.changed_at
                };
            });
            return NextResponse.json({ items, backend: 'supabase' });
        }
        // Fallback file storage
        return NextResponse.json({ items: [], backend: 'none' });
    } catch (e) {
        console.error('[history][GET] Error:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const required = ["timestamp", "subjects", "added", "removed", "total", "fingerprint"];
        for (const k of required) if (!(k in body)) return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });

        const record = {
            id: body.id || String(Date.now()),
            timestamp: body.timestamp,
            total: body.total,
            subjects: body.subjects,
            added: body.added,
            removed: body.removed,
            fingerprint: body.fingerprint,
            ics_hash: body.icsHash || null,
            ics_url: body.icsUrl || null
        };

        const supabase = getSupabaseServerClient();
        if (supabase) {
            // Skip if unchanged vs latest
            const { data: lastRows, error: lastErr } = await supabase
                .from('ics_history')
                .select('fingerprint')
                .order('timestamp', { ascending: false })
                .limit(1);
            if (lastErr) {
                console.error('[history][POST] Supabase select last error:', lastErr.message);
                return NextResponse.json({ error: lastErr.message }, { status: 500 });
            }
            const last = lastRows && lastRows[0];
            if (last && last.fingerprint === record.fingerprint) {
                return NextResponse.json({ skipped: true, reason: "unchanged" });
            }
            const { error } = await supabase.from('ics_history').insert(record);
            if (error) {
                console.error('[history][POST] Supabase insert error:', error.message);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            return NextResponse.json({ ok: true, backend: 'supabase' });
        }

        // Fallback file storage
        const rows = await readAll();
        const last = rows[rows.length - 1];
        if (last && last.fingerprint === record.fingerprint) {
            return NextResponse.json({ skipped: true, reason: "unchanged" });
        }
        await appendOne(record);
        return NextResponse.json({ ok: true, record, backend: 'file' });
    } catch (e) {
        console.error('[history][POST] Error:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
 

