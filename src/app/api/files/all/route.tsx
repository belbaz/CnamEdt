// @ts-nocheck
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API files/all]";

/**
 * GET /api/files/all
 * Récupère tous les fichiers uploadés (pour les admins) ou les fichiers de l'utilisateur connecté
 * Query params:
 * - course_uid: string (optionnel) - Filtrer par cours
 * - user_id: string (optionnel) - Filtrer par utilisateur (admin uniquement)
 */
export async function GET(request) {
    try {
        // Vérifier l'authentification
        const authResult = await requireAuth();
        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const userId = authResult.user.id;
        const userRole = authResult.user.role;
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
        const filterUserId = searchParams.get('user_id');

        let query = supabase
            .from('edt_course_files')
            .select('id, file_name, file_size, file_type, blob_url, uploaded_at, user_id, course_uid, edt_user:user_id(name, last_name)')
            .order('uploaded_at', { ascending: false });

        // Si l'utilisateur n'est pas admin, ne montrer que ses propres fichiers
        if (userRole !== 'superAdmin' && userRole !== 'admin') {
            query = query.eq('user_id', userId);
        } else if (filterUserId) {
            // Admin peut filtrer par utilisateur
            query = query.eq('user_id', filterUserId);
        }

        // Filtrer par cours si spécifié
        if (courseUid) {
            query = query.eq('course_uid', courseUid);
        }

        const { data: files, error } = await query;

        if (error) {
            console.error(`${LOG_PREFIX} Erreur récupération fichiers:`, error);
            return NextResponse.json(
                { error: "Erreur lors de la récupération des fichiers" },
                { status: 500 }
            );
        }

        // Formater les fichiers avec le nom de l'utilisateur (grâce à la jointure automatique)
        const formattedFiles = (files || []).map(file => {
            const userInfo = file.edt_user || null;
            const userName = userInfo ? `${userInfo.name || ''} ${userInfo.last_name || ''}`.trim() : 'Utilisateur inconnu';
            return {
                ...file,
                user_name: userName,
                uploaded_at: file.uploaded_at
            };
        });

        return NextResponse.json({
            success: true,
            files: formattedFiles,
            count: formattedFiles.length
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur lors de la récupération des fichiers" },
            { status: 500 }
        );
    }
}


