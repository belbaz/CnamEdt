import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessionToken";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;
        if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

        const tokenData = verifySessionToken(session);
        if (!tokenData || !tokenData.sub) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

        const myUserId = tokenData.sub;
        const supabase = await getSupabaseServerClient();
        if (!supabase) return NextResponse.json({ error: "Service indisponible" }, { status: 500 });

        // On récupère tous les messages envoyés ou reçus par l'utilisateur
        const { data: sentMessages, error: err1 } = await supabase
            .from('messages')
            .select('receiver_id')
            .eq('sender_id', myUserId);
            
        const { data: receivedMessages, error: err2 } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('receiver_id', myUserId);

        if (err1 || err2) {
            console.error("[API Conversations] Erreur GET:", err1 || err2);
            return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 });
        }

        const userIds = new Set<string>();
        // mettre dans msg.receiver tout les messages recu
        sentMessages?.forEach(msg => {
            if (msg.receiver_id) userIds.add(msg.receiver_id);
        });
        // mettre dans msg.sender tout les messages envoyé
        receivedMessages?.forEach(msg => {
            if (msg.sender_id) userIds.add(msg.sender_id);
        });

        return NextResponse.json({ success: true, conversations: Array.from(userIds) });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Erreur serveur inattendue" }, { status: 500 });
    }
}
