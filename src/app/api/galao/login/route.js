import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API galao/login]";
const GALAO_LOGIN_URL = "https://galao.cnam.fr/galao/entree/identification_visiteur.php";

// Désactiver la vérification SSL pour les requêtes Galao uniquement
// Le serveur Galao utilise un certificat SSL invalide/auto-signé
const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function POST(request) {
    try {
        const body = await request.json();
        const rawUsername = body?.username ?? "";
        const rawPassword = body?.password ?? "";

        const username = String(rawUsername).trim();
        const password = String(rawPassword);

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: "Nom d'utilisateur Galao et mot de passe sont requis." },
                { status: 400 },
            );
        }

        // Construction du body de formulaire, comme dans la requête cURL fournie
        const form = new URLSearchParams();
        form.set("ecole", "-1");
        form.set("ecole_type", "1");
        form.set("centre", "6");
        form.set("user", username);
        form.set("password", password); // URLSearchParams se charge de l'encoding
        form.set("ch_ecole", "-1");
        form.set("bouton", "Entrer dans GALAO");

        // 1) Initialiser une session comme le navigateur : GET sur /eiparis/index.php pour récupérer un PHPSESSID
        const landingHeaders = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
            Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            DNT: "1",
            Connection: "keep-alive",
        };

        const landingResponse = await fetch("https://galao.cnam.fr/eiparis/index.php", {
            method: "GET",
            headers: landingHeaders,
            redirect: "manual"
        });

        const landingSetCookie = landingResponse.headers.get("set-cookie") || "";
        const initialPhpSessMatch = landingSetCookie.match(/PHPSESSID=([^;]+)/i);
        const initialPhpSess = initialPhpSessMatch ? initialPhpSessMatch[1] : null;

        if (!initialPhpSess) {
            console.warn(`${LOG_PREFIX} Impossible de récupérer un PHPSESSID initial depuis /eiparis/index.php`);
        }

        // 2) Appeler la page de login avec ce PHPSESSID, comme dans ta requête cURL
        const loginHeaders = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            Origin: "https://galao.cnam.fr",
            Referer: "https://galao.cnam.fr/eiparis/index.php",
            DNT: "1",
            "Upgrade-Insecure-Requests": "1",
            // Utiliser le PHPSESSID initial si on l'a, pour garder la même session
            ...(initialPhpSess
                ? {
                    Cookie: `PHPSESSID=${initialPhpSess}; juryType=; soutType=; idChamp=id_acc; bilan=academique_courant`,
                }
                : {}),
        };

        // On ne suit PAS automatiquement la redirection pour pouvoir lire le Location + Set-Cookie
        const galaoResponse = await fetch(GALAO_LOGIN_URL, {
            method: "POST",
            headers: loginHeaders,
            body: form.toString(),
            redirect: "manual"
        });

        const status = galaoResponse.status;

        // Cas le plus courant en cas d'erreur de login : page HTML 200 sans redirection
        if (status !== 302 && status !== 303) {
            console.warn(`${LOG_PREFIX} Pas de redirection après login (status=${status})`);
            return NextResponse.json(
                {
                    success: false,
                    error: "Impossible de se connecter à Galao. Vérifiez vos identifiants.",
                },
                { status: 401 },
            );
        }

        const location = galaoResponse.headers.get("location");
        if (!location) {
            console.warn(`${LOG_PREFIX} Redirection sans header Location`);
            return NextResponse.json(
                {
                    success: false,
                    error: "Réponse Galao inattendue (aucune URL de redirection reçue).",
                },
                { status: 502 },
            );
        }

        // Normaliser l'URL de redirection (relative ou absolue)
        let finalUrl;
        try {
            finalUrl = new URL(location, GALAO_LOGIN_URL);
        } catch (err) {
            console.error(`${LOG_PREFIX} URL de redirection invalide`, location, err);
            return NextResponse.json(
                {
                    success: false,
                    error: "Réponse Galao invalide (URL de redirection incorrecte).",
                },
                { status: 502 },
            );
        }

        // On ne considère la connexion réussie que si Galao nous redirige vers le menu apprenti
        if (!finalUrl.pathname.includes("/galao/menus/menu_apprenti.php")) {
            console.warn(
                `${LOG_PREFIX} Redirection vers une page inattendue après login`,
                finalUrl.toString(),
            );
            return NextResponse.json(
                {
                    success: false,
                    error: "Identifiants Galao invalides",
                },
                { status: 401 },
            );
        }

        const uid = finalUrl.searchParams.get("uid");
        if (!uid) {
            console.warn(`${LOG_PREFIX} Aucun paramètre uid dans l'URL de redirection`, finalUrl.toString());
            return NextResponse.json(
                {
                    success: false,
                    error: "Connexion Galao réussie mais UID introuvable dans la redirection.",
                },
                { status: 502 },
            );
        }

        // Extraire le cookie PHPSESSID depuis les headers Set-Cookie renvoyés par Galao
        const setCookieHeader = galaoResponse.headers.get("set-cookie") || "";
        let phpSessionId = initialPhpSess || null;

        const phpSessMatch = setCookieHeader.match(/PHPSESSID=([^;]+)/i);
        if (phpSessMatch) {
            phpSessionId = phpSessMatch[1];
        }

        if (!phpSessionId) {
            console.warn(`${LOG_PREFIX} Aucun cookie PHPSESSID trouvé dans Set-Cookie`, setCookieHeader);
            return NextResponse.json(
                {
                    success: false,
                    error: "Connexion Galao réussie mais cookie de session introuvable.",
                },
                { status: 502 },
            );
        }

        // Construire la réponse côté EDT : on enregistre les infos Galao dans des cookies
        const response = NextResponse.json({
            success: true,
            uid,
        });

        const secure = process.env.NODE_ENV === "production";

        // Cookie de session Galao (valeur de PHPSESSID) - HTTP-only pour les appels serveur
        response.cookies.set({
            name: "galao_session",
            value: phpSessionId,
            httpOnly: true,
            sameSite: "lax",
            secure,
            path: "/",
            maxAge: 60 * 60 * 24 * 30, // 30 Jours
        });

        // UID Galao pour réutilisation rapide côté backend
        response.cookies.set({
            name: "galao_uid",
            value: uid,
            httpOnly: true,
            sameSite: "lax",
            secure,
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
        });

        // Indicateur côté navigateur pour savoir si une session Galao existe
        // (non httpOnly, juste un flag, la vraie sécurité reste côté serveur)
        response.cookies.set({
            name: "galao_client",
            value: "1",
            httpOnly: false,
            sameSite: "lax",
            secure,
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
        });

        return response;
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue`, error);
        const message =
            error && typeof error.message === "string"
                ? error.message
                : "Erreur interne lors de la connexion à Galao.";

        return NextResponse.json(
            {
                success: false,
                error: `Erreur interne lors de la connexion à Galao : ${message}`,
            },
            { status: 502 },
        );
    }
}

