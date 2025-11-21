import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        const icsUrl = process.env.ICS_URL;
        
        // Télécharger le fichier ICS
        const res = await fetch(icsUrl, {
            headers: {
                'Accept': 'text/calendar,text/plain,*/*',
            },
            cache: 'no-store'
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const text = await res.text();
        const currentHash = createHash('sha256').update(text).digest('hex');
        
        // Récupérer le dernier hash depuis Supabase
        const supabase = getSupabaseServerClient();
        let lastHash = null;
        let lastTimestamp = null;
        
        if (supabase) {
            const { data: lastRows, error: lastErr } = await supabase
                .from('ics_history')
                .select('ics_hash, timestamp')
                .order('timestamp', { ascending: false })
                .limit(1);
            
            if (!lastErr && lastRows && lastRows.length > 0) {
                lastHash = lastRows[0].ics_hash;
                lastTimestamp = lastRows[0].timestamp;
            }
        }
        
        const hashMatch = currentHash === lastHash;
        
        return NextResponse.json({
            current_hash: currentHash,
            last_hash: lastHash,
            last_timestamp: lastTimestamp,
            hash_match: hashMatch,
            ics_length: text.length,
            message: hashMatch 
                ? '✅ Hash identique - Aucune modification détectée'
                : '⚠️ Hash différent - Modifications détectées dans le fichier ICS'
        });
    } catch (err) {
        return NextResponse.json({
            error: err.message,
            details: 'Erreur lors de la vérification du hash ICS'
        }, { status: 500 });
    }
}

