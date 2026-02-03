import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API galao/notes]";

// Hack SSL obligatoire pour Next.js sur vieux serveurs
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const galaoSession = cookieStore.get("galao_session")?.value || null;
        const galaoUid = cookieStore.get("galao_uid")?.value || null;

        if (!galaoSession || !galaoUid) {
            return NextResponse.json(
                { success: false, error: "Session manquante." },
                { status: 401 }
            );
        }

        const baseHeaders = {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Connection: "keep-alive", // Vital pour la vitesse
            DNT: "1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
            "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            // On injecte directement les cookies que 'fonction.js' aurait créés
            Cookie: `PHPSESSID=${galaoSession}; juryType=; soutType=; idChamp=id_acc; bilan=academique_courant`,
        };

        // --- TENTATIVE OPTIMISATION MAXIMALE ---
        // On supprime l'appel au MENU.
        // On attaque directement "Visu Bilans". Si le serveur est bien codé,
        // il verra l'UID et initialisera la session ici.

        // 1. Visu Bilans (Le "Setup" obligatoire)
        const visuBilansUrl = new URL("https://galao.cnam.fr/galao/bilans/visu_bilans.php");
        visuBilansUrl.searchParams.set("uid", galaoUid);
        visuBilansUrl.searchParams.set("bilan", "planning_individuel");
        visuBilansUrl.searchParams.set("liste", "un");
        visuBilansUrl.searchParams.set("no_fiche", "1");

        const setupResponse = await fetch(visuBilansUrl.toString(), {
            method: "GET",
            headers: {
                ...baseHeaders,
                // On met le referer "comme si" on venait du menu, pour tromper le serveur
                Referer: `https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${encodeURIComponent(galaoUid)}&type=retour&no_fiche=1`,
            }
        });

        // On ne bloque pas si non-200, mais c'est mauvais signe
        if (!setupResponse.ok) {
            console.warn(`${LOG_PREFIX} Setup warning: ${setupResponse.status}`);
        }

        // 2. Récupération des notes (Le Résultat)
        const bilanUrl = new URL("https://galao.cnam.fr/galao/bilans/affiche_onglets_bilans_result.php");
        bilanUrl.searchParams.set("uid", galaoUid);
        bilanUrl.searchParams.set("bilan", "academique_courant");

        const galaoResponse = await fetch(bilanUrl.toString(), {
            method: "GET",
            headers: {
                ...baseHeaders,
                Referer: `https://galao.cnam.fr/galao/bilans/affiche_boutons_bilans.php?uid=${encodeURIComponent(galaoUid)}`,
            }
        });

        if (!galaoResponse.ok) {
            return NextResponse.json(
                { success: false, error: "Erreur serveur Galao." },
                { status: 502 }
            );
        }

        const html = await galaoResponse.text();

        // Vérification si l'absence du menu a cassé la session
        if (html.includes("Session has expired") || html.includes("connexion")) {
            // Si tu vois cette erreur, c'est que l'étape 1 (Menu) est OBLIGATOIRE.
            // Dans ce cas, ton code précédent (avec Promise.all) est la perfection absolue.
            return NextResponse.json(
                { success: false, error: "Optimisation échouée : Le menu est obligatoire." },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: true,
            html,
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur`, error);
        return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 });
    }
}