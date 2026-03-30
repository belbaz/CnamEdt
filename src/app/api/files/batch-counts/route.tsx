// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API files/batch-counts]";

/**
 * POST /api/files/batch-counts
 * Body: { course_uids: string[] }
 * Récupère le nombre de fichiers pour une liste de cours
 */
export async function POST(request) {
    try {
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            return NextResponse.json(
                { error: "Service indisponible" },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { course_uids } = body;

        if (!course_uids || !Array.isArray(course_uids) || course_uids.length === 0) {
            return NextResponse.json({ counts: {} });
        }

        // OPTIMISATION : Utiliser une requête SQL avec GROUP BY pour compter côté base de données
        // Au lieu de récupérer toutes les lignes et compter en JavaScript,
        // on demande à PostgreSQL de faire le comptage directement.
        // Cela réduit drastiquement le volume de données transférées.
        const { data, error } = await supabase
            .rpc('count_files_by_courses', { course_uid_list: course_uids });

        if (error) {
            // Si la fonction RPC n'existe pas encore, fallback sur l'ancienne méthode
            if (error.code === '42883' || error.message?.includes('does not exist')) {
                console.warn(`${LOG_PREFIX} RPC function not found, using fallback method`);
                return await fallbackCountMethod(supabase, course_uids);
            }
            
            console.error(`${LOG_PREFIX} Erreur récupération compteurs:`, error);
            return NextResponse.json(
                { error: "Erreur lors du comptage des fichiers" },
                { status: 500 }
            );
        }

        // Transformer le résultat en objet { course_uid: count }
        const counts = {};
        // Initialiser tous les cours à 0
        course_uids.forEach(uid => counts[uid] = 0);
        
        // Remplir avec les vrais compteurs
        if (data && Array.isArray(data)) {
            data.forEach(row => {
                counts[row.course_uid] = row.count || 0;
            });
        }

        return NextResponse.json({
            success: true,
            counts
        }, {
            headers: {
                // Cache la réponse pendant 5 minutes côté client
                'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
                // Permettre le stockage en cache par les CDN
                'CDN-Cache-Control': 'public, max-age=300',
            }
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur lors du traitement" },
            { status: 500 }
        );
    }
}

// Méthode de fallback si la fonction RPC n'existe pas
async function fallbackCountMethod(supabase, course_uids) {
    const { data, error } = await supabase
        .from('edt_course_files')
        .select('course_uid')
        .in('course_uid', course_uids);

    if (error) {
        console.error(`${LOG_PREFIX} Erreur récupération fichiers (fallback):`, error);
        return NextResponse.json(
            { error: "Erreur lors du comptage des fichiers" },
            { status: 500 }
        );
    }

    const counts = {};
    course_uids.forEach(uid => counts[uid] = 0);
    data.forEach(file => {
        if (counts[file.course_uid] !== undefined) {
            counts[file.course_uid]++;
        }
    });

    return NextResponse.json({
        success: true,
        counts
    });
}

