// @ts-nocheck
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API activate-account]";

export async function POST(request) {
    try {
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase indisponible`);
            return NextResponse.json({ error: "Service indisponible." }, { status: 500 });
        }

        const body = await request.json();
        const token = body?.token;
        const action = body?.action ?? "activate";

        if (!token) {
            return NextResponse.json({ error: "Token d'activation requis." }, { status: 400 });
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

        if (payload?.purpose !== "account-activation" || !payload?.email) {
            console.warn(`${LOG_PREFIX} Token sans email/purpose`);
            return NextResponse.json({ error: "Lien d'activation invalide." }, { status: 401 });
        }

        const email = payload.email.toLowerCase();

        if (action === "validate") {
            return NextResponse.json({
                valid: true,
                email,
                expiresAt: payload.exp ? payload.exp * 1000 : null,
            });
        }

        const { data: updatedUser, error: updateError } = await supabase
            .from("edt_user")
            .update({
                is_active: true,
                date_online: new Date().toISOString(),
            })
            .eq("email", email)
            .select("id, email, is_active")
            .maybeSingle();

        if (updateError) {
            console.error(`${LOG_PREFIX} Erreur update Supabase`, updateError);
            return NextResponse.json(
                { error: "Impossible d'activer le compte pour le moment." },
                { status: 500 },
            );
        }

        if (!updatedUser) {
            return NextResponse.json(
                { error: "Utilisateur introuvable pour ce lien." },
                { status: 404 },
            );
        }

        if (!updatedUser.is_active) {
            // Cas improbable (trigger before update), on renvoie 500 pour cohérence
            return NextResponse.json(
                { error: "Activation non confirmée, réessayez." },
                { status: 500 },
            );
        }

        return NextResponse.json({
            message: "Compte activé avec succès.",
            email: updatedUser.email,
        });
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue`, error);
        return NextResponse.json(
            { error: "Erreur interne lors de l'activation du compte." },
            { status: 500 },
        );
    }
}



