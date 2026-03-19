// @ts-nocheck
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LOG_PREFIX = "[API client-info]";

/**
 * GET /api/client-info
 * Récupère l'adresse IP du client et d'autres informations utiles
 */
export async function GET(request) {
    try {
        // Récupérer l'IP depuis les headers
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
            || request.headers.get('x-real-ip') 
            || request.headers.get('cf-connecting-ip') // Cloudflare
            || 'unknown';

        return NextResponse.json({
            ip: ipAddress,
            userAgent: request.headers.get('user-agent') || 'unknown'
        });
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur:`, error);
        return NextResponse.json(
            { error: "Erreur serveur", ip: 'unknown' },
            { status: 500 }
        );
    }
}


