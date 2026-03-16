import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const LOG_PREFIX = "[API galao/absences]";

// Hack SSL comme pour les autres routes Galao
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// Utilitaire pour fusionner les cookies au fil des requêtes
function mergeCookies(baseCookies, newSetCookieHeader) {
    if (!newSetCookieHeader) return baseCookies;

    const cookieMap = new Map();
    baseCookies.split(";").forEach((c) => {
        const [key, value] = c.trim().split("=");
        if (key && value) cookieMap.set(key, value);
    });

    const parts = newSetCookieHeader.split(/,(?=\s*[\w-]+=)/);
    parts.forEach((part) => {
        const firstSegment = part.split(";")[0].trim();
        const [key, value] = firstSegment.split("=");
        if (key && value) cookieMap.set(key, value);
    });

    return Array.from(cookieMap.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const headersList = await headers();

        let galaoSession = cookieStore.get("galao_session")?.value || null;
        const galaoUid = cookieStore.get("galao_uid")?.value || null;

        if (!galaoSession || !galaoUid) {
            return NextResponse.json({ success: false, error: "Non connecté à Galao." }, { status: 401 });
        }

        const clientIp = headersList.get("x-forwarded-for") || "127.0.0.1";

        const commonHeaders = {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
            Connection: "keep-alive",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
            "X-Forwarded-For": clientIp,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
        };

        // Sac de cookies initial pour la fiche d'absences
        let currentCookies = `PHPSESSID=${galaoSession}; juryType=; soutType=; idChamp=id_abs; bilan=absence`;

        // 1) Menu apprenti : initialise/valide la session côté Galao
        console.log(`${LOG_PREFIX} 1. Menu apprenti (keep-alive)`);
        const menuResp = await fetch(
            `https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${encodeURIComponent(galaoUid)}`,
            {
                headers: {
                    ...commonHeaders,
                    Cookie: currentCookies,
                    Referer: "https://galao.cnam.fr/galao/",
                },
            },
        );
        currentCookies = mergeCookies(currentCookies, menuResp.headers.get("set-cookie"));

        // 2) visu_bilans : initialise la session pour le contexte "absence" (comme notes fait avec planning_individuel)
        // Sans cette étape, Galao peut refuser l'accès aux absences si on n'a pas "visitée" une page bilans avant
        console.log(`${LOG_PREFIX} 2. Setup visu_bilans (bilan=absence)`);
        const setupResp = await fetch(
            `https://galao.cnam.fr/galao/bilans/visu_bilans.php?uid=${encodeURIComponent(galaoUid)}&bilan=absence&liste=un&no_fiche=1`,
            {
                headers: {
                    ...commonHeaders,
                    Cookie: currentCookies,
                    Referer: `https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${encodeURIComponent(galaoUid)}`,
                },
            },
        );
        currentCookies = mergeCookies(currentCookies, setupResp.headers.get("set-cookie"));

        // 3) Fiche des absences
        console.log(`${LOG_PREFIX} 3. Récupération fiche absences`);
        const absUrl = new URL(
            "https://galao.cnam.fr/galao/fiche_perso/affiche_infos_absences_appren.php",
        );
        absUrl.searchParams.set("uid", galaoUid);
        absUrl.searchParams.set("bilan", "absence");

        const absResp = await fetch(absUrl.toString(), {
            headers: {
                ...commonHeaders,
                Cookie: currentCookies,
                Referer: `https://galao.cnam.fr/galao/bilans/affiche_boutons_bilans.php?uid=${encodeURIComponent(
                    galaoUid,
                )}`,
            },
        });

        const html = await absResp.text();

        // Session expirée / redirection vers login
        if (
            html.includes("Session has expired") ||
            html.includes('name="form_ident"') ||
            html.toLowerCase().includes("connexion")
        ) {
            console.error(`${LOG_PREFIX} Session Galao expirée (absences).`);

            const expiredResponse = NextResponse.json(
                {
                    success: false,
                    error: "Votre session Galao a expiré. Merci de vous reconnecter.",
                },
                { status: 401 },
            );

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

        return NextResponse.json({
            success: true,
            html,
        });
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur`, error);
        return NextResponse.json(
            { success: false, error: "Erreur lors de la récupération des absences Galao." },
            { status: 500 },
        );
    }
}

