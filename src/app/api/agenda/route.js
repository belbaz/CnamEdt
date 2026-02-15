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

    // Parser les labels par paragraphe depuis entry_labels
    let entryLabels = {};
    if (row.entry_labels && typeof row.entry_labels === 'object') {
        entryLabels = row.entry_labels;
    }
    
    return {
        ...row,
        entries: parseStoredNoteValue(row.notes),
        user_name: userName,
        user_name_first: userInfo?.name || null,
        user_name_last: userInfo?.last_name || null,
        labels: Array.isArray(row.labels) ? row.labels : (row.labels ? [row.labels] : []), // Garder pour compatibilité
        entry_labels: entryLabels, // Nouveau : labels par paragraphe
        orphan_event_info: row.orphan_event_info || null, // Infos du cours depuis events_versions si orphelin
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
 * Ou, si mode=public, toujours les notes publiques
 * Ou les notes d'un cours spécifique si course_uid est fourni en query param
 * Retourne toujours 200, avec authenticated: false si non connecté
 */
export async function GET(request) {
    try {
        // Vérifier si le mode démo est activé (uniquement sur demo-edt.vercel.app)
        const { checkDemoModeFromRequest } = await import('@/services/demoDataService');
        const isDemoMode = checkDemoModeFromRequest(request);
        
        if (isDemoMode) {
            console.log(`${LOG_PREFIX} Mode démo activé, retour des notes de démo`);
            try {
                const url = new URL(request.url);
                const langParam = url.searchParams.get('lang');
                const acceptLang = request.headers.get('accept-language') || '';
                const lang = langParam || (acceptLang.toLowerCase().startsWith('en') ? 'en' : 'fr');
                const { generateDemoYearData } = await import('@/services/demoDataService');
                const demoData = generateDemoYearData(lang);
                
                // Convertir les notes Map en format compatible avec l'API
                // Les notes utilisent l'UID de l'événement comme clé (course_uid)
                const notesArray = Array.from(demoData.notes.entries()).map(([course_uid, noteData]) => {
                    // noteData peut être soit un objet {entries, entry_labels} soit une string (ancien format)
                    let entries, entryLabels;
                    if (typeof noteData === 'object' && noteData !== null && Array.isArray(noteData.entries)) {
                        // Nouveau format avec entries et entry_labels
                        entries = noteData.entries;
                        entryLabels = noteData.entry_labels || {};
                    } else {
                        // Ancien format (string) - compatibilité
                        const noteText = typeof noteData === 'string' ? noteData : String(noteData);
                        entries = parseStoredNoteValue(noteText);
                        entryLabels = {};
                    }
                    
                    // Convertir entries en string pour le champ notes (format de stockage)
                    const notesString = JSON.stringify(entries);
                    
                    return {
                        id: `demo-${course_uid}`,
                        course_uid: course_uid, // C'est l'UID de l'événement
                        notes: notesString,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        user_id: 'demo-user',
                        modification_history: null,
                        labels: [], // Ancien système (vide pour compatibilité)
                        entry_labels: entryLabels, // Nouveau système avec labels par paragraphe
                        entries: entries,
                        user_name: 'Mode Démo',
                        user_name_first: 'Démo',
                        user_name_last: 'Mode'
                    };
                });
                
                return NextResponse.json({
                    authenticated: false,
                    notes: notesArray,
                    isDemo: true
                });
            } catch (demoError) {
                console.error(`${LOG_PREFIX} Erreur lors de la génération des notes de démo:`, demoError);
                // En cas d'erreur, continuer avec le flux normal
            }
        }
        
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
        const viewMode = searchParams.get('mode');
        const forcePublicMode = viewMode === 'public';

        let query;
        let isAuthenticated = !!user;

        if (user && !forcePublicMode) {
            // Utilisateur connecté : récupérer ses propres notes
            query = supabase
                .from('edt_agenda')
                .select('id, course_uid, notes, created_at, updated_at, user_id, modification_history, labels, entry_labels')
                .eq('user_id', user.sub)
                .order('updated_at', { ascending: false });

            if (courseUid) {
                query = query.eq('course_uid', courseUid);
            }
        } else {
            // Utilisateur non connecté ou mode public forcé : récupérer toutes les notes publiques
            // Pour chaque course_uid, on prend la note la plus récente
            query = supabase
                .from('edt_agenda')
                .select('id, course_uid, notes, created_at, updated_at, user_id, modification_history, labels, entry_labels')
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

        // Récupérer les infos des cours depuis events_versions pour les notes orphelines
        const courseUids = processedData.map(note => note.course_uid).filter(Boolean);
        let orphanEventInfoMap = {};
        
        if (courseUids.length > 0) {
            // Récupérer la dernière version de chaque course_uid depuis events_versions
            // On récupère toutes les versions et on garde la plus récente par uid
            const { data: eventVersions, error: versionsError } = await supabase
                .from('events_versions')
                .select('uid, summary, start, end_time, location, version_no')
                .in('uid', courseUids)
                .order('uid', { ascending: true })
                .order('version_no', { ascending: false });
            
            if (!versionsError && eventVersions) {
                // Créer un Map avec la dernière version de chaque uid
                const versionMap = new Map();
                for (const version of eventVersions) {
                    if (!versionMap.has(version.uid)) {
                        versionMap.set(version.uid, version);
                    }
                }
                orphanEventInfoMap = Object.fromEntries(versionMap);
            }
        }

        // Formater les données avec les informations utilisateur et les infos de cours orphelins
        const formattedData = processedData.map(row => {
            const userInfo = userInfoMap[row.user_id] || null;
            const enrichedHistory = enrichHistory(row.modification_history);
            
            // Si le course_uid existe dans events_versions mais pas dans les events actuels,
            // on enrichit avec les infos de la dernière version connue
            const orphanEventInfo = orphanEventInfoMap[row.course_uid] || null;
            
            return formatAgendaRow({ 
                ...row, 
                edt_user: userInfo,
                modification_history: enrichedHistory,
                orphan_event_info: orphanEventInfo // Infos du cours depuis events_versions si orphelin
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
 * Les visiteurs ne peuvent pas créer ou modifier de notes
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

        // Vérifier le rôle depuis la base de données (pas depuis le token)
        const { data: dbUser, error: roleError } = await supabase
            .from('edt_user')
            .select('role')
            .eq('id', user.sub)
            .maybeSingle();

        if (roleError) {
            console.error(`${LOG_PREFIX} Erreur vérification rôle:`, roleError);
            return NextResponse.json(
                { error: "Erreur lors de la vérification des permissions" },
                { status: 500 }
            );
        }

        // Refuser l'accès aux visiteurs
        if (dbUser?.role === 'visiteur') {
            console.warn(`${LOG_PREFIX} Tentative de modification par un visiteur - User ID: ${user.sub}`);
            return NextResponse.json(
                { error: "Accès refusé : les visiteurs ne peuvent pas créer ou modifier de notes" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { course_uid, notes, labels, entry_labels } = body;

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

        // Valider et normaliser les labels par paragraphe (entry_labels)
        let normalizedEntryLabels = {};
        if (entry_labels !== undefined) {
            if (typeof entry_labels !== 'object' || Array.isArray(entry_labels)) {
                return NextResponse.json(
                    { error: "entry_labels doit être un objet avec des index numériques comme clés" },
                    { status: 400 }
                );
            }
            // Normaliser entry_labels : chaque clé doit être un index numérique, chaque valeur un tableau de strings
            for (const [indexStr, labelArray] of Object.entries(entry_labels)) {
                const index = parseInt(indexStr, 10);
                if (isNaN(index) || index < 0) {
                    return NextResponse.json(
                        { error: `entry_labels: la clé "${indexStr}" doit être un index numérique valide` },
                        { status: 400 }
                    );
                }
                if (!Array.isArray(labelArray)) {
                    return NextResponse.json(
                        { error: `entry_labels: la valeur pour l'index ${index} doit être un tableau` },
                        { status: 400 }
                    );
                }
                // Filtrer les labels vides et s'assurer qu'ils sont des chaînes
                normalizedEntryLabels[indexStr] = labelArray
                    .filter(label => typeof label === 'string' && label.trim().length > 0)
                    .map(label => label.trim());
            }
        }

        // Garder la compatibilité avec l'ancien système de labels (pour migration progressive)
        let normalizedLabels = [];
        if (labels !== undefined) {
            if (!Array.isArray(labels)) {
                return NextResponse.json(
                    { error: "labels doit être un tableau" },
                    { status: 400 }
                );
            }
            normalizedLabels = labels
                .filter(label => typeof label === 'string' && label.trim().length > 0)
                .map(label => label.trim());
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
                    const errorMessage = deleteError.message || deleteError.code || "Erreur lors de la suppression";
                    return NextResponse.json(
                        { error: `Erreur SQL lors de la suppression : ${errorMessage}` },
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
            const updateData = {
                notes: JSON.stringify(normalizedEntries),
                updated_at: now,
                modification_history: updatedHistory
            };
            
            // Ajouter les labels par paragraphe (entry_labels) si fournis
            if (entry_labels !== undefined) {
                updateData.entry_labels = normalizedEntryLabels;
            }
            
            // Garder la compatibilité avec l'ancien système (pour migration progressive)
            if (labels !== undefined) {
                updateData.labels = normalizedLabels;
            }
            
            const { data, error } = await supabase
                .from('edt_agenda')
                .update(updateData)
                .eq('id', existing.id)
                .eq('user_id', user.sub)
                .select()
                .single();

            if (error) {
                console.error(`${LOG_PREFIX} Erreur mise à jour note:`, error);
                const errorMessage = error.message || error.code || "Erreur lors de la mise à jour";
                return NextResponse.json(
                    { error: `Erreur SQL lors de la mise à jour : ${errorMessage}` },
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

            const insertData = {
                user_id: user.sub,
                course_uid: course_uid,
                notes: JSON.stringify(normalizedEntries),
                modification_history: initialHistory
            };
            
            // Ajouter les labels par paragraphe (entry_labels) si fournis
            if (entry_labels !== undefined) {
                insertData.entry_labels = normalizedEntryLabels;
            }
            
            // Garder la compatibilité avec l'ancien système (pour migration progressive)
            if (labels !== undefined) {
                insertData.labels = normalizedLabels;
            }
            
            const { data, error } = await supabase
                .from('edt_agenda')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                console.error(`${LOG_PREFIX} Erreur création note:`, error);
                const errorMessage = error.message || error.code || "Erreur lors de la création";
                return NextResponse.json(
                    { error: `Erreur SQL lors de la création : ${errorMessage}` },
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
 * Les visiteurs ne peuvent pas supprimer de notes
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

        // Vérifier le rôle depuis la base de données (pas depuis le token)
        const { data: dbUser, error: roleError } = await supabase
            .from('edt_user')
            .select('role')
            .eq('id', user.sub)
            .maybeSingle();

        if (roleError) {
            console.error(`${LOG_PREFIX} Erreur vérification rôle:`, roleError);
            return NextResponse.json(
                { error: "Erreur lors de la vérification des permissions" },
                { status: 500 }
            );
        }

        // Refuser l'accès aux visiteurs
        if (dbUser?.role === 'visiteur') {
            console.warn(`${LOG_PREFIX} Tentative de suppression par un visiteur - User ID: ${user.sub}`);
            return NextResponse.json(
                { error: "Accès refusé : les visiteurs ne peuvent pas supprimer de notes" },
                { status: 403 }
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

