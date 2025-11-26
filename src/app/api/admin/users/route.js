// ---- src/app/api/admin/users/route.js ----
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOG_PREFIX = "[API admin/users]";

/**
 * GET /api/admin/users
 * Récupère la liste des utilisateurs (nécessite le rôle superAdmin)
 * Query params: limit, offset, search, role, is_active, sort_by, sort_order
 */
export async function GET(request) {
    try {
        // Vérifier l'authentification et le rôle superAdmin
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
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200); // Limite max de sécurité
        const offset = parseInt(searchParams.get('offset') || '0');
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';
        const isActive = searchParams.get('is_active');
        const sortBy = searchParams.get('sort_by') || 'created_at';
        const sortOrder = searchParams.get('sort_order') || 'desc';

        // Construire la requête
        let query = supabase
            .from('edt_user')
            .select('id, email, role, is_active, name, last_name, date_online, created_at', { count: 'exact' });

        // Filtres
        if (search) {
            // Recherche dans email, name, last_name
            query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,last_name.ilike.%${search}%`);
        }

        if (role) {
            query = query.eq('role', role);
        }

        if (isActive !== null && isActive !== '') {
            query = query.eq('is_active', isActive === 'true');
        }

        // Tri
        const validSortColumns = ['created_at', 'email', 'name', 'last_name', 'date_online', 'role'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error(`${LOG_PREFIX} Erreur récupération utilisateurs:`, error);
            return NextResponse.json(
                { error: "Erreur lors de la récupération des utilisateurs" },
                { status: 500 }
            );
        }

        console.log(`${LOG_PREFIX} ${data?.length || 0} utilisateurs récupérés (total: ${count || 0})`);

        return NextResponse.json({
            users: data || [],
            total: count || 0,
            limit,
            offset
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
 * PATCH /api/admin/users
 * Met à jour un utilisateur (nécessite le rôle superAdmin)
 * Body: { id, email?, role?, is_active?, name?, last_name? }
 */
export async function PATCH(request) {
    try {
        // Vérifier l'authentification et le rôle superAdmin
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

        const body = await request.json();
        const { id, email, role, is_active, name, last_name } = body;

        if (!id) {
            return NextResponse.json(
                { error: "ID utilisateur requis" },
                { status: 400 }
            );
        }

        // Vérifier que l'utilisateur existe
        const { data: existingUser, error: fetchError } = await supabase
            .from('edt_user')
            .select('id')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) {
            console.error(`${LOG_PREFIX} Erreur vérification utilisateur:`, fetchError);
            return NextResponse.json(
                { error: "Erreur lors de la vérification de l'utilisateur" },
                { status: 500 }
            );
        }

        if (!existingUser) {
            return NextResponse.json(
                { error: "Utilisateur introuvable" },
                { status: 404 }
            );
        }

        // Construire l'objet de mise à jour (uniquement les champs fournis)
        const updates = {};
        if (email !== undefined) updates.email = email;
        if (role !== undefined) {
            // Valider le rôle
            const validRoles = ['user', 'admin', 'superAdmin'];
            if (!validRoles.includes(role)) {
                return NextResponse.json(
                    { error: `Rôle invalide. Rôles autorisés: ${validRoles.join(', ')}` },
                    { status: 400 }
                );
            }
            updates.role = role;
        }
        if (is_active !== undefined) updates.is_active = is_active;
        if (name !== undefined) updates.name = name;
        if (last_name !== undefined) updates.last_name = last_name;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "Aucune modification à effectuer" },
                { status: 400 }
            );
        }

        // Mise à jour
        const { data: updatedUser, error: updateError } = await supabase
            .from('edt_user')
            .update(updates)
            .eq('id', id)
            .select('id, email, role, is_active, name, last_name, date_online, created_at')
            .single();

        if (updateError) {
            console.error(`${LOG_PREFIX} Erreur mise à jour utilisateur:`, updateError);
            return NextResponse.json(
                { error: "Erreur lors de la mise à jour de l'utilisateur" },
                { status: 500 }
            );
        }

        console.log(`${LOG_PREFIX} Utilisateur ${id} mis à jour par ${authResult.user.email}`);

        return NextResponse.json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}

