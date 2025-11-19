// ---- src/app/api/user/route.js ----
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessionToken";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API user]";

/**
 * GET /api/user
 * Récupère les informations de l'utilisateur connecté
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

        const user = verifySessionToken(session);
        
        if (!user) {
            return NextResponse.json(
                { error: "Session invalide" },
                { status: 401 }
            );
        }

        return NextResponse.json({
            id: user.sub,
            email: user.email,
            name: user.name,
            lastName: user.lastName,
            role: user.role,
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}

