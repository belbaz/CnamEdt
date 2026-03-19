// @ts-nocheck
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * API pour récupérer la date de dernière mise à jour depuis la base de données
 * Retourne le timestamp le plus récent de la table ics_history
 */
export async function GET() {
    try {
        const supabase = getSupabaseServerClient();
        
        if (!supabase) {
            return NextResponse.json({
                error: 'Supabase non configuré',
                timestamp: null
            }, { status: 500 });
        }

        // Récupérer le dernier timestamp de ics_history
        const { data, error } = await supabase
            .from('ics_history')
            .select('timestamp')
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[API last-db-update] Erreur Supabase:', error);
            return NextResponse.json({
                error: 'Erreur lors de la récupération',
                details: error.message,
                timestamp: null
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            timestamp: data?.timestamp || null
        });
    } catch (e) {
        console.error('[API last-db-update] Erreur:', e.message);
        return NextResponse.json({
            error: e.message,
            timestamp: null
        }, { status: 500 });
    }
}


