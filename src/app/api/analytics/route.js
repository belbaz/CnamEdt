import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { requireAuth } from '@/lib/auth';

// Fonction pour générer un UUID simple (sans dépendance externe)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API analytics]";
const ANALYTICS_COOKIE_NAME = "analytics_session_id";
const ANALYTICS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

/**
 * GET /api/analytics
 * Récupère ou crée un ID de session analytics
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        let sessionId = cookieStore.get(ANALYTICS_COOKIE_NAME)?.value;

        // Si pas de session ID, en créer un nouveau
        if (!sessionId) {
            sessionId = generateUUID();
        }

        const response = NextResponse.json({
            session_id: sessionId
        });

        // Définir le cookie si nécessaire
        if (!cookieStore.get(ANALYTICS_COOKIE_NAME)) {
            response.cookies.set({
                name: ANALYTICS_COOKIE_NAME,
                value: sessionId,
                httpOnly: false, // Doit être accessible depuis le client pour JavaScript
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
                maxAge: ANALYTICS_COOKIE_MAX_AGE,
            });
        }

        return response;
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/analytics
 * Enregistre ou met à jour les métriques analytics
 * Body: { session_id, ip, user_agent, device_name, device_type, os_name, os_version, 
 *         browser_name, browser_version, browser_language, screen_width, screen_height,
 *         viewport_width, viewport_height, site_version, time_on_page, page_url, referrer }
 */
