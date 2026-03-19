// @ts-nocheck
// ---- src/app/api/test-update/route.js ----
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * API de test pour vérifier l'automatisation des mises à jour
 * Met à jour le timestamp dans la table test_edt
 */
export async function GET() {
    try {
        const supabase = getSupabaseServerClient();
        
        if (!supabase) {
            return NextResponse.json({
                error: 'Supabase non configuré',
                details: 'Vérifiez les variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE'
            }, { status: 500 });
        }

        // Mettre à jour le timestamp dans la table test_edt (id = 1)
        const { data, error } = await supabase
            .from('test_edt')
            .update({ last_check: new Date().toISOString() })
            .eq('id', 1)
            .select();

        if (error) {
            console.error('[API test-update] Erreur Supabase:', error);
            return NextResponse.json({
                error: 'Erreur lors de la mise à jour',
                details: error.message
            }, { status: 500 });
        }

        // Si aucune ligne n'est affectée, créer la ligne
        if (!data || data.length === 0) {
            const { data: insertData, error: insertError } = await supabase
                .from('test_edt')
                .insert({ id: 1, last_check: new Date().toISOString() })
                .select();

            if (insertError) {
                console.error('[API test-update] Erreur insertion:', insertError);
                return NextResponse.json({
                    error: 'Erreur lors de la création',
                    details: insertError.message
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                action: 'created',
                timestamp: insertData[0].last_check,
                message: '✅ Ligne créée avec succès'
            });
        }

        return NextResponse.json({
            success: true,
            action: 'updated',
            timestamp: data[0].last_check,
            message: '✅ Timestamp mis à jour avec succès'
        });

    } catch (err) {
        console.error('[API test-update] Erreur:', err.message);
        return NextResponse.json({
            error: err.message,
            details: 'Erreur inattendue lors de la mise à jour'
        }, { status: 500 });
    }
}

// Support pour les requêtes HEAD (health checks)
export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}


