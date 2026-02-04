import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// 1. CONFIGURATION VERCEL CRITIQUE
// Empêche Vercel de mettre en cache la réponse (sinon il sert des cookies périmés)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const LOG_PREFIX = "[API galao/notes]";

// Hack SSL pour les vieux serveurs (comme Galao)
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// Petite fonction utilitaire pour trouver un cookie spécifique dans les headers
function getCookieValue(setCookieHeader, cookieName) {
    if (!setCookieHeader) return null;
    // On cherche "PHPSESSID=quelquechose;"
    const regex = new RegExp(`${cookieName}=([^;]+)`);
    const match = setCookieHeader.match(regex);
    return match ? match[1] : null;
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        let galaoSession = cookieStore.get("galao_session")?.value || null;
        const galaoUid = cookieStore.get("galao_uid")?.value || null;

        if (!galaoSession || !galaoUid) {
            return NextResponse.json(
                { success: false, error: "Session manquante." },
                { status: 401 }
            );
        }

        const baseHeaders = {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive",
            "DNT": "1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        };

        // --- ÉTAPE 1 : Setup (Visu Bilans) ---
        // On initialise la session côté serveur Galao
        const setupResponse = await fetch(`https://galao.cnam.fr/galao/bilans/visu_bilans.php?uid=${galaoUid}&bilan=planning_individuel&liste=un&no_fiche=1`, {
            method: "GET",
            headers: {
                ...baseHeaders,
                "Cookie": `PHPSESSID=${galaoSession}; juryType=; soutType=; idChamp=id_acc; bilan=academique_courant`,
                "Referer": `https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${encodeURIComponent(galaoUid)}`
            }
        });

        // VÉRIFICATION DE ROTATION DE COOKIE (ÉTAPE 1)
        // Si le serveur nous donne un nouveau cookie ici, on doit le capturer !
        const setCookie1 = setupResponse.headers.get("set-cookie");
        const newSession1 = getCookieValue(setCookie1, "PHPSESSID");

        if (newSession1 && newSession1 !== galaoSession) {
            console.log(`${LOG_PREFIX} Changement de session détecté (étape 1) : ${newSession1}`);
            galaoSession = newSession1; // On met à jour la variable pour l'étape suivante
        }

        // --- ÉTAPE 2 : Récupération des notes ---
        // On utilise 'galaoSession' qui est peut-être le NOUVEAU cookie
        const bilanUrl = `https://galao.cnam.fr/galao/bilans/affiche_onglets_bilans_result.php?uid=${galaoUid}&bilan=academique_courant`;

        const galaoResponse = await fetch(bilanUrl, {
            method: "GET",
            headers: {
                ...baseHeaders,
                "Cookie": `PHPSESSID=${galaoSession}; juryType=; soutType=; idChamp=id_acc; bilan=academique_courant`,
                "Referer": `https://galao.cnam.fr/galao/bilans/affiche_boutons_bilans.php?uid=${encodeURIComponent(galaoUid)}`,
            }
        });

        if (!galaoResponse.ok) {
            return NextResponse.json(
                { success: false, error: "Erreur serveur Galao." },
                { status: 502 }
            );
        }

        const html = await galaoResponse.text();

        // Vérification erreur
        if (html.includes("Session has expired") || html.includes("connexion")) {
            return NextResponse.json(
                { success: false, error: "La session a expiré (Blocage IP probable)." },
                { status: 401 }
            );
        }

        // --- ÉTAPE FINALE : Synchronisation avec le navigateur ---
        const response = NextResponse.json({
            success: true,
            html,
        });

        // On regarde si un nouveau cookie est arrivé à l'étape 2 aussi
        const setCookie2 = galaoResponse.headers.get("set-cookie");
        const newSession2 = getCookieValue(setCookie2, "PHPSESSID");

        // Si on a un nouveau cookie (soit de l'étape 1, soit de l'étape 2),
        // on force le navigateur de l'utilisateur à le sauvegarder.
        const finalSession = newSession2 || (newSession1 !== galaoSession ? galaoSession : null);

        if (finalSession) {
            console.log(`${LOG_PREFIX} Mise à jour du cookie utilisateur : ${finalSession}`);
            response.cookies.set("galao_session", finalSession, {
                httpOnly: true,
                secure: true, // Très important pour Vercel (HTTPS)
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60 * 2 // 2 heures
            });
        }

        return response;

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur`, error);
        return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 });
    }
}