export async function POST(request) {
    try {
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            return NextResponse.json(
                { error: "Service indisponible" },
                { status: 500 }
            );
        }

        // Gérer les requêtes sendBeacon (Blob) ou JSON normal
        let body;
        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            body = await request.json();
        } else {
            // Pour sendBeacon, les données peuvent être dans le body comme Blob
            try {
                const text = await request.text();
                body = JSON.parse(text);
            } catch (e) {
                console.warn(`${LOG_PREFIX} Impossible de parser le body:`, e);
                return NextResponse.json(
                    { error: "Format de données invalide" },
                    { status: 400 }
                );
            }
        }
        const {
            session_id,
            ip,
            user_agent,
            device_name,
            device_type,
            os_name,
            os_version,
            browser_name,
            browser_version,
            browser_language,
            screen_width,
            screen_height,
            viewport_width,
            viewport_height,
            site_version,
            time_on_page,
            page_url,
            referrer
        } = body;

        // Récupérer l'IP depuis les headers si non fournie
        let ipAddress = ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
            || request.headers.get('x-real-ip') 
            || 'unknown';

        // Ne pas enregistrer les analytics pour localhost (sauf si explicitement autorisé pour les tests)
        const allowLocalhost = process.env.NEXT_PUBLIC_ALLOW_LOCALHOST_ANALYTICS === 'true';
        const localhostIPs = ['::1', '127.0.0.1', 'localhost', '::ffff:127.0.0.1'];
        
        if (localhostIPs.includes(ipAddress) && !allowLocalhost) {
            console.log(`${LOG_PREFIX} IP localhost détectée (${ipAddress}) - analytics ignorés`);
            return NextResponse.json({
                success: true,
                message: "Analytics ignorés (localhost). Pour tester, ajoutez NEXT_PUBLIC_ALLOW_LOCALHOST_ANALYTICS=true dans .env.local"
            });
        }
        
        if (localhostIPs.includes(ipAddress) && allowLocalhost) {
            console.log(`${LOG_PREFIX} IP localhost détectée mais autorisée pour les tests (${ipAddress})`);
        }

        // Récupérer l'utilisateur connecté (si disponible)
        // On ne bloque pas si l'utilisateur n'est pas connecté (analytics anonymes OK)
        let userId = null;
        let userEmail = null;
        try {
            const authResult = await requireAuth();
            if (authResult.user && !authResult.error) {
                userId = authResult.user.id;
                userEmail = authResult.user.email;
                console.log(`${LOG_PREFIX} Utilisateur connecté détecté: ${userEmail} (${userId})`);
            }
        } catch (authError) {
            // Ignorer les erreurs d'authentification (visiteur anonyme)
            console.log(`${LOG_PREFIX} Visiteur anonyme (pas d'authentification)`);
        }

        // Vérifier si une entrée existe déjà pour cette session
        const { data: existing, error: checkError } = await supabase
            .from('edt_analytics')
            .select('id, visit_count, last_visit_at')
            .eq('session_id', session_id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error(`${LOG_PREFIX} Erreur vérification session existante:`, checkError);
            return NextResponse.json(
                { error: "Erreur lors de la vérification" },
                { status: 500 }
            );
        }

        if (existing) {
            // Calculer le temps total cumulé et la moyenne
            const currentTime = time_on_page || 0;
            const previousTotalTime = existing.total_time_on_page || 0;
            const newTotalTime = previousTotalTime + currentTime;
            const newVisitCount = (existing.visit_count || 1) + 1;
            const newAvgTime = newVisitCount > 0 ? (newTotalTime / newVisitCount).toFixed(2) : 0;

            // Mettre à jour l'entrée existante
            const updateData = {
                ip_address: ipAddress,
                user_agent: user_agent || null,
                device_name: device_name || null,
                device_type: device_type || null,
                os_name: os_name || null,
                os_version: os_version || null,
                browser_name: browser_name || null,
                browser_version: browser_version || null,
                browser_language: browser_language || null,
                screen_width: screen_width || null,
                screen_height: screen_height || null,
                viewport_width: viewport_width || null,
                viewport_height: viewport_height || null,
                site_version: site_version || null,
                time_on_page: currentTime, // Temps de la dernière visite
                total_time_on_page: newTotalTime, // Temps total cumulé
                avg_time_on_page: parseFloat(newAvgTime), // Temps moyen
                page_url: page_url || null,
                referrer: referrer || null,
                last_visit_at: new Date().toISOString(),
                visit_count: newVisitCount,
                updated_at: new Date().toISOString()
            };

            // Ajouter les informations utilisateur si connecté
            if (userId) {
                updateData.user_id = userId;
            }
            if (userEmail) {
                updateData.user_email = userEmail;
            }

            const { error: updateError } = await supabase
                .from('edt_analytics')
                .update(updateData)
                .eq('id', existing.id);

            if (updateError) {
                console.error(`${LOG_PREFIX} Erreur mise à jour analytics:`, updateError);
                return NextResponse.json(
                    { error: "Erreur lors de la mise à jour" },
                    { status: 500 }
                );
            }

            console.log(`${LOG_PREFIX} Analytics mis à jour pour session ${session_id}`);
        } else {
            // Créer une nouvelle entrée
            const currentTime = time_on_page || 0;
            const insertData = {
                session_id: session_id,
                ip_address: ipAddress,
                user_agent: user_agent || null,
                device_name: device_name || null,
                device_type: device_type || null,
                os_name: os_name || null,
                os_version: os_version || null,
                browser_name: browser_name || null,
                browser_version: browser_version || null,
                browser_language: browser_language || null,
                screen_width: screen_width || null,
                screen_height: screen_height || null,
                viewport_width: viewport_width || null,
                viewport_height: viewport_height || null,
                site_version: site_version || null,
                time_on_page: currentTime, // Temps de la première visite
                total_time_on_page: currentTime, // Temps total (première visite)
                avg_time_on_page: currentTime, // Temps moyen (première visite)
                page_url: page_url || null,
                referrer: referrer || null,
                first_visit_at: new Date().toISOString(),
                last_visit_at: new Date().toISOString(),
                visit_count: 1
            };

            // Ajouter les informations utilisateur si connecté
            if (userId) {
                insertData.user_id = userId;
            }
            if (userEmail) {
                insertData.user_email = userEmail;
            }

            const { error: insertError } = await supabase
                .from('edt_analytics')
                .insert(insertData);

            if (insertError) {
                console.error(`${LOG_PREFIX} Erreur insertion analytics:`, insertError);
                return NextResponse.json(
                    { error: "Erreur lors de l'enregistrement" },
                    { status: 500 }
                );
            }

            console.log(`${LOG_PREFIX} Nouvelle session analytics créée: ${session_id}`);
        }

        return NextResponse.json({
            success: true,
            message: "Analytics enregistrés avec succès"
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}

