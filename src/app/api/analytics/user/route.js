import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { verifySessionToken } from '@/lib/sessionToken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API analytics/user]";

/**
 * GET /api/analytics/user?session_id=xxx ou ?ip_address=xxx
 * Récupère les statistiques détaillées d'un utilisateur spécifique
 */
export async function GET(request) {
    try {
        // Vérifier l'authentification
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;

        if (!session) {
            return NextResponse.json(
                { error: "Non authentifié" },
                { status: 401 }
            );
        }

        const user = verifySessionToken(session);
        if (!user) {
            return NextResponse.json(
                { error: "Session invalide" },
                { status: 401 }
            );
        }

        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            return NextResponse.json(
                { error: "Service indisponible" },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('session_id');
        const ipAddress = searchParams.get('ip_address');

        if (!sessionId && !ipAddress) {
            return NextResponse.json(
                { error: "session_id ou ip_address requis" },
                { status: 400 }
            );
        }

        // Construire la requête
        let query = supabase
            .from('edt_analytics')
            .select('*');

        if (sessionId) {
            query = query.eq('session_id', sessionId);
        } else if (ipAddress) {
            query = query.eq('ip_address', ipAddress);
        }

        const { data, error } = await query;

        if (error) {
            console.error(`${LOG_PREFIX} Erreur récupération utilisateur:`, error);
            return NextResponse.json(
                { error: "Erreur lors de la récupération des données" },
                { status: 500 }
            );
        }

        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: "Aucune donnée trouvée pour cet utilisateur" },
                { status: 404 }
            );
        }

        // Si plusieurs entrées (même IP mais sessions différentes), les regrouper
        const userData = data[0]; // Prendre la première entrée comme référence
        const allSessions = data;

        // Calculer les statistiques agrégées
        const totalVisits = allSessions.reduce((sum, s) => sum + (s.visit_count || 1), 0);
        const totalTime = allSessions.reduce((sum, s) => sum + (s.total_time_on_page || s.time_on_page || 0), 0);
        const avgTime = totalVisits > 0 ? (totalTime / totalVisits).toFixed(2) : 0;
        const firstVisit = allSessions.reduce((earliest, s) => {
            const date = new Date(s.first_visit_at);
            return !earliest || date < earliest ? date : earliest;
        }, null);
        const lastVisit = allSessions.reduce((latest, s) => {
            const date = new Date(s.last_visit_at);
            return !latest || date > latest ? date : latest;
        }, null);

        return NextResponse.json({
            user: {
                session_id: userData.session_id,
                ip_address: userData.ip_address,
                device_name: userData.device_name,
                device_type: userData.device_type,
                os_name: userData.os_name,
                os_version: userData.os_version,
                browser_name: userData.browser_name,
                browser_version: userData.browser_version,
                browser_language: userData.browser_language,
                site_version: userData.site_version,
                screen_width: userData.screen_width,
                screen_height: userData.screen_height,
            },
            statistics: {
                totalSessions: allSessions.length,
                totalVisits: totalVisits,
                totalTimeOnSite: totalTime,
                avgTimePerVisit: parseFloat(avgTime),
                firstVisitAt: firstVisit ? firstVisit.toISOString() : null,
                lastVisitAt: lastVisit ? lastVisit.toISOString() : null,
                daysSinceFirstVisit: firstVisit ? Math.floor((Date.now() - firstVisit.getTime()) / (1000 * 60 * 60 * 24)) : 0
            },
            sessions: allSessions.map(s => ({
                id: s.id,
                session_id: s.session_id,
                time_on_page: s.time_on_page,
                total_time_on_page: s.total_time_on_page,
                avg_time_on_page: s.avg_time_on_page,
                visit_count: s.visit_count,
                first_visit_at: s.first_visit_at,
                last_visit_at: s.last_visit_at,
                page_url: s.page_url,
                site_version: s.site_version
            }))
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}

