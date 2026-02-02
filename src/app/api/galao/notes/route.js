import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API galao/notes]";

// Désactiver la vérification SSL pour les requêtes Galao uniquement
// Le serveur Galao utilise un certificat SSL invalide/auto-signé
const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const galaoSession = cookieStore.get("galao_session")?.value || null;
        const galaoUid = cookieStore.get("galao_uid")?.value || null;

        if (!galaoSession || !galaoUid) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Session Galao manquante. Merci de vous connecter d'abord avec vos identifiants Galao.",
                },
                { status: 401 },
            );
        }

        const baseHeaders = {
            Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            Connection: "keep-alive",
            DNT: "1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
            "sec-ch-ua":
                '"Not(A:Brand";v="8", "Chromium";v="144"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            // Cookie de session, comme dans la requête cURL donnée
            Cookie: `PHPSESSID=${galaoSession}; juryType=; soutType=; idChamp=id_acc; bilan=academique_courant`,
        };



        // 1) Appeler d'abord le menu apprenti pour initialiser la session (apprenti_id, etc.)
        const menuUrl = new URL(
            "https://galao.cnam.fr/galao/menus/menu_apprenti.php",
        );
        menuUrl.searchParams.set("uid", galaoUid);
        menuUrl.searchParams.set("annee", "0");
        menuUrl.searchParams.set("no_fiche", "1");

        const menuResponse = await fetch(menuUrl.toString(), {
            method: "GET",
            headers: {
                ...baseHeaders,
                Referer: "https://galao.cnam.fr/eiparis/index.php",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
            }
        });

        if (!menuResponse.ok) {
            console.warn(
                `${LOG_PREFIX} Réponse non OK depuis menu_apprenti`,
                menuResponse.status,
                menuResponse.statusText,
            );
        }

        // 2) Appeler la page des bilans (affiche_bilans.php)
        const afficheBilansUrl = new URL(
            "https://galao.cnam.fr/galao/bilans/affiche_bilans.php",
        );
        afficheBilansUrl.searchParams.set("uid", galaoUid);

        const afficheBilansResponse = await fetch(afficheBilansUrl.toString(), {
            method: "GET",
            headers: {
                ...baseHeaders,
                Referer: `https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${encodeURIComponent(
                    galaoUid,
                )}&type=retour&no_fiche=1`,
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
            },
        });

        if (!afficheBilansResponse.ok) {
            console.warn(
                `${LOG_PREFIX} Réponse non OK depuis affiche_bilans`,
                afficheBilansResponse.status,
                afficheBilansResponse.statusText,
            );
        }

        // 3) Appeler visu_bilans.php (planning_individuel)
        const visuBilansUrl = new URL(
            "https://galao.cnam.fr/galao/bilans/visu_bilans.php",
        );
        visuBilansUrl.searchParams.set("uid", galaoUid);
        visuBilansUrl.searchParams.set("bilan", "planning_individuel");
        visuBilansUrl.searchParams.set("liste", "un");
        visuBilansUrl.searchParams.set("no_fiche", "1");

        const visuBilansResponse = await fetch(visuBilansUrl.toString(), {
            method: "GET",
            headers: {
                ...baseHeaders,
                Referer: `https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${encodeURIComponent(
                    galaoUid,
                )}&type=retour&no_fiche=1`,
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
            }
        });

        if (!visuBilansResponse.ok) {
            console.warn(
                `${LOG_PREFIX} Réponse non OK depuis visu_bilans`,
                visuBilansResponse.status,
                visuBilansResponse.statusText,
            );
        }

        // 4) Appeler affiche_boutons_bilans.php (barre d'onglets)
        const boutonsUrl = new URL(
            "https://galao.cnam.fr/galao/bilans/affiche_boutons_bilans.php",
        );
        boutonsUrl.searchParams.set("uid", galaoUid);

        const boutonsResponse = await fetch(boutonsUrl.toString(), {
            method: "GET",
            headers: {
                ...baseHeaders,
                Referer: `https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${encodeURIComponent(
                    galaoUid,
                )}&type=retour&no_fiche=1`,
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
            }
        });

        if (!boutonsResponse.ok) {
            console.warn(
                `${LOG_PREFIX} Réponse non OK depuis affiche_boutons_bilans`,
                boutonsResponse.status,
                boutonsResponse.statusText,
            );
        }

        // 5) Enfin, appeler la page des résultats académiques (affiche_onglets_bilans_result.php)
        const bilanUrl = new URL(
            "https://galao.cnam.fr/galao/bilans/affiche_onglets_bilans_result.php",
        );
        bilanUrl.searchParams.set("uid", galaoUid);
        bilanUrl.searchParams.set("bilan", "academique_courant");

        const galaoResponse = await fetch(bilanUrl.toString(), {
            method: "GET",
            headers: {
                ...baseHeaders,
                Referer: `https://galao.cnam.fr/galao/bilans/affiche_boutons_bilans.php?uid=${encodeURIComponent(
                    galaoUid,
                )}`,
                "Sec-Fetch-Dest": "frame",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
            }
        });

        if (!galaoResponse.ok) {
            console.warn(
                `${LOG_PREFIX} Réponse non OK depuis Galao`,
                galaoResponse.status,
                galaoResponse.statusText,
            );
            return NextResponse.json(
                {
                    success: false,
                    error: "Impossible de récupérer les notes depuis Galao.",
                },
                { status: 502 },
            );
        }

        const html = await galaoResponse.text();

        // Log de debug pour vérifier qu'on reçoit bien la page attendue
        // console.log(`${LOG_PREFIX} HTML reçu (aperçu)`, html.slice(0, 500));

        return NextResponse.json({
            success: true,
            html,
        });
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue`, error);
        return NextResponse.json(
            {
                success: false,
                error: "Erreur interne lors de la récupération des notes Galao.",
            },
            { status: 500 },
        );
    }
}

