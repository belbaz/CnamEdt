// ---- src/app/api/agenda/route.js ----
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessionToken";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { normalizeIncomingNotes, parseStoredNoteValue } from "@/utils/noteEntries";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API agenda]";

function formatAgendaRow(row) {
    if (!row) {
        return null;
    }

    // Extraire les informations utilisateur depuis la jointure
    const userInfo = row.edt_user || null;
    const userName = userInfo ? `${userInfo.name || ''} ${userInfo.last_name || ''}`.trim() : null;

    return {
        ...row,
        entries: parseStoredNoteValue(row.notes),
        user_name: userName,
        user_name_first: userInfo?.name || null,
        user_name_last: userInfo?.last_name || null,
    };
}

/**
 * Récupère l'utilisateur depuis la session
 */
async function getAuthenticatedUser() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;
        if (!session) {
            return null;
        }
        const user = verifySessionToken(session);
        return user;
    } catch (error) {
        console.warn(`${LOG_PREFIX} Erreur vérification session:`, error.message);
        return null;
    }
}

/**
 * GET /api/agenda
 * Récupère toutes les notes de l'utilisateur connecté
 * Ou toutes les notes publiques (la plus récente par cours) si non connecté
 * Ou les notes d'un cours spécifique si course_uid est fourni en query param
 * Retourne toujours 200, avec authenticated: false si non connecté
 */
