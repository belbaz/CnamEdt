import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/sessionToken';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

const LOG_PREFIX = "[Auth]";

/**
 * Vérifie que l'utilisateur est authentifié et a le rôle superAdmin
 * Double vérification : token JWT + vérification en base de données
 * 
 * @returns {Promise<{user: object|null, error: string|null, status: number}>}
 */
export async function requireSuperAdmin() {
    try {
        // 1. Vérifier la session cookie
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;

        if (!session) {
            return {
                user: null,
                error: "Non authentifié",
                status: 401
            };
        }

        // 2. Vérifier le token JWT
        const user = verifySessionToken(session);
        if (!user || !user.sub) {
            return {
                user: null,
                error: "Session invalide",
                status: 401
            };
        }

        // 3. Vérifier le rôle dans le token (première vérification rapide)
        if (user.role !== 'superAdmin') {
            console.warn(`${LOG_PREFIX} Tentative d'accès non autorisé - User ID: ${user.sub}, Role: ${user.role}`);
            return {
                user: null,
                error: "Accès refusé : rôle insuffisant",
                status: 403
            };
        }

        // 4. Double vérification : vérifier le rôle en base de données (sécurité renforcée)
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            console.error(`${LOG_PREFIX} Client Supabase introuvable`);
            return {
                user: null,
                error: "Service indisponible",
                status: 500
            };
        }

        const { data: dbUser, error: dbError } = await supabase
            .from('edt_user')
            .select('id, email, role, is_active')
            .eq('id', user.sub)
            .maybeSingle();

        if (dbError) {
            console.error(`${LOG_PREFIX} Erreur vérification DB:`, dbError);
            return {
                user: null,
                error: "Erreur lors de la vérification des permissions",
                status: 500
            };
        }

        if (!dbUser) {
            console.warn(`${LOG_PREFIX} Utilisateur introuvable en DB - User ID: ${user.sub}`);
            return {
                user: null,
                error: "Utilisateur introuvable",
                status: 401
            };
        }

        // 5. Vérifier que le compte est actif
        if (!dbUser.is_active) {
            console.warn(`${LOG_PREFIX} Compte inactif - User ID: ${user.sub}`);
            return {
                user: null,
                error: "Compte non activé",
                status: 403
            };
        }

        // 6. Vérifier le rôle en base de données (double vérification)
        if (dbUser.role !== 'superAdmin') {
            console.warn(`${LOG_PREFIX} Accès refusé - User ID: ${user.sub}, Role DB: ${dbUser.role}, Role Token: ${user.role}`);
            return {
                user: null,
                error: "Accès refusé : rôle insuffisant",
                status: 403
            };
        }

        // 7. Retourner l'utilisateur vérifié
        return {
            user: {
                id: dbUser.id,
                email: dbUser.email,
                role: dbUser.role,
                name: user.name,
                lastName: user.lastName
            },
            error: null,
            status: 200
        };

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return {
            user: null,
            error: "Erreur serveur",
            status: 500
        };
    }
}

/**
 * Vérifie que l'utilisateur est authentifié (sans vérification de rôle)
 * 
 * @returns {Promise<{user: object|null, error: string|null, status: number}>}
 */
export async function requireAuth() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;

        if (!session) {
            return {
                user: null,
                error: "Non authentifié",
                status: 401
            };
        }

        const user = verifySessionToken(session);
        if (!user || !user.sub) {
            return {
                user: null,
                error: "Session invalide",
                status: 401
            };
        }

        return {
            user: {
                id: user.sub,
                email: user.email,
                role: user.role,
                name: user.name,
                lastName: user.lastName
            },
            error: null,
            status: 200
        };

    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur inattendue:`, error);
        return {
            user: null,
            error: "Erreur serveur",
            status: 500
        };
    }
}

