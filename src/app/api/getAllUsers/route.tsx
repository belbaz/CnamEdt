import {getSupabaseServerClient} from "@/lib/supabaseServer";
import {NextResponse} from "next/server";


export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        if (!supabase) {
            console.error("[GetAllUsers] Client Supabase introuvable (env manquantes)");
            return NextResponse.json(
                {error: "Service indisponible, contactez l'administrateur."},
                {status: 500},
            );
        }

        const {data: users, error: fetchError} = await supabase
            .from("edt_user")
            .select("id, name, last_name");

        if (fetchError) {
            console.error(fetchError);
            return NextResponse.json(
                { error: "Erreur lors de la récupération des utilisateurs." },
                { status: 500 },
            );
        }

        // console.log(users);
        const listUser = [];
        for (const user of users) {
            // @ts-ignore
            listUser.push({
                id: user.id,
                name: user.name + " " + user.last_name
            });
        }
        console.log("listUser", listUser);
        return NextResponse.json({
                success: true,
                note: listUser
            }
        );

    } catch (e) {
        console.error(e);
        return NextResponse.json(
            {error: "Une erreur inattendue est survenue."},
            {status: 500},
        );
    }
}