export async function GET(request) {
    try {
        const user = await getAuthenticatedUser();
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            return NextResponse.json(
                { error: "Service indisponible" },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const courseUid = searchParams.get('course_uid');

        let query;
        let isAuthenticated = !!user;

        if (user) {
            // Utilisateur connecté : récupérer ses propres notes
            query = supabase
                .from('edt_agenda')
                .select('id, course_uid, notes, created_at, updated_at, user_id, modification_history')
                .eq('user_id', user.sub)
                .order('updated_at', { ascending: false });

            if (courseUid) {
                query = query.eq('course_uid', courseUid);
            }
        } else {
            // Utilisateur non connecté : récupérer toutes les notes publiques
            // Pour chaque course_uid, on prend la note la plus récente
            query = supabase
                .from('edt_agenda')
                .select('id, course_uid, notes, created_at, updated_at, user_id, modification_history')
                .order('updated_at', { ascending: false });

            if (courseUid) {
                query = query.eq('course_uid', courseUid);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error(`${LOG_PREFIX} Erreur récupération notes:`, error);
            return NextResponse.json(
                { error: "Erreur lors de la récupération des notes" },
                { status: 500 }
            );
        }

        // Pour les utilisateurs non connectés, grouper par course_uid et prendre la note la plus récente
        let processedData = data || [];
        if (!user && !courseUid) {
            // Grouper par course_uid et garder seulement la note la plus récente pour chaque cours
            const notesByCourse = new Map();
            processedData.forEach(note => {
                const existing = notesByCourse.get(note.course_uid);
                if (!existing || new Date(note.updated_at) > new Date(existing.updated_at)) {
                    notesByCourse.set(note.course_uid, note);
                }
            });
            processedData = Array.from(notesByCourse.values());
        }

        // Récupérer toutes les informations utilisateur nécessaires (user_id de la note + tous les user_id de l'historique)
        const userIds = new Set();
        processedData.forEach(note => {
            userIds.add(note.user_id);
            // Ajouter tous les user_id de l'historique
            if (note.modification_history && Array.isArray(note.modification_history)) {
                note.modification_history.forEach(entry => {
                    if (entry.user_id) userIds.add(entry.user_id);
                });
            }
        });
        
        let userInfoMap = {};
        
        if (userIds.size > 0) {
            const { data: usersData, error: usersError } = await supabase
                .from('edt_user')
                .select('id, name, last_name')
                .in('id', Array.from(userIds));

            if (!usersError && usersData) {
                usersData.forEach(u => {
                    userInfoMap[u.id] = {
                        name: u.name,
                        last_name: u.last_name,
                        full_name: `${u.name || ''} ${u.last_name || ''}`.trim()
                    };
                });
            }
        }

        // Enrichir l'historique avec les noms complets
        const enrichHistory = (history) => {
            if (!history || !Array.isArray(history)) return [];
            return history.map(entry => ({
                ...entry,
                user_name: userInfoMap[entry.user_id]?.full_name || entry.user_name || 'Utilisateur inconnu'
            }));
        };

        // Formater les données avec les informations utilisateur
        const formattedData = processedData.map(row => {
            const userInfo = userInfoMap[row.user_id] || null;
            const enrichedHistory = enrichHistory(row.modification_history);
            return formatAgendaRow({ 
                ...row, 
                edt_user: userInfo,
                modification_history: enrichedHistory
            });
        });

        if (courseUid) {
            return NextResponse.json({
                authenticated: isAuthenticated,
                note: formattedData.length > 0 ? formattedData[0] : null
            });
        }

        return NextResponse.json({
            authenticated: isAuthenticated,
            notes: formattedData
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/agenda
 * Crée ou met à jour une note pour un cours
 * Body: { course_uid: string, notes: string }
 */
export async function POST(request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json(
                { error: "Non authentifié" },
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

        const body = await request.json();
        const { course_uid, notes } = body;

        if (!course_uid || typeof course_uid !== 'string') {
            return NextResponse.json(
                { error: "course_uid est requis" },
                { status: 400 }
            );
        }

        if (!Array.isArray(notes) && typeof notes !== 'string') {
            return NextResponse.json(
                { error: "notes doit être une chaîne de caractères ou un tableau" },
                { status: 400 }
            );
        }

        const normalizedEntries = normalizeIncomingNotes(notes);

        // Vérifier si une note existe déjà pour ce cours et cet utilisateur
        const { data: existing, error: checkError } = await supabase
            .from('edt_agenda')
            .select('id')
            .eq('user_id', user.sub)
            .eq('course_uid', course_uid)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error(`${LOG_PREFIX} Erreur vérification note existante:`, checkError);
            return NextResponse.json(
                { error: "Erreur lors de la vérification" },
                { status: 500 }
            );
        }

        // Si l'utilisateur vide la note, supprimer la ligne existante
        if (normalizedEntries.length === 0) {
            if (existing) {
                const { error: deleteError } = await supabase
                    .from('edt_agenda')
                    .delete()
                    .eq('id', existing.id)
                    .eq('user_id', user.sub);

                if (deleteError) {
                    console.error(`${LOG_PREFIX} Erreur suppression note vide:`, deleteError);
                    return NextResponse.json(
                        { error: "Erreur lors de la suppression" },
                        { status: 500 }
                    );
                }
            }

            return NextResponse.json({
                success: true,
                note: null
            });
        }

        // Récupérer les informations utilisateur pour l'historique
        const { data: userData } = await supabase
            .from('edt_user')
            .select('name, last_name')
            .eq('id', user.sub)
            .maybeSingle();

        const userName = userData ? `${userData.name || ''} ${userData.last_name || ''}`.trim() : 'Utilisateur inconnu';
        const now = new Date().toISOString();

        let result;
        if (existing) {
            // Récupérer l'historique existant
            const { data: existingNote } = await supabase
                .from('edt_agenda')
                .select('modification_history')
                .eq('id', existing.id)
                .single();

            const existingHistory = existingNote?.modification_history || [];
            const historyArray = Array.isArray(existingHistory) ? existingHistory : [];

            // Ajouter la nouvelle modification à l'historique
            const newHistoryEntry = {
                user_id: user.sub,
                user_name: userName,
                action: 'modified',
                timestamp: now
            };

            const updatedHistory = [...historyArray, newHistoryEntry];

            // Mettre à jour la note existante
            const { data, error } = await supabase
                .from('edt_agenda')
                .update({
                    notes: JSON.stringify(normalizedEntries),
                    updated_at: now,
                    modification_history: updatedHistory
                })
                .eq('id', existing.id)
                .eq('user_id', user.sub)
                .select()
                .single();

            if (error) {
                console.error(`${LOG_PREFIX} Erreur mise à jour note:`, error);
                return NextResponse.json(
                    { error: "Erreur lors de la mise à jour" },
                    { status: 500 }
                );
            }

            result = formatAgendaRow({ ...data, edt_user: userData, modification_history: updatedHistory });
        } else {
            // Créer une nouvelle note avec l'historique initial
            const initialHistory = [{
                user_id: user.sub,
                user_name: userName,
                action: 'created',
                timestamp: now
            }];

            const { data, error } = await supabase
                .from('edt_agenda')
                .insert({
                    user_id: user.sub,
                    course_uid: course_uid,
                    notes: JSON.stringify(normalizedEntries),
                    modification_history: initialHistory
                })
                .select()
                .single();

            if (error) {
                console.error(`${LOG_PREFIX} Erreur création note:`, error);
                return NextResponse.json(
                    { error: "Erreur lors de la création" },
                    { status: 500 }
                );
            }

            result = formatAgendaRow({ ...data, edt_user: userData, modification_history: initialHistory });
        }

        return NextResponse.json({
            success: true,
            note: result
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/agenda?course_uid=...
 * Supprime une note pour un cours
 */
export async function DELETE(request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json(
                { error: "Non authentifié" },
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
        const courseUid = searchParams.get('course_uid');

        if (!courseUid) {
            return NextResponse.json(
                { error: "course_uid est requis" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('edt_agenda')
            .delete()
            .eq('user_id', user.sub)
            .eq('course_uid', courseUid);

        if (error) {
            console.error(`${LOG_PREFIX} Erreur suppression note:`, error);
            return NextResponse.json(
                { error: "Erreur lors de la suppression" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Note supprimée"
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}

