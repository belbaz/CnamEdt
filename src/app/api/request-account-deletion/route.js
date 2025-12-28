import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";
import { verifySessionToken } from "@/lib/sessionToken";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API request-account-deletion]";

async function sendDeletionRequestEmail({ to, userName, userId, userEmail }) {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const persoMail = process.env.PERSO_MAIL;

    if (!user || !pass) {
        throw new Error("Paramètres EMAIL_USER/EMAIL_PASS manquants.");
    }

    if (!persoMail) {
        throw new Error("Paramètre PERSO_MAIL manquant dans .env");
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const htmlContent = `
        <div style="font-family:Arial,sans-serif;color:#0f172a;padding:24px;background:#f8fafc;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:white;border-radius:18px;border:1px solid #e2e8f0;">
                <tr>
                    <td style="padding:32px;">
                        <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;">Demande de suppression de compte</h1>
                        <p style="margin:0 0 16px;font-size:16px;color:#475569;">
                            Une demande de suppression de compte a été effectuée.
                        </p>
                        <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:16px 0;">
                            <p style="margin:0 0 8px;font-size:14px;color:#64748b;"><strong>Nom du compte :</strong></p>
                            <p style="margin:0 0 16px;font-size:16px;color:#0f172a;">${userName}</p>
                            
                            <p style="margin:0 0 8px;font-size:14px;color:#64748b;"><strong>Email :</strong></p>
                            <p style="margin:0 0 16px;font-size:16px;color:#0f172a;">${userEmail}</p>
                            
                            <p style="margin:0 0 8px;font-size:14px;color:#64748b;"><strong>User ID :</strong></p>
                            <p style="margin:0;font-size:16px;color:#0f172a;">${userId}</p>
                        </div>
                        <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
                            Date de la demande : ${new Date().toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </td>
                </tr>
            </table>
        </div>
    `;

    await transporter.sendMail({
        from: `"EDT CNAM" <${user}>`,
        to: persoMail,
        subject: `[EDT CNAM] Demande de suppression de compte - ${userName}`,
        html: htmlContent,
    });
}

export async function POST(request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;

        if (!session) {
            return NextResponse.json(
                { error: "Non authentifié" },
                { status: 401 }
            );
        }

        // Vérifier le token JWT pour obtenir l'ID utilisateur
        const tokenData = verifySessionToken(session);

        if (!tokenData || !tokenData.sub) {
            return NextResponse.json(
                { error: "Session invalide" },
                { status: 401 }
            );
        }

        const userId = tokenData.sub;

        // Récupérer les informations complètes de l'utilisateur depuis la DB
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            return NextResponse.json(
                { error: "Erreur serveur" },
                { status: 500 }
            );
        }

        const { data: dbUser, error: dbError } = await supabase
            .from('edt_user')
            .select('id, email, name, last_name')
            .eq('id', userId)
            .maybeSingle();

        if (dbError) {
            console.error(`${LOG_PREFIX} Erreur récupération DB:`, dbError);
            return NextResponse.json(
                { error: "Erreur lors de la récupération des informations" },
                { status: 500 }
            );
        }

        if (!dbUser) {
            return NextResponse.json(
                { error: "Utilisateur introuvable" },
                { status: 404 }
            );
        }

        const userName = `${dbUser.name || ''} ${dbUser.last_name || ''}`.trim() || dbUser.email;
        const userEmail = dbUser.email;

        // Envoyer l'email
        try {
            await sendDeletionRequestEmail({
                to: process.env.PERSO_MAIL,
                userName,
                userId: dbUser.id,
                userEmail
            });
        } catch (mailError) {
            console.error(`${LOG_PREFIX} Envoi email échoué`, mailError);
            return NextResponse.json(
                { error: "Impossible d'envoyer l'email. Réessayez plus tard." },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                message: "Votre demande de suppression de compte a été envoyée avec succès.",
            },
            { status: 200 }
        );
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue`, error);
        return NextResponse.json(
            { error: "Erreur interne lors de la demande de suppression." },
            { status: 500 }
        );
    }
}

