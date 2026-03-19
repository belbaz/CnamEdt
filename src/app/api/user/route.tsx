// @ts-nocheck
// ---- src/app/api/user/route.js ----
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessionToken";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API user]";

/**
 * GET /api/user
 * Récupère les informations de l'utilisateur connecté
 * SÉCURITÉ : Le rôle est toujours récupéré depuis la base de données (source de vérité)
 * On utilise uniquement l'ID utilisateur du token JWT (signé et vérifié)
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;

        if (!session) {
            return NextResponse.json(
                { error: "Non authentifié" },
                { status: 401 }
            );
        }

        // Vérifier le token JWT pour obtenir l'ID utilisateur de manière sécurisée
        const tokenData = verifySessionToken(session);

        if (!tokenData || !tokenData.sub) {
            return NextResponse.json(
                { error: "Session invalide" },
                { status: 401 }
            );
        }

        const userId = tokenData.sub; // ID utilisateur depuis le token (sécurisé car signé)

        // Récupérer le rôle actuel depuis la base de données (source de vérité)
        // On ignore le rôle dans le token pour éviter les falsifications
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            // En cas d'erreur DB, retourner quand même les infos du token (fallback pour affichage uniquement)
            return NextResponse.json({
                id: userId,
                email: tokenData.email,
                name: tokenData.name,
                lastName: tokenData.lastName,
                role: tokenData.role,
                lastLogin: null,
                createdAt: null,
            });
        }

        const { data: dbUser, error: dbError } = await supabase
            .from('edt_user')
            .select('id, email, role, name, last_name, date_online, created_at')
            .eq('id', userId)
            .maybeSingle();

        if (dbError) {
            console.error(`${LOG_PREFIX} Erreur récupération DB:`, dbError);
            // En cas d'erreur DB, retourner quand même les infos du token (fallback pour affichage uniquement)
            // Note: Ce fallback est acceptable car cette API est utilisée pour l'affichage, pas pour l'autorisation
            return NextResponse.json({
                id: userId,
                email: tokenData.email,
                name: tokenData.name,
                lastName: tokenData.lastName,
                role: tokenData.role, // Fallback uniquement en cas d'erreur DB
                lastLogin: null,
                createdAt: null,
            });
        }

        if (!dbUser) {
            console.warn(`${LOG_PREFIX} Utilisateur introuvable en DB - User ID: ${userId}`);
            return NextResponse.json(
                { error: "Utilisateur introuvable" },
                { status: 404 }
            );
        }

        // Utiliser les données de la DB (source de vérité)
        return NextResponse.json({
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || tokenData.name,
            lastName: dbUser.last_name || tokenData.lastName,
            role: dbUser.role, // Rôle depuis la DB (source de vérité)
            lastLogin: dbUser.date_online || null, // Dernière connexion
            createdAt: dbUser.created_at || null, // Date de création du compte
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}


