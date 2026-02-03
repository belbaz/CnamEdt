import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export async function GET() {
    const cookieStore = await cookies();
    const galaoSession = cookieStore.get("galao_session")?.value;
    const galaoUid = cookieStore.get("galao_uid")?.value;

    if (!galaoSession || !galaoUid) {
        return NextResponse.json({ active: false }, { status: 401 });
    }

    try {
        // Juste un petit appel pour toucher le serveur
        const response = await fetch(`https://galao.cnam.fr/galao/menus/menu_apprenti.php?uid=${galaoUid}&annee=0&no_fiche=1`, {
            headers: {
                Cookie: `PHPSESSID=${galaoSession}`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
        });

        if (response.ok) {
            return NextResponse.json({ active: true });
        }
    } catch (e) {
        // ignore
    }

    return NextResponse.json({ active: false }, { status: 401 });
}
