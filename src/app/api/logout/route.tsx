// @ts-nocheck
// ---- src/app/api/logout/route.js ----
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API logout]";

/**
 * POST /api/logout
 * Déconnecte l'utilisateur en supprimant le cookie de session
 */
export async function POST() {
    try {
        const response = NextResponse.json({
            message: "Déconnexion réussie",
        });

        // Supprimer le cookie de session
        response.cookies.set({
            name: "edt_session",
            value: "",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 0, // Expire immédiatement
        });

        return response;
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}


