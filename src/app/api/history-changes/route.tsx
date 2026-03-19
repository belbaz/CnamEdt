// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
    try {
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json({ items: [], backend: 'none' });
        }

        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 1000);
        const since = searchParams.get('since'); // ISO date string optional
        const uid = searchParams.get('uid'); // filter by specific uid optional

        let query = supabase
            .from('events_versions')
            .select('uid, version_no, changed_at, summary, start, end_time, location, description')
            .order('changed_at', { ascending: false })
            .limit(limit);

        // Only versions > 1 are "changes" beyond first seen
        query = query.gt('version_no', 1);

        if (since) {
            query = query.gte('changed_at', since);
        }
        if (uid) {
            query = query.eq('uid', uid);
        }

        const { data, error } = await query;
        if (error) {
            return NextResponse.json({ items: [], error: error.message, backend: 'supabase' }, { status: 500 });
        }
        return NextResponse.json({ items: data || [], backend: 'supabase' });
    } catch (e) {
        return NextResponse.json({ items: [], error: e.message }, { status: 500 });
    }
}



