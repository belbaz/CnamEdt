import { NextResponse } from 'next/server';

/**
 * API Route pour récupérer le fichier ICS brut
 * GET /api/raw-ics - Retourne le contenu brut du fichier ICS
 */

const DEFAULT_ICS_URL = 'https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics';

export async function GET() {
    try {
        // Utiliser .env.local ou fallback sur l'URL par défaut
        const icsUrl = process.env.ICS_URL || DEFAULT_ICS_URL;
        
        if (!icsUrl) {
            throw new Error("URL ICS non configurée");
        }

        console.log('[API raw-ics] Fetching from:', icsUrl);
        
        // Gérer le timeout
        let controller;
        let signal;
        try {
            // @ts-ignore
            signal = AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined;
        } catch {
            controller = new AbortController();
            signal = controller.signal;
            setTimeout(() => controller.abort(), 10000);
        }

        const res = await fetch(icsUrl, {
            headers: {
                'Accept': 'text/calendar,text/plain,*/*',
            },
            signal
        });
        
        if (!res.ok) {
            throw new Error(`Erreur HTTP ${res.status}: ${res.statusText}`);
        }

        const text = await res.text();
        
        if (!text || text.length === 0) {
            throw new Error("Fichier ICS vide");
        }
        
        console.log('[API raw-ics] ICS downloaded, length:', text.length);

        return NextResponse.json({
            content: text,
            length: text.length,
            source: icsUrl
        });
        
    } catch (err) {
        console.error('[API raw-ics] Error:', err.message);
        return NextResponse.json(
            { 
                error: "Erreur lors de la récupération du fichier ICS",
                details: err.message 
            },
            { status: 500 }
        );
    }
}

