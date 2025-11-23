import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API files/list]";

/**
 * GET /api/files/list?course_uid=xxx
 * Récupère la liste des fichiers pour un cours donné
 * Si l'utilisateur est connecté, retourne ses fichiers + les fichiers publics
 * Si non connecté, retourne uniquement les fichiers publics
 */
export async function GET(request) {
    try {
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            return NextResponse.json(
                { error: "Service indisponible" },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const courseUid = searchParams.get('course_uid');

        if (!courseUid) {
            return NextResponse.json(
                { error: "course_uid est requis" },
                { status: 400 }
            );
        }

        // Vérifier l'authentification (optionnel)
        const authResult = await requireAuth();
        const userId = authResult.user?.id;

        let query;

        if (userId) {
            // Utilisateur connecté : récupérer ses fichiers + fichiers publics
            query = supabase
                .from('edt_course_files')
                .select('id, file_name, file_size, file_type, blob_url, uploaded_at, user_id')
                .eq('course_uid', courseUid)
                .order('uploaded_at', { ascending: false });
        } else {
            // Utilisateur non connecté : uniquement les fichiers publics
            // Pour l'instant, on retourne tous les fichiers (on peut ajouter un flag "public" plus tard)
            query = supabase
                .from('edt_course_files')
                .select('id, file_name, file_size, file_type, blob_url, uploaded_at, user_id')
                .eq('course_uid', courseUid)
                .order('uploaded_at', { ascending: false });
        }

        const { data: files, error } = await query;

        if (error) {
            console.error(`${LOG_PREFIX} Erreur récupération fichiers:`, error);
            return NextResponse.json(
                { error: "Erreur lors de la récupération des fichiers" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            files: files || [],
            count: files?.length || 0
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur lors de la récupération des fichiers" },
            { status: 500 }
        );
    }
}

