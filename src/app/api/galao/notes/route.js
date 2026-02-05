import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

// Configuration Vercel : Pas de cache, toujours dynamique
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const LOG_PREFIX = "[API galao/notes]";

// Hack SSL
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// Fonction pour fusionner intelligemment les cookies
function mergeCookies(baseCookies, newSetCookieHeader) {
    if (!newSetCookieHeader) return baseCookies;

    // On transforme la string "a=1; b=2" en Map
    const cookieMap = new Map();
    baseCookies.split(';').forEach(c => {
        const [key, value] = c.trim().split('=');
        if (key && value) cookieMap.set(key, value);
    });

    // On ajoute les nouveaux (format Set-Cookie peut être complexe, on simplifie)
    // Vercel/Node combine parfois les Set-Cookie avec des virgules
    const parts = newSetCookieHeader.split(/,(?=\s*[\w-]+=)/);
    parts.forEach(part => {
        const firstSegment = part.split(';')[0].trim();
        const [key, value] = firstSegment.split('=');
        if (key && value) cookieMap.set(key, value);
    });

    // On retransforme en string
    return Array.from(cookieMap.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const headersList = await headers();

        let galaoSession = cookieStore.get("galao_session")?.value || null;
        const galaoUid = cookieStore.get("galao_uid")?.value || null;

        if (!galaoSession || !galaoUid) {
            return NextResponse.json({ success: false, error: "Non connecté" }, { status: 401 });
        }

        // --- ASTUCE IP SPOOFING ---
        // On essaie de dire à Galao "C'est bon, je suis bien l'utilisateur d'origine"
        // en lui envoyant ton IP réelle via X-Forwarded-For
        const clientIp = headersList.get("x-forwarded-for") || "127.0.0.1";

        const commonHeaders = {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
            "Connection": "keep-alive",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
            "X-Forwarded-For": clientIp, // On tente de passer ton IP
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        };

        // On construit notre "Sac à cookies" qui va grossir à chaque étape
        let currentCookies = `PHPSESSID=${galaoSession}; juryType=; soutType=; idChamp=id_acc; bilan=academique_courant`;

        // ============================================================
        // ÉTAPE 1 : LE MENU (La résurrection)
        // C'est cette page qui valide le changement d'IP sur les vieux PHP
        // ============================================================
        console.log(`${LOG_PREFIX} 1. Appel Menu pour valider session...`);
        const menuResp = await fetch(`https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${galaoUid}`, {
            headers: {
                ...commonHeaders,
                "Cookie": currentCookies,
                "Referer": "https://galao.cnam.fr/galao/"
            }
        });

        // On capture immédiatement les nouveaux cookies
        currentCookies = mergeCookies(currentCookies, menuResp.headers.get("set-cookie"));

        // ============================================================
        // ÉTAPE 2 : VISU BILANS (Le Setup)
        // ============================================================
        console.log(`${LOG_PREFIX} 2. Setup Variables...`);
        const setupResp = await fetch(`https://galao.cnam.fr/galao/bilans/visu_bilans.php?uid=${galaoUid}&bilan=planning_individuel&liste=un&no_fiche=1`, {
            headers: {
                ...commonHeaders,
                "Cookie": currentCookies,
                "Referer": `https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${galaoUid}`
            }
        });

        currentCookies = mergeCookies(currentCookies, setupResp.headers.get("set-cookie"));

        // ============================================================
        // ÉTAPE 3 : LES RÉSULTATS
        // ============================================================
        console.log(`${LOG_PREFIX} 3. Récupération des notes...`);
        const finalResp = await fetch(`https://galao.cnam.fr/galao/bilans/affiche_onglets_bilans_result.php?uid=${galaoUid}&bilan=academique_courant`, {
            headers: {
                ...commonHeaders,
                "Cookie": currentCookies,
                "Referer": `https://galao.cnam.fr/galao/bilans/affiche_boutons_bilans.php?uid=${galaoUid}`
            }
        });

        const html = await finalResp.text();

        // Vérification ultime : session expirée / redirigée vers l'écran de connexion Galao
        if (html.includes("Session has expired") || html.includes('name="form_ident"')) {
            console.error(`${LOG_PREFIX} ECHEC : Session expirée malgré les efforts.`);

            const expiredResponse = NextResponse.json(
                {
                    success: false,
                    error: "Votre session Galao a expiré. Merci de vous reconnecter.",
                },
                { status: 401 },
            );

            // On nettoie les cookies de session côté serveur + flag client
            expiredResponse.cookies.set("galao_session", "", {
                httpOnly: true,
                secure: true,
                sameSite: "lax",
                path: "/",
                maxAge: 0,
            });
            expiredResponse.cookies.set("galao_uid", "", {
                httpOnly: true,
                secure: true,
                sameSite: "lax",
                path: "/",
                maxAge: 0,
            });
            expiredResponse.cookies.set("galao_client", "", {
                httpOnly: false,
                secure: true,
                sameSite: "lax",
                path: "/",
                maxAge: 0,
            });

            return expiredResponse;
        }

        // ============================================================
        // SAUVEGARDE : On renvoie le cookie le plus récent au navigateur
        // ============================================================
        const response = NextResponse.json({ success: true, html });

        // On extrait le PHPSESSID final de notre "Sac à cookies" à jour
        const finalSessionMatch = currentCookies.match(/PHPSESSID=([^;]+)/);
        const finalSession = finalSessionMatch ? finalSessionMatch[1] : null;

        if (finalSession && finalSession !== galaoSession) {
            console.log(`${LOG_PREFIX} Mise à jour cookie client : ${finalSession}`);
            response.cookies.set("galao_session", finalSession, {
                httpOnly: true,
                secure: true,
                sameSite: "lax",
                path: "/",
            });
        }

        return response;

    } catch (error) {
        console.error("Erreur API:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}