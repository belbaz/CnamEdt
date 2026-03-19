// @ts-nocheck
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API galao/ping]";

// Même hack SSL que pour les autres routes Galao
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const galaoSession = cookieStore.get("galao_session")?.value || null;
        const galaoUid = cookieStore.get("galao_uid")?.value || null;

        if (!galaoSession || !galaoUid) {
            return NextResponse.json({ active: false }, { status: 401 });
        }

        const pingUrl = new URL("https://galao.cnam.fr/galao/menus/menu_apprenti.php");
        pingUrl.searchParams.set("uid", galaoUid);
        pingUrl.searchParams.set("annee", "0");
        pingUrl.searchParams.set("no_fiche", "1");

        const response = await fetch(pingUrl.toString(), {
            method: "GET",
            headers: {
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "en-US,en;q=0.9",
                Connection: "keep-alive",
                DNT: "1",
                "Upgrade-Insecure-Requests": "1",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
                Cookie: `PHPSESSID=${galaoSession}; juryType=; soutType=; idChamp=id_acc; bilan=academique_courant`,
            },
        });

        const html = await response.text();

        const isActive =
            response.ok &&
            !html.includes("Session has expired") &&
            !html.toLowerCase().includes("connexion");

        return NextResponse.json({ active: isActive });
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur ping`, error);
        return NextResponse.json({ active: false }, { status: 500 });
    }
}


