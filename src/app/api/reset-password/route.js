import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const LOG_PREFIX = "[API reset-password]";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
    try {
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase indisponible`);
            return NextResponse.json({ error: "Service indisponible." }, { status: 500 });
        }

        const body = await request.json();
        const token = body?.token;
        const password = body?.password;
        const action = body?.action ?? "reset";

        if (!token) {
            return NextResponse.json({ error: "Token de réinitialisation requis." }, { status: 400 });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error(`${LOG_PREFIX} JWT_SECRET manquant`);
            return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 500 });
        }

        let payload;
        try {
            payload = jwt.verify(token, secret);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Token invalide`, error);
            return NextResponse.json({ error: "Lien expiré ou invalide." }, { status: 401 });
        }

        if (payload?.purpose !== "password-reset" || !payload?.email) {
            console.warn(`${LOG_PREFIX} Token sans email/purpose`);
            return NextResponse.json({ error: "Lien de réinitialisation invalide." }, { status: 401 });
        }

        const email = payload.email.toLowerCase();

        // Vérifier que l'utilisateur existe et récupérer le hash du token stocké
        const { data: user, error: userError } = await supabase
            .from("edt_user")
            .select("id, email, password_reset_token_hash")
            .eq("email", email)
            .maybeSingle();

        if (userError) {
            console.error(`${LOG_PREFIX} Erreur récupération utilisateur`, userError);
            return NextResponse.json({ error: "Erreur lors de la vérification." }, { status: 500 });
        }

        if (!user) {
            return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
        }

        // Vérifier que le token n'a pas déjà été utilisé (le hash doit exister)
        if (!user.password_reset_token_hash) {
            return NextResponse.json(
                { error: "Ce lien de réinitialisation a déjà été utilisé ou est invalide." },
                { status: 401 },
            );
        }

        // Vérifier que le token correspond au hash stocké
        const tokenMatches = await bcrypt.compare(token, user.password_reset_token_hash);
        if (!tokenMatches) {
            return NextResponse.json(
                { error: "Ce lien de réinitialisation n'est plus valide." },
                { status: 401 },
            );
        }

        // Mode validation (pour vérifier le token avant d'afficher le formulaire)
        if (action === "validate") {
            return NextResponse.json({
                valid: true,
                email,
                expiresAt: payload.exp ? payload.exp * 1000 : null,
            });
        }

        // Mode reset (pour réinitialiser le mot de passe)
        if (!password) {
            return NextResponse.json({ error: "Mot de passe requis." }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Le mot de passe doit contenir au moins 8 caractères." },
                { status: 400 },
            );
        }

        const pepper = process.env.JWT_SECRET;
        const hashTarget = `${password}:${pepper}`;
        const hashedPassword = await bcrypt.hash(hashTarget, 12);

        // Mettre à jour le mot de passe ET supprimer le token hash (marquer comme utilisé)
        const { data: updatedUser, error: updateError } = await supabase
            .from("edt_user")
            .update({
                password: hashedPassword,
                password_reset_token_hash: null, // Supprimer le token pour qu'il ne puisse plus être utilisé
                date_online: new Date().toISOString(),
            })
            .eq("email", email)
            .eq("password_reset_token_hash", user.password_reset_token_hash) // Vérifier que le token n'a pas changé entre temps
            .select("id, email")
            .maybeSingle();

        if (updateError) {
            console.error(`${LOG_PREFIX} Erreur update Supabase`, updateError);
            return NextResponse.json(
                { error: "Impossible de réinitialiser le mot de passe pour le moment." },
                { status: 500 },
            );
        }

        if (!updatedUser) {
            // Le token a peut-être été utilisé entre temps
            return NextResponse.json(
                { error: "Ce lien de réinitialisation a déjà été utilisé ou n'est plus valide." },
                { status: 401 },
            );
        }

        return NextResponse.json({
            message: "Mot de passe réinitialisé avec succès.",
            email: updatedUser.email,
        });
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue`, error);
        return NextResponse.json(
            { error: "Erreur interne lors de la réinitialisation du mot de passe." },
            { status: 500 },
        );
    }
}

