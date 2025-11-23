import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API files/upload]";
const MAX_FILE_SIZE_DEFAULT = 10 * 1024 * 1024; // 10 MB par défaut
const MAX_FILE_SIZE_PDF = 30 * 1024 * 1024; // 30 MB pour les PDF
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .doc, .docx
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xls, .xlsx
    'text/plain', 'text/csv'
];

/**
 * Retourne la limite de taille maximale selon le type de fichier
 */
function getMaxFileSize(fileType) {
    if (fileType === 'application/pdf') {
        return MAX_FILE_SIZE_PDF;
    }
    return MAX_FILE_SIZE_DEFAULT;
}

/**
 * POST /api/files/upload
 * Upload un fichier vers Vercel Blob Storage et enregistre les métadonnées en base
 * 
 * Body (FormData):
 * - file: File
 * - course_uid: string (UID du cours)
 */
export async function POST(request) {
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

        // Récupérer le FormData
        const formData = await request.formData();
        const file = formData.get('file');
        const courseUid = formData.get('course_uid');

        // Validation
        if (!file || !(file instanceof File)) {
            return NextResponse.json(
                { error: "Aucun fichier fourni" },
                { status: 400 }
            );
        }

        if (!courseUid || typeof courseUid !== 'string') {
            return NextResponse.json(
                { error: "course_uid est requis" },
                { status: 400 }
            );
        }

        // Vérifier la taille selon le type de fichier
        const maxSize = getMaxFileSize(file.type);
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / 1024 / 1024;
            return NextResponse.json(
                { error: `Fichier trop volumineux. Maximum: ${maxSizeMB} MB${file.type === 'application/pdf' ? ' pour les PDF' : ''}` },
                { status: 400 }
            );
        }

        // Vérifier le type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Type de fichier non autorisé" },
                { status: 400 }
            );
        }

        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const blobPath = `course-files/${userId}/${courseUid}/${timestamp}-${sanitizedFileName}`;

        // Upload vers Vercel Blob Storage
        const blob = await put(blobPath, file, {
            access: 'public',
            contentType: file.type,
        });

        console.log(`${LOG_PREFIX} Fichier uploadé: ${blob.url}`);

        // Enregistrer les métadonnées en base
        const { data: fileRecord, error: dbError } = await supabase
            .from('edt_course_files')
            .insert({
                user_id: userId,
                course_uid: courseUid,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                blob_url: blob.url,
                blob_path: blob.pathname,
            })
            .select()
            .single();

        if (dbError) {
            console.error(`${LOG_PREFIX} Erreur insertion DB:`, dbError);
            // Essayer de supprimer le blob si l'insertion échoue
            try {
                // Note: Vercel Blob ne fournit pas de méthode delete dans le SDK client
                // Le blob restera mais ce n'est pas grave, il sera nettoyé manuellement si nécessaire
            } catch (cleanupError) {
                console.error(`${LOG_PREFIX} Erreur nettoyage blob:`, cleanupError);
            }

            return NextResponse.json(
                { error: "Erreur lors de l'enregistrement du fichier" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            file: {
                id: fileRecord.id,
                file_name: fileRecord.file_name,
                file_size: fileRecord.file_size,
                file_type: fileRecord.file_type,
                blob_url: fileRecord.blob_url,
                uploaded_at: fileRecord.uploaded_at,
            }
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur lors de l'upload du fichier" },
            { status: 500 }
        );
    }
}

