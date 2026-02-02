import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[API galao/logout]";

export async function POST() {
    try {
        const response = NextResponse.json({
            success: true,
        });

        const secure = process.env.NODE_ENV === "production";

        response.cookies.set({
            name: "galao_session",
            value: "",
            httpOnly: true,
            sameSite: "lax",
            secure,
            path: "/",
            maxAge: 0,
        });

        response.cookies.set({
            name: "galao_uid",
            value: "",
            httpOnly: true,
            sameSite: "lax",
            secure,
            path: "/",
            maxAge: 0,
        });

        response.cookies.set({
            name: "galao_client",
            value: "",
            httpOnly: false,
            sameSite: "lax",
            secure,
            path: "/",
            maxAge: 0,
        });

        return response;
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue`, error);
        return NextResponse.json(
            {
                success: false,
                error: "Erreur interne lors de la déconnexion de Galao.",
            },
            { status: 500 },
        );
    }
}

