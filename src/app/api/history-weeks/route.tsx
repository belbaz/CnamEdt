// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        const supabase = getSupabaseServerClient();
        if (!supabase) return NextResponse.json({ items: [], backend: 'none' });

        const { data, error } = await supabase
            .from('ics_week_history')
            .select('*')
            .order('week_monday', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ items: data || [], backend: 'supabase' });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}



