// ---- src/app/api/fetch-ics/route.js ----
import {NextResponse} from "next/server";
import ical from "node-ical";

// Note: Les routes API ne fonctionnent pas avec output: 'export'
// Le dossier API doit être renommé avant le build (voir scripts de build ou package.json)

// URL par défaut (fallback si .env.local n'existe pas)
const DEFAULT_ICS_URL = 'https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics';

export async function GET() {
    try {
        // Utiliser .env.local ou fallback sur l'URL par défaut
        const icsUrl = process.env.ICS_URL || DEFAULT_ICS_URL;
        
        if (!icsUrl) {
            throw new Error("URL ICS non configurée. Créer .env.local avec ICS_URL=...");
        }

        console.log('[API fetch-ics] Fetching from:', icsUrl);
        
        const res = await fetch(icsUrl, {
            headers: {
                'Accept': 'text/calendar,text/plain,*/*',
            },
            // Ajouter un timeout pour éviter les requêtes qui traînent
            signal: AbortSignal.timeout(10000) // 10 secondes max
        });
        
        if (!res.ok) {
            throw new Error(`Erreur HTTP ${res.status}: ${res.statusText}`);
        }

        const text = await res.text();
        
        if (!text || text.length === 0) {
            throw new Error("Fichier ICS vide");
        }
        
        console.log('[API fetch-ics] ICS downloaded, length:', text.length);
        
        const parsed = ical.sync.parseICS(text);

        const events = Object.values(parsed)
            .filter((e) => e.type === "VEVENT")
            .map((e) => ({
                summary: e.summary,
                start: e.start,
                description: e.description,
                end: e.end,
                location: e.location,
            }));

        console.log('[API fetch-ics] Events parsed:', events.length);

        return NextResponse.json(events);
    } catch (err) {
        console.error('[API fetch-ics] Error:', err.message);
        return NextResponse.json({
            error: err.message,
            details: err.cause?.message || 'Vérifier la connexion réseau et l\'URL ICS'
        }, {status: 500});
    }
}