import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API galao/notes]";

// CORRECTION : On remet la variable d'environnement globale.
// Next.js 'fetch' ne gère pas bien l'option 'agent' locale pour les certificats invalides.
// C'est la seule façon fiable de contourner l'erreur "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ici.
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
                {
                    success: false,
                    error: "Session Galao manquante. Merci de vous connecter d'abord.",
                },
                { status: 401 }
            );
        }

        const baseHeaders = {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Connection: "keep-alive",
            DNT: "1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
            "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            Cookie: `PHPSESSID=${galaoSession}; juryType=; soutType=; idChamp=id_acc; bilan=academique_courant`,
        };

        // --- PRÉPARATION DES URLS ---

        const menuUrl = new URL("https://galao.cnam.fr/galao/menus/menu_apprenti.php");
        menuUrl.searchParams.set("uid", galaoUid);
        menuUrl.searchParams.set("annee", "0");
        menuUrl.searchParams.set("no_fiche", "1");

        const visuBilansUrl = new URL("https://galao.cnam.fr/galao/bilans/visu_bilans.php");
        visuBilansUrl.searchParams.set("uid", galaoUid);
        visuBilansUrl.searchParams.set("bilan", "planning_individuel");
        visuBilansUrl.searchParams.set("liste", "un");
        visuBilansUrl.searchParams.set("no_fiche", "1");

        // --- EXÉCUTION PARALLÈLE (Optimisation) ---
        // On garde Promise.all car c'est lui qui donne la vitesse.
        // On a retiré l'agent qui causait le bug.

        const [menuResponse, visuBilansResponse] = await Promise.all([
            fetch(menuUrl.toString(), {
                method: "GET",
                headers: {
                    ...baseHeaders,
                    Referer: "https://galao.cnam.fr/eiparis/index.php",
                }
            }),
            fetch(visuBilansUrl.toString(), {
                method: "GET",
                headers: {
                    ...baseHeaders,
                    Referer: `https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${encodeURIComponent(galaoUid)}&type=retour&no_fiche=1`,
                }
            })
        ]);

        // Vérification silencieuse pour les logs
        if (!menuResponse.ok) console.warn(`${LOG_PREFIX} Menu statut: ${menuResponse.status}`);
        if (!visuBilansResponse.ok) console.warn(`${LOG_PREFIX} Visu statut: ${visuBilansResponse.status}`);

        // --- APPEL FINAL (Récupération des notes) ---

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
            console.warn(`${LOG_PREFIX} Erreur finale`, galaoResponse.status);
            return NextResponse.json(
                { success: false, error: "Impossible de récupérer les notes." },
                { status: 502 }
            );
        }

        const html = await galaoResponse.text();

        return NextResponse.json({
            success: true,
            html,
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue`, error);
        return NextResponse.json(
            { success: false, error: "Erreur interne lors de la récupération." },
            { status: 500 }
        );
    }
}