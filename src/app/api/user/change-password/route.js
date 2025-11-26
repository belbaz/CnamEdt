// ---- src/app/api/user/change-password/route.js ----
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessionToken";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API user/change-password]";

/**
 * POST /api/user/change-password
 * Change le mot de passe de l'utilisateur connecté
 * Body: { oldPassword, newPassword }
 */
export async function POST(request) {
    try {
        // 1. Vérifier la session
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;

        if (!session) {
            return NextResponse.json(
                { error: "Non authentifié" },
                { status: 401 }
            );
        }

        // 2. Vérifier le token JWT pour obtenir l'ID utilisateur
        const tokenData = verifySessionToken(session);
        if (!tokenData || !tokenData.sub) {
            return NextResponse.json(
                { error: "Session invalide" },
                { status: 401 }
            );
        }

        const userId = tokenData.sub;

        // 3. Récupérer les données du body
        const body = await request.json();
        const { oldPassword, newPassword } = body;

        if (!oldPassword || !newPassword) {
            return NextResponse.json(
                { error: "Ancien mot de passe et nouveau mot de passe requis" },
                { status: 400 }
            );
        }

        // 4. Valider le nouveau mot de passe
        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" },
                { status: 400 }
            );
        }

        // 5. Récupérer l'utilisateur depuis la DB
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            return NextResponse.json(
                { error: "Service indisponible" },
                { status: 500 }
            );
        }

        const { data: user, error: userError } = await supabase
            .from('edt_user')
            .select('id, email, password')
            .eq('id', userId)
            .maybeSingle();

        if (userError) {
            console.error(`${LOG_PREFIX} Erreur récupération utilisateur:`, userError);
            return NextResponse.json(
                { error: "Erreur lors de la vérification" },
                { status: 500 }
            );
        }

        if (!user) {
            return NextResponse.json(
                { error: "Utilisateur introuvable" },
                { status: 404 }
            );
        }

        // 6. Vérifier l'ancien mot de passe
        const pepper = process.env.JWT_SECRET;
        if (!pepper) {
            console.error(`${LOG_PREFIX} JWT_SECRET manquant`);
            return NextResponse.json(
                { error: "Configuration serveur incomplète" },
                { status: 500 }
            );
        }

        const isOldPasswordValid = await bcrypt.compare(`${oldPassword}:${pepper}`, user.password);
        if (!isOldPasswordValid) {
            console.warn(`${LOG_PREFIX} Tentative changement mot de passe avec ancien mot de passe incorrect - User ID: ${userId}`);
            return NextResponse.json(
                { error: "Mot de passe incorrect" },
                { status: 401 }
            );
        }

        // 7. Hasher le nouveau mot de passe
        const hashTarget = `${newPassword}:${pepper}`;
        const hashedPassword = await bcrypt.hash(hashTarget, 12);

        // 8. Mettre à jour le mot de passe
        const { error: updateError } = await supabase
            .from('edt_user')
            .update({ password: hashedPassword })
            .eq('id', userId);

        if (updateError) {
            console.error(`${LOG_PREFIX} Erreur mise à jour mot de passe:`, updateError);
            return NextResponse.json(
                { error: "Erreur lors de la mise à jour du mot de passe" },
                { status: 500 }
            );
        }

        console.log(`${LOG_PREFIX} Mot de passe changé avec succès - User ID: ${userId}, Email: ${user.email}`);

        return NextResponse.json({
            success: true,
            message: "Mot de passe modifié avec succès"
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}

