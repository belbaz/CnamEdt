import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API signup]";
const EMAIL_PATTERN = /^([a-zA-ZÀ-ÖØ-öø-ÿ-]+)\.([a-zA-ZÀ-ÖØ-öø-ÿ-]+)(?:\.[^@]+)?@lecnam\.net$/i;

function capitalizeSegment(segment = "") {
    return segment
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("-")
        .trim();
}

function extractNamesFromEmail(email) {
    const match = email.match(EMAIL_PATTERN);
    if (!match) {
        return null;
    }
    const [, rawFirstName, rawLastName] = match;
    return {
        firstName: capitalizeSegment(rawFirstName.toLowerCase()),
        lastName: capitalizeSegment(rawLastName.toLowerCase()),
    };
}

async function sendActivationEmail({ to, link }) {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        throw new Error("Paramètres EMAIL_USER/EMAIL_PASS manquants.");
    }

    // const transporter = nodemailer.createTransport({
    //     service: "gmail",
    //     auth: { user, pass },
    // });

    const transporter = nodemailer.createTransport({
        service: 'gmail', auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const htmlContent = `
        <div style="font-family:Arial,sans-serif;color:#0f172a;padding:24px;background:#f8fafc;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:white;border-radius:18px;border:1px solid #e2e8f0;">
                <tr>
                    <td style="padding:32px;text-align:center;">
                        <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;">Activation de votre accès</h1>
                        <p style="margin:0 0 16px;font-size:16px;color:#475569;">
                            Bonjour, nous avons bien reçu une demande de création de compte pour <strong>${to}</strong>.
                        </p>
                        <p style="margin:0 0 24px;font-size:15px;color:#475569;">
                            Cliquez sur le bouton ci-dessous dans les 30 prochaines minutes pour activer votre accès à l'EDT CNAM.
                        </p>
                        <p style="margin:0 0 28px;">
                            <a href="${link}" style="display:inline-block;padding:14px 30px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;">
                                Activer mon compte
                            </a>
                        </p>
                        <p style="margin:0;font-size:13px;color:#94a3b8;">
                            Le bouton ne répond pas ? <a href="${link}" style="color:#2563eb;text-decoration:none;font-weight:600;">Cliquez ici</a>
                        </p>
                    </td>
                </tr>
            </table>
        </div>
    `;

    await transporter.sendMail({
        from: `"EDT CNAM" <${user}>`,
        to,
        subject: "Activez votre compte EDT CNAM",
        html: htmlContent,
    });
}

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
            console.warn(`${LOG_PREFIX} Rejet email hors domaine: ${email}`);
            return NextResponse.json(
                { error: "Seules les adresses @lecnam.net sont autorisées." },
                { status: 400 },
            );
        }

        const derivedNames = extractNamesFromEmail(email);
        if (!derivedNames) {
            console.warn(`${LOG_PREFIX} Format email invalide pour extraire le nom: ${email}`);
            return NextResponse.json(
                { error: "Format d'adresse invalide. Utilisez prenom.nom@lecnam.net." },
                { status: 400 },
            );
        }

        const { firstName, lastName } = derivedNames;

        const { data: existingUser, error: existingError } = await supabase
            .from("edt_user")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (existingError && existingError.code !== "PGRST116") {
            console.error(`${LOG_PREFIX} Erreur vérification email`, existingError);
            return NextResponse.json(
                { error: "Impossible de vérifier l'existence du compte." },
                { status: 500 },
            );
        }

        if (existingUser) {
            return NextResponse.json(
                { error: "Cette adresse dispose déjà d'un compte actif." },
                { status: 409 },
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

        const hashTarget = `${password}:${pepper}`;
        const hashedPassword = await bcrypt.hash(hashTarget, 12);

        const { data: newUser, error: insertError } = await supabase
            .from("edt_user")
            .insert({
                name: firstName,
                last_name: lastName,
                email,
                password: hashedPassword,
                is_active: false,
                role: "editeur",
                date_online: new Date().toISOString(),
            })
            .select("id, email, role")
            .single();

        if (insertError) {
            console.error(`${LOG_PREFIX} Erreur insertion utilisateur`, insertError);
            return NextResponse.json(
                { error: "Impossible de créer le compte pour le moment." },
                { status: 500 },
            );
        }

        const activationToken = jwt.sign(
            {
                email,
                purpose: "account-activation",
            },
            pepper,
            { expiresIn: "30m" },
        );

        const activationLinkBase = process.env.ACTIVATION_BASE_URL || "https://myedt.vercel.app";
        const activationUrl = `${activationLinkBase.replace(/\/$/, "")}/activeAccount?token=${encodeURIComponent(
            activationToken,
        )}`;

        try {
            await sendActivationEmail({ to: email, link: activationUrl });
        } catch (mailError) {
            console.error(`${LOG_PREFIX} Envoi email échoué`, mailError);
            return NextResponse.json(
                { error: "Compte créé mais email non envoyé. Contactez un admin." },
                { status: 500 },
            );
        }

        return NextResponse.json(
            {
                message: "Compte créé avec succès.",
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role,
                    name: firstName,
                    lastName,
                },
                activationToken,
                expiresInMinutes: 30,
                activationUrl,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue`, error);
        return NextResponse.json(
            { error: "Erreur interne lors de la création du compte." },
            { status: 500 },
        );
    }
}


