// @ts-nocheck
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API forgot-password]";

async function sendResetPasswordEmail({ to, link }) {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        throw new Error("Paramètres EMAIL_USER/EMAIL_PASS manquants.");
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const currentYear = new Date().getFullYear();
    const htmlContent = `
        <div style="font-family:Arial,sans-serif;color:#0f172a;padding:24px;background:#f8fafc;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:white;border-radius:18px;border:1px solid #e2e8f0;">
                <tr>
                    <td style="padding:32px;text-align:center;">
                        <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;">Réinitialisation de mot de passe</h1>
                        <p style="margin:0 0 16px;font-size:16px;color:#475569;">
                            Bonjour, nous avons reçu une demande de réinitialisation de mot de passe pour <strong>${to}</strong>.
                        </p>
                        <p style="margin:0 0 24px;font-size:15px;color:#475569;">
                            Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe.<br />
                            Le lien est valide <strong>15 minutes</strong>.
                        </p>
                        <p style="margin:0 0 28px;">
                            <a href="${link}" style="display:inline-block;padding:14px 30px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;">
                                Réinitialiser mon mot de passe
                            </a>
                        </p>
                        <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">
                            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                        </p>
                        <p style="margin:0;font-size:12px;color:#94a3b8;">
                            © ${currentYear} EdtCnam <a href="https://myedt.vercel.app" style="color:#2563eb;text-decoration:none;">myedt.vercel.app</a>
                        </p>
                    </td>
                </tr>
            </table>
        </div>
    `;

    await transporter.sendMail({
        from: `"EDT CNAM" <${user}>`,
        to,
        subject: "Réinitialisation de votre mot de passe EDT CNAM",
        html: htmlContent,
    });
}

export async function POST(request) {
    try {
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            return NextResponse.json(
                { error: "Service indisponible, contactez l'administrateur." },
                { status: 500 },
            );
        }

        const body = await request.json();
        const email = body?.email?.toLowerCase().trim();

        if (!email) {
            return NextResponse.json(
                { error: "Email requis." },
                { status: 400 },
            );
        }

        if (!email.endsWith("@lecnam.net")) {
            return NextResponse.json(
                { error: "Seules les adresses @lecnam.net sont autorisées." },
                { status: 400 },
            );
        }

        // Vérifier que l'utilisateur existe
        const { data: user, error: userError } = await supabase
            .from("edt_user")
            .select("id, email, is_active")
            .eq("email", email)
            .maybeSingle();

        if (userError && userError.code !== "PGRST116") {
            console.error(`${LOG_PREFIX} Erreur vérification utilisateur`, userError);
            return NextResponse.json(
                { error: "Impossible de vérifier le compte." },
                { status: 500 },
            );
        }

        // Ne pas révéler si l'utilisateur existe ou non (sécurité)
        // On envoie toujours le même message pour éviter l'énumération d'emails
        if (!user) {
            // On retourne quand même un succès pour ne pas révéler que l'email n'existe pas
            return NextResponse.json(
                {
                    message: "Si cette adresse existe, un email de réinitialisation a été envoyé.",
                },
                { status: 200 },
            );
        }

        if (!user.is_active) {
            return NextResponse.json(
                { error: "Ce compte n'est pas activé. Vérifiez votre email d'activation." },
                { status: 403 },
            );
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error(`${LOG_PREFIX} JWT_SECRET manquant`);
            return NextResponse.json(
                { error: "Configuration de sécurité incomplète." },
                { status: 500 },
            );
        }

        // Créer un token JWT valide 15 minutes
        const resetToken = jwt.sign(
            {
                email,
                purpose: "password-reset",
            },
            secret,
            { expiresIn: "15m" },
        );

        // Hasher le token pour le stocker dans la DB (sécurité)
        const tokenHash = await bcrypt.hash(resetToken, 10);

        // Stocker le hash du token dans la DB pour vérifier qu'il n'a pas été utilisé
        const { error: updateTokenError } = await supabase
            .from("edt_user")
            .update({
                password_reset_token_hash: tokenHash,
            })
            .eq("email", email);

        if (updateTokenError) {
            console.error(`${LOG_PREFIX} Erreur stockage token hash`, updateTokenError);
            return NextResponse.json(
                { error: "Impossible de préparer la réinitialisation. Réessayez plus tard." },
                { status: 500 },
            );
        }

        const resetLinkBase = process.env.ACTIVATION_BASE_URL || "https://myedt.vercel.app";
        const resetUrl = `${resetLinkBase.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(resetToken)}`;

        try {
            await sendResetPasswordEmail({ to: email, link: resetUrl });
        } catch (mailError) {
            console.error(`${LOG_PREFIX} Envoi email échoué`, mailError);
            // Annuler le token stocké si l'email n'a pas pu être envoyé
            await supabase
                .from("edt_user")
                .update({ password_reset_token_hash: null })
                .eq("email", email);
            return NextResponse.json(
                { error: "Impossible d'envoyer l'email. Réessayez plus tard." },
                { status: 500 },
            );
        }

        return NextResponse.json(
            {
                message: "Si cette adresse existe, un email de réinitialisation a été envoyé.",
                expiresInMinutes: 15,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue`, error);
        return NextResponse.json(
            { error: "Erreur interne lors de la demande de réinitialisation." },
            { status: 500 },
        );
    }
}


