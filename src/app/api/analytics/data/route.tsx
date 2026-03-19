// @ts-nocheck
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API analytics/data]";

/**
 * GET /api/analytics/data
 * Récupère les données analytics (nécessite le rôle superAdmin)
 * Query params: limit, offset, order_by, order_direction, filters
 */
export async function GET(request) {
    try {
        // Vérifier l'authentification et le rôle superAdmin (double vérification)
        const authResult = await requireSuperAdmin();
        
        if (authResult.error) {
            console.warn(`${LOG_PREFIX} Accès refusé: ${authResult.error}`, {
                status: authResult.status,
                userId: authResult.user?.id,
                error: authResult.error
            });
            return NextResponse.json(
                { 
                    error: authResult.error,
                    details: process.env.NODE_ENV === 'development' ? {
                        status: authResult.status,
                        userId: authResult.user?.id
                    } : undefined
                },
                { status: authResult.status }
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
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000); // Limite max de sécurité
        const offset = parseInt(searchParams.get('offset') || '0');
        const orderBy = searchParams.get('order_by') || 'created_at';
        const orderDirection = searchParams.get('order_direction') || 'desc';
        const filterEmail = searchParams.get('filter_email'); // Filtre par email

        // Construire la requête avec JOIN pour récupérer nom et prénom
        // OPTIMISATION: LEFT JOIN automatique via Supabase (seulement pour les lignes avec user_id)
        let query = supabase
            .from('edt_analytics')
            .select('*, edt_user:user_id(name, last_name, email)', { count: 'exact' })
            .order(orderBy, { ascending: orderDirection === 'asc' });

        // Appliquer le filtre par email si fourni (côté serveur pour optimiser)
        if (filterEmail && filterEmail.trim()) {
            query = query.ilike('user_email', `%${filterEmail.trim()}%`);
        }

        // Appliquer la pagination après les filtres
        query = query.range(offset, offset + limit - 1);

        // Exécuter la requête
        const { data, error, count } = await query;

        // Formater les données pour inclure le nom et prénom depuis le JOIN
        let formattedData = [];
        if (data && !error) {
            formattedData = data.map(item => {
                const userInfo = item.edt_user || null;
                const userName = userInfo ? `${userInfo.name || ''} ${userInfo.last_name || ''}`.trim() : null;
                return {
                    ...item,
                    user_name: userName || null, // Nom complet (prénom + nom)
                    user_first_name: userInfo?.name || null, // Prénom
                    user_last_name: userInfo?.last_name || null, // Nom
                    // Garder user_email depuis analytics (plus fiable que depuis le JOIN)
                    user_email: item.user_email || null
                };
            });
        }

        if (error) {
            console.error(`${LOG_PREFIX} Erreur récupération analytics:`, error);
            console.error(`${LOG_PREFIX} Code erreur:`, error.code);
            console.error(`${LOG_PREFIX} Message erreur:`, error.message);
            
            // Si la table n'existe pas, retourner un message clair
            if (error.code === '42P01' || 
                error.message?.includes('does not exist') || 
                error.message?.includes('relation') || 
                error.message?.includes('table') ||
                error.message?.toLowerCase().includes('analytics')) {
                return NextResponse.json(
                    { 
                        error: "La table edt_analytics n'existe pas encore",
                        details: "Exécutez le script SQL dans Supabase: supabase-sql/create_analytics_table.sql",
                        code: error.code,
                        message: error.message,
                        hint: "Allez dans Supabase > SQL Editor et exécutez le fichier create_analytics_table.sql"
                    },
                    { status: 500 }
                );
            }
            return NextResponse.json(
                { 
                    error: "Erreur lors de la récupération des données",
                    details: error.message,
                    code: error.code
                },
                { status: 500 }
            );
        }

        // Récupérer les statistiques globales
        // OPTIMISATION: Limiter aux 30 derniers jours pour éviter les problèmes de performance
        // Vous pouvez ajuster cette période selon vos besoins
        const statsDaysLimit = parseInt(searchParams.get('stats_days') || '30'); // Par défaut 30 jours
        const statsDateLimit = new Date();
        statsDateLimit.setDate(statsDateLimit.getDate() - statsDaysLimit);
        
        let stats = null;
        let statsError = null;
        
        try {
            // Récupérer seulement les données récentes pour les statistiques
            // Cela évite de charger des millions de lignes
            const statsResult = await supabase
                .from('edt_analytics')
                .select('device_type, os_name, os_version, browser_name, browser_version, browser_language, site_version, time_on_page, visit_count, created_at, last_visit_at, ip_address, session_id')
                .gte('created_at', statsDateLimit.toISOString())
                .limit(50000); // Limite de sécurité supplémentaire
            
            stats = statsResult.data;
            statsError = statsResult.error;
            
            if (statsError) {
                console.warn(`${LOG_PREFIX} Erreur récupération statistiques:`, statsError);
                // Si la table n'existe pas, on retourne une erreur claire
                if (statsError.code === '42P01' || statsError.message?.includes('does not exist') || statsError.message?.includes('relation') || statsError.message?.includes('table')) {
                    return NextResponse.json(
                        { 
                            error: "La table edt_analytics n'existe pas encore",
                            details: "Exécutez le script SQL: supabase-sql/create_analytics_table.sql",
                            code: statsError.code,
                            message: statsError.message
                        },
                        { status: 500 }
                    );
                }
                // Pour les autres erreurs, on continue sans stats
            }
        } catch (err) {
            console.error(`${LOG_PREFIX} Exception lors de la récupération des stats:`, err);
            statsError = err;
        }

        let statistics = null;
        if (!statsError && stats && stats.length > 0) {
            const total = stats.length;
            const deviceTypes = {};
            const osNames = {};
            const osVersions = {};
            const browserNames = {};
            const browserVersions = {};
            const browserLanguages = {};
            const siteVersions = {};
            const uniqueSessions = new Set();
            const uniqueIPs = new Set();
            let totalTimeOnPage = 0;
            let totalVisits = 0;
            const visitsByDay = {};
            const visitsByHour = {};

            stats.forEach(record => {
                // Unique sessions
                if (record.session_id) {
                    uniqueSessions.add(record.session_id);
                }

                // Unique IPs
                if (record.ip_address && record.ip_address !== 'unknown') {
                    uniqueIPs.add(record.ip_address);
                }

                // Device types
                const deviceType = record.device_type || 'unknown';
                deviceTypes[deviceType] = (deviceTypes[deviceType] || 0) + 1;

                // OS names
                const osName = record.os_name || 'unknown';
                osNames[osName] = (osNames[osName] || 0) + 1;

                // OS versions
                if (record.os_name && record.os_version) {
                    const osKey = `${record.os_name} ${record.os_version}`;
                    osVersions[osKey] = (osVersions[osKey] || 0) + 1;
                }

                // Browser names
                const browserName = record.browser_name || 'unknown';
                browserNames[browserName] = (browserNames[browserName] || 0) + 1;

                // Browser versions
                if (record.browser_name && record.browser_version) {
                    const browserKey = `${record.browser_name} ${record.browser_version}`;
                    browserVersions[browserKey] = (browserVersions[browserKey] || 0) + 1;
                }

                // Browser languages
                const browserLang = record.browser_language || 'unknown';
                browserLanguages[browserLang] = (browserLanguages[browserLang] || 0) + 1;

                // Site versions
                const siteVersion = record.site_version || 'unknown';
                siteVersions[siteVersion] = (siteVersions[siteVersion] || 0) + 1;

                // Temps sur page
                if (record.time_on_page) {
                    totalTimeOnPage += record.time_on_page;
                }

                // Visites
                if (record.visit_count) {
                    totalVisits += record.visit_count;
                }

                // Visites par jour
                if (record.created_at) {
                    const date = new Date(record.created_at);
                    const dayKey = date.toISOString().split('T')[0];
                    visitsByDay[dayKey] = (visitsByDay[dayKey] || 0) + 1;
                }

                // Visites par heure
                if (record.created_at) {
                    const date = new Date(record.created_at);
                    const hourKey = date.getHours();
                    visitsByHour[hourKey] = (visitsByHour[hourKey] || 0) + 1;
                }
            });

            // Calculer les moyennes
            const avgTimeOnPage = total > 0 ? Math.round(totalTimeOnPage / total) : 0;
            const avgVisitsPerSession = total > 0 ? (totalVisits / total).toFixed(2) : 0;

            statistics = {
                total,
                uniqueSessions: uniqueSessions.size,
                uniqueIPs: uniqueIPs.size,
                totalVisits,
                avgTimeOnPage,
                avgVisitsPerSession,
                deviceTypes: Object.entries(deviceTypes)
                    .map(([name, count]) => ({ name, count, percentage: ((count / total) * 100).toFixed(2) }))
                    .sort((a, b) => b.count - a.count),
                osNames: Object.entries(osNames)
                    .map(([name, count]) => ({ name, count, percentage: ((count / total) * 100).toFixed(2) }))
                    .sort((a, b) => b.count - a.count),
                osVersions: Object.entries(osVersions)
                    .map(([name, count]) => ({ name, count, percentage: ((count / total) * 100).toFixed(2) }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 15), // Top 15
                browserNames: Object.entries(browserNames)
                    .map(([name, count]) => ({ name, count, percentage: ((count / total) * 100).toFixed(2) }))
                    .sort((a, b) => b.count - a.count),
                browserVersions: Object.entries(browserVersions)
                    .map(([name, count]) => ({ name, count, percentage: ((count / total) * 100).toFixed(2) }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 15), // Top 15
                browserLanguages: Object.entries(browserLanguages)
                    .map(([name, count]) => ({ name, count, percentage: ((count / total) * 100).toFixed(2) }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10), // Top 10
                siteVersions: Object.entries(siteVersions)
                    .map(([name, count]) => ({ name, count, percentage: ((count / total) * 100).toFixed(2) }))
                    .sort((a, b) => b.count - a.count),
                visitsByDay: Object.entries(visitsByDay)
                    .map(([date, count]) => ({ date, count }))
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(-30), // 30 derniers jours
                visitsByHour: Object.entries(visitsByHour)
                    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
                    .sort((a, b) => a.hour - b.hour)
            };
        }

        return NextResponse.json({
            data: formattedData || [],
            count: count || 0,
            limit,
            offset,
            statistics
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        console.error(`${LOG_PREFIX} Stack trace:`, error.stack);
        return NextResponse.json(
            { 
                error: "Erreur serveur",
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}


