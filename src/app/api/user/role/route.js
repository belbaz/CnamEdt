import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessionToken";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API user/role]";

/**
 * GET /api/user/role
 * Retourne le rôle de l'utilisateur connecté depuis la base de données, ou null si non connecté
 * Le rôle est toujours récupéré depuis la DB pour refléter les changements en temps réel
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;

        if (!session) {
            return NextResponse.json(
                { role: null, authenticated: false },
                { status: 200 }
            );
        }

        const user = verifySessionToken(session);

        if (!user || !user.sub) {
            return NextResponse.json(
                { role: null, authenticated: false },
                { status: 200 }
            );
        }

        // Récupérer le rôle actuel depuis la base de données (pas depuis le token)
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            // En cas d'erreur DB, retourner le rôle du token (fallback)
            return NextResponse.json({
                role: user.role,
                authenticated: true
            });
        }

        const { data: dbUser, error: dbError } = await supabase
            .from('edt_user')
            .select('role')
            .eq('id', user.sub)
            .maybeSingle();

        if (dbError) {
            console.error(`${LOG_PREFIX} Erreur récupération DB:`, dbError);
            // En cas d'erreur DB, retourner le rôle du token (fallback)
            return NextResponse.json({
                role: user.role,
                authenticated: true
            });
        }

        // Retourner le rôle depuis la DB (toujours à jour)
        return NextResponse.json({
            role: dbUser?.role || user.role,
            authenticated: true
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { role: null, authenticated: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
