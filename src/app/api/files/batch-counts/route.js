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

        // Récupérer tous les fichiers pour ces cours
        // Note: On récupère juste les course_uid pour compter
        const { data, error } = await supabase
            .from('edt_course_files')
            .select('course_uid')
            .in('course_uid', course_uids);

        if (error) {
            console.error(`${LOG_PREFIX} Erreur récupération fichiers:`, error);
            return NextResponse.json(
                { error: "Erreur lors du comptage des fichiers" },
                { status: 500 }
            );
        }

        // Compter les fichiers par cours
        const counts = {};
        // Initialiser à 0
        course_uids.forEach(uid => counts[uid] = 0);

        // Compter
        data.forEach(file => {
            if (counts[file.course_uid] !== undefined) {
                counts[file.course_uid]++;
            }
        });

        return NextResponse.json({
            success: true,
            counts
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur lors du traitement" },
            { status: 500 }
        );
    }
}
