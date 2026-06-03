import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessionToken";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const otherUserId = searchParams.get("userId");

        if (!otherUserId) {
            return NextResponse.json({ error: "L'ID de l'utilisateur est requis" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;
        if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

        const tokenData = verifySessionToken(session);
        if (!tokenData || !tokenData.sub) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

        const myUserId = tokenData.sub;
        const supabase = await getSupabaseServerClient();

        if (!supabase) {
            return NextResponse.json({ error: "Service indisponible" }, { status: 500 });
        }

        // Récupère la conversation avec deux requêtes simples pour éviter les erreurs de parsing
        const { data: sentMessages, error: err1 } = await supabase
            .from('edt_messages')
            .select('*')
            .eq('sender_id', myUserId)
            .eq('receiver_id', otherUserId);

        const { data: receivedMessages, error: err2 } = await supabase
            .from('edt_messages')
            .select('*')
            .eq('sender_id', otherUserId)
            .eq('receiver_id', myUserId);

        if (err1 || err2) {
            console.error("[API Messages] Erreur GET:", err1 || err2);
            return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 });
        }

        // Fusionner et trier
        const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];
        allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        return NextResponse.json({ success: true, messages: allMessages });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Erreur serveur inattendue" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;
        if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

        const tokenData = verifySessionToken(session);
        if (!tokenData || !tokenData.sub) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

        const myUserId = tokenData.sub;
        const body = await request.json();
        const { receiverId, text } = body;

        if (!receiverId || !text || !text.trim()) {
            return NextResponse.json({ error: "Données invalides (receiverId et text requis)" }, { status: 400 });
        }

        const supabase = await getSupabaseServerClient();
        if (!supabase) return NextResponse.json({ error: "Service indisponible" }, { status: 500 });

        // Insertion du nouveau message
        const { data: message, error } = await supabase
            .from('edt_messages')
            .insert({
                sender_id: myUserId,
                receiver_id: receiverId,
                text: text.trim()
            })
            .select()
            .single();

        if (error) {
            console.error("[API Messages] Erreur POST:", error);
            return NextResponse.json({ error: "Erreur lors de l'envoi du message" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Erreur serveur inattendue" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get("messageId");
        const conversationWithUserId = searchParams.get("conversationWithUserId");

        if (!messageId && !conversationWithUserId) {
            return NextResponse.json({ error: "L'ID du message ou de la conversation est requis" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;
        if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

        const tokenData = verifySessionToken(session);
        if (!tokenData || !tokenData.sub) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

        const myUserId = tokenData.sub;
        const supabase = await getSupabaseServerClient();

        if (!supabase) {
            return NextResponse.json({ error: "Service indisponible" }, { status: 500 });
        }

        if (messageId) {
            const { error } = await supabase
                .from('edt_messages')
                .delete()
                .eq('id', messageId)
                .eq('sender_id', myUserId);

            if (error) {
                console.error("[API Messages] Erreur DELETE:", error);
                return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
            }
        } else if (conversationWithUserId) {
            const { error: err1 } = await supabase
                .from('edt_messages')
                .delete()
                .eq('sender_id', myUserId)
                .eq('receiver_id', conversationWithUserId);

            const { error: err2 } = await supabase
                .from('edt_messages')
                .delete()
                .eq('sender_id', conversationWithUserId)
                .eq('receiver_id', myUserId);

            if (err1 || err2) {
                console.error("[API Messages] Erreur DELETE Conversation:", err1 || err2);
                return NextResponse.json({ error: "Erreur lors de la suppression de la conversation" }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Erreur serveur inattendue" }, { status: 500 });
    }
}
