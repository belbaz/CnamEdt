// ---- src/app/api/next-course/route.js ----
import { NextResponse } from "next/server";
import { getEventTitle } from "@/utils/eventUtils";

// Force dynamic rendering pour cette route API
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Trouve le prochain cours à venir (pas encore commencé ou en cours)
 */
function findNextCourse(events) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filtrer les événements futurs (pas encore terminés)
    const upcomingEvents = events.filter(event => {
        if (!event.start || !event.end) return false;
        
        const eventStart = new Date(event.start);
        const eventEnd = event.end_time ? new Date(event.end_time) : new Date(event.end);
        const endTime = eventEnd.getTime();
        
        // Garder les événements qui ne sont pas encore terminés
        return now.getTime() < endTime;
    });

    if (upcomingEvents.length === 0) return null;

    // Trier par date de début (le plus proche en premier)
    upcomingEvents.sort((a, b) => {
        const startA = new Date(a.start).getTime();
        const startB = new Date(b.start).getTime();
        return startA - startB;
    });

    return upcomingEvents[0];
}

/**
 * Formate une date pour l'affichage
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);
    
    const isToday = eventDate.getTime() === today.getTime();
    const isTomorrow = eventDate.getTime() === today.getTime() + 86400000;
    
    if (isToday) {
        return "Aujourd'hui";
    } else if (isTomorrow) {
        return "Demain";
    } else {
        return date.toLocaleDateString("fr-FR", { 
            weekday: "long", 
            day: "numeric", 
            month: "long" 
        });
    }
}

/**
 * Formate l'heure pour l'affichage
 */
function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", { 
        hour: "2-digit", 
        minute: "2-digit" 
    });
}

export async function GET(request) {
    try {
        // Récupérer les événements depuis Supabase directement
        const { getSupabaseServerClient } = await import("@/lib/supabaseServer");
        const supabase = getSupabaseServerClient();
        
        // Utiliser la même logique que fetch-ics pour récupérer les événements
        async function fetchEventsFromDB(supabase) {
            try {
                const LIMIT = 10000;
                const { data, error } = await supabase
                    .from('events_versions')
                    .select('uid, summary, start, end_time, location, description')
                    .order('uid', { ascending: true })
                    .order('version_no', { ascending: false })
                    .limit(LIMIT);

                if (error) {
                    console.warn('[API next-course] Error loading events:', error.message);
                    return null;
                }

                if (!data || data.length === 0) {
                    return [];
                }

                // Filtrer pour ne garder que la dernière version de chaque UID
                const map = new Map();
                for (const row of data) {
                    if (!row?.uid) continue;
                    if (!map.has(row.uid)) {
                        map.set(row.uid, {
                            uid: row.uid,
                            summary: row.summary,
                            description: row.description,
                            location: row.location,
                            start: row.start,
                            end: row.end_time,
                            end_time: row.end_time
                        });
                    }
                }
                
                return Array.from(map.values()).sort((a, b) => {
                    const timeA = a.start ? new Date(a.start).getTime() : 0;
                    const timeB = b.start ? new Date(b.start).getTime() : 0;
                    return timeA - timeB;
                });
            } catch (e) {
                console.warn('[API next-course] Error in fetchEventsFromDB:', e.message);
                return null;
            }
        }

        let eventsList = await fetchEventsFromDB(supabase);
        
        // Fallback : essayer l'API fetch-ics si Supabase ne fonctionne pas ou retourne vide
        if (!eventsList || eventsList.length === 0) {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                               (request.headers.get('host') ? 
                                (request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http') + '://' + request.headers.get('host') 
                                : 'http://localhost:3000');
                
                const eventsRes = await fetch(`${baseUrl}/api/fetch-ics`, {
                    cache: "no-store",
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                if (eventsRes.ok) {
                    const eventsData = await eventsRes.json();
                    eventsList = Array.isArray(eventsData.events) ? eventsData.events : [];
                }
            } catch (fallbackErr) {
                console.warn('[API next-course] Fallback failed:', fallbackErr.message);
            }
        }

        if (!eventsList || eventsList.length === 0) {
            return NextResponse.json({
                hasCourse: false,
                message: "Aucun cours disponible"
            });
        }

        // Trouver le prochain cours
        const nextCourse = findNextCourse(eventsList);

        if (!nextCourse) {
            return NextResponse.json({
                hasCourse: false,
                message: "Aucun cours à venir"
            });
        }

        // Extraire les informations du cours
        const { matiere, prof } = getEventTitle(nextCourse);
        const location = nextCourse.location || "";
        const startDate = formatDate(nextCourse.start);
        const startTime = formatTime(nextCourse.start);
        const endTime = formatTime(nextCourse.end_time || nextCourse.end);

        return NextResponse.json({
            hasCourse: true,
            course: {
                matiere: matiere || "Cours",
                prof: prof || "Non spécifié",
                location: location || "Non spécifié",
                date: startDate,
                startTime: startTime,
                endTime: endTime,
                start: nextCourse.start,
                end: nextCourse.end_time || nextCourse.end
            }
        });
    } catch (err) {
        console.error('[API next-course] Erreur:', err);
        return NextResponse.json({
            error: err.message || "Erreur lors de la récupération du prochain cours",
            hasCourse: false
        }, { status: 500 });
    }
}

