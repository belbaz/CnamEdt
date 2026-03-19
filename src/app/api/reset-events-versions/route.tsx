// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * ⚠️ DANGER: Cette route vide la table events_versions
 * À utiliser uniquement pour réinitialiser le système de tracking des changements
 * 
 * Usage: GET /api/reset-events-versions?confirm=true
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const confirm = searchParams.get('confirm');
        
        if (confirm !== 'true') {
            return NextResponse.json({
                error: 'Missing confirmation',
                message: 'Pour vider la table events_versions, ajouter ?confirm=true',
                warning: '⚠️ Cette opération est irréversible et supprimera tout l\'historique des changements'
            }, { status: 400 });
        }
        
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json({
                error: 'Supabase client not available'
            }, { status: 500 });
        }
        
        // Compter les lignes avant suppression
        const { count: beforeCount, error: countError } = await supabase
            .from('events_versions')
            .select('*', { count: 'exact', head: true });
        
        if (countError) {
            return NextResponse.json({
                error: 'Error counting rows',
                details: countError.message
            }, { status: 500 });
        }
        
        // Supprimer toutes les lignes
        const { error: deleteError } = await supabase
            .from('events_versions')
            .delete()
            .neq('uid', '__IMPOSSIBLE_VALUE__'); // Condition toujours vraie pour tout supprimer
        
        if (deleteError) {
            return NextResponse.json({
                error: 'Error deleting rows',
                details: deleteError.message
            }, { status: 500 });
        }
        
        console.log('[reset-events-versions] Deleted', beforeCount, 'rows from events_versions');
        
        return NextResponse.json({
            success: true,
            message: 'Table events_versions vidée avec succès',
            rows_deleted: beforeCount,
            next_step: 'Rechargez l\'application pour re-synchroniser tous les événements'
        });
    } catch (err) {
        console.error('[reset-events-versions] Error:', err.message);
        return NextResponse.json({
            error: err.message
        }, { status: 500 });
    }
}


