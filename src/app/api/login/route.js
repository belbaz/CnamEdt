import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { createSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/sessionToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API login]";

export async function POST(request) {
    try {
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable (env manquantes)`);
            return NextResponse.json(
                { error: "Service indisponible, contactez l'administrateur." },
                { status: 500 },
            );
        }

        const body = await request.json();
        const email = body?.email?.toLowerCase().trim();
        const password = body?.password;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email et mot de passe sont requis." },
                { status: 400 },
            );
        }

        if (!email.endsWith("@lecnam.net")) {
            return NextResponse.json(
                { error: "Seules les adresses @lecnam.net sont autorisées." },
                { status: 400 },
            );
        }

        const pepper = process.env.JWT_SECRET;
        if (!pepper) {
            console.error(`${LOG_PREFIX} JWT_SECRET manquant pour le hachage`);
            return NextResponse.json(
                { error: "Configuration de sécurité incomplète." },
                { status: 500 },
            );
        }

        const { data: user, error: fetchError } = await supabase
            .from("edt_user")
            .select("id, name, last_name, email, password, is_active, role")
            .eq("email", email)
            .maybeSingle();

        if (fetchError && fetchError.code !== "PGRST116") {
            console.error(`${LOG_PREFIX} Erreur récupération utilisateur`, fetchError);
            return NextResponse.json(
                { error: "Impossible de vérifier vos identifiants." },
                { status: 500 },
            );
        }

        if (!user) {
            return NextResponse.json(
                { error: "Identifiants invalides." },
                { status: 401 },
            );
        }

        if (!user.is_active) {
            return NextResponse.json(
                { error: "Compte non activé. Consultez votre email d'activation." },
                { status: 403 },
            );
        }

        const isPasswordValid = await bcrypt.compare(`${password}:${pepper}`, user.password);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Identifiants invalides." },
                { status: 401 },
            );
        }

        const { error: updateError } = await supabase
            .from("edt_user")
            .update({ date_online: new Date().toISOString() })
            .eq("id", user.id);

        if (updateError) {
            console.warn(`${LOG_PREFIX} Impossible de mettre à jour date_online`, updateError);
        }

        const sessionToken = createSessionToken({
            sub: user.id,
            email: user.email,
            name: user.name,
            lastName: user.last_name,
            role: user.role,
        });

        const response = NextResponse.json({
            message: "Connexion réussie.",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                lastName: user.last_name,
                role: user.role,
            },
        });

        response.cookies.set({
            name: "edt_session",
            value: sessionToken,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: SESSION_MAX_AGE_SECONDS,
        });

        return response;
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue`, error);
        return NextResponse.json(
            { error: "Erreur interne lors de la connexion." },
            { status: 500 },
        );
    }
}


