// @ts-nocheck
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API files/delete]";

/**
 * DELETE /api/files/delete?id=xxx
 * Supprime un fichier (uniquement si l'utilisateur est le propriétaire)
 */
export async function DELETE(request) {
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
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            return NextResponse.json(
                { error: "Service indisponible" },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const fileId = searchParams.get('id');

        if (!fileId) {
            return NextResponse.json(
                { error: "id est requis" },
                { status: 400 }
            );
        }

        // Vérifier que le fichier appartient à l'utilisateur
        const { data: file, error: fetchError } = await supabase
            .from('edt_course_files')
            .select('id, user_id, blob_path')
            .eq('id', fileId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !file) {
            return NextResponse.json(
                { error: "Fichier introuvable ou vous n'avez pas les permissions" },
                { status: 404 }
            );
        }

        // Supprimer de la base de données
        const { error: deleteError } = await supabase
            .from('edt_course_files')
            .delete()
            .eq('id', fileId)
            .eq('user_id', userId);

        if (deleteError) {
            console.error(`${LOG_PREFIX} Erreur suppression DB:`, deleteError);
            return NextResponse.json(
                { error: "Erreur lors de la suppression du fichier" },
                { status: 500 }
            );
        }

        // Note: Vercel Blob ne fournit pas de méthode delete dans le SDK client
        // Les fichiers seront nettoyés automatiquement par Vercel après expiration
        // ou peuvent être supprimés manuellement depuis le dashboard Vercel

        console.log(`${LOG_PREFIX} Fichier supprimé: ${fileId}`);

        return NextResponse.json({
            success: true,
            message: "Fichier supprimé avec succès"
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur lors de la suppression du fichier" },
            { status: 500 }
        );
    }
}


