// @ts-nocheck
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/sessionToken';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

const LOG_PREFIX = "[Auth]";

/**
 * Vérifie que l'utilisateur est authentifié et a le rôle superAdmin
 * SÉCURITÉ : On utilise uniquement l'ID utilisateur du token JWT (signé et vérifié)
 * Le rôle est TOUJOURS vérifié en base de données (source de vérité)
 * On ignore complètement le rôle dans le token pour éviter les falsifications
 * 
 * @returns {Promise<{user: object|null, error: string|null, status: number}>}
 */
export async function requireSuperAdmin() {
    try {
        // 1. Vérifier la session cookie
        const cookieStore = await cookies();
        const session = cookieStore.get("edt_session")?.value;

        if (!session) {
            console.warn(`${LOG_PREFIX} Pas de session cookie trouvé`);
            return {
                user: null,
                error: "Non authentifié",
                status: 401
            };
        }

        // 2. Vérifier le token JWT pour obtenir l'ID utilisateur de manière sécurisée
        // Le token est signé, donc on peut faire confiance à l'ID qu'il contient
        const tokenData = verifySessionToken(session);
        if (!tokenData || !tokenData.sub) {
            console.warn(`${LOG_PREFIX} Token JWT invalide ou manquant`, { hasTokenData: !!tokenData, hasSub: !!tokenData?.sub });
            return {
                user: null,
                error: "Session invalide",
                status: 401
            };
        }

        const userId = tokenData.sub; // ID utilisateur depuis le token (sécurisé car signé)
        console.log(`${LOG_PREFIX} Token JWT vérifié - User ID: ${userId}`);

        // 3. Récupérer le rôle directement depuis la base de données (source de vérité)
        // On ignore complètement le rôle dans le token pour éviter les falsifications
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
            .select('id, email, role, is_active, name, last_name')
            .eq('id', userId)
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
            console.warn(`${LOG_PREFIX} Utilisateur introuvable en DB - User ID: ${userId}`);
            return {
                user: null,
                error: "Utilisateur introuvable",
                status: 401
            };
        }

        console.log(`${LOG_PREFIX} Utilisateur trouvé en DB - ID: ${dbUser.id}, Email: ${dbUser.email}, Role DB: "${dbUser.role}", is_active: ${dbUser.is_active}`);

        // 4. Vérifier que le compte est actif
        if (!dbUser.is_active) {
            console.warn(`${LOG_PREFIX} Compte inactif - User ID: ${userId}, Email: ${dbUser.email}`);
            return {
                user: null,
                error: "Compte non activé",
                status: 403
            };
        }

        // 5. Vérifier le rôle en base de données (SEULE source de vérité)
        // Normaliser le rôle pour la comparaison (trim + lowercase)
        const normalizedDbRole = dbUser.role?.trim()?.toLowerCase();
        if (normalizedDbRole !== 'superadmin') {
            console.warn(`${LOG_PREFIX} Accès refusé - User ID: ${userId}, Email: ${dbUser.email}, Role DB: "${dbUser.role}" (normalisé: "${normalizedDbRole}"), Attendu: "superadmin"`);
            return {
                user: null,
                error: `Accès refusé : rôle insuffisant (rôle en DB: "${dbUser.role}")`,
                status: 403
            };
        }

        console.log(`${LOG_PREFIX} Accès autorisé - User ID: ${userId}, Email: ${dbUser.email}, Role: ${dbUser.role}`);

        // 6. Retourner l'utilisateur vérifié avec les données de la DB (source de vérité)
        return {
            user: {
                id: dbUser.id,
                email: dbUser.email,
                role: dbUser.role,
                name: dbUser.name || tokenData.name,
                lastName: dbUser.last_name || tokenData.lastName
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
 * SÉCURITÉ : Le rôle est récupéré depuis la DB pour cohérence, même si non utilisé pour l'autorisation
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

        // Vérifier le token JWT pour obtenir l'ID utilisateur de manière sécurisée
        const tokenData = verifySessionToken(session);
        if (!tokenData || !tokenData.sub) {
            return {
                user: null,
                error: "Session invalide",
                status: 401
            };
        }

        const userId = tokenData.sub;

        // Récupérer le rôle depuis la DB pour cohérence (même si non utilisé pour l'autorisation)
        const supabase = getSupabaseServerClient();
        if (supabase) {
            const { data: dbUser } = await supabase
                .from('edt_user')
                .select('id, email, role, name, last_name')
                .eq('id', userId)
                .maybeSingle();

            if (dbUser) {
                return {
                    user: {
                        id: dbUser.id,
                        email: dbUser.email,
                        role: dbUser.role, // Rôle depuis la DB
                        name: dbUser.name || tokenData.name,
                        lastName: dbUser.last_name || tokenData.lastName
                    },
                    error: null,
                    status: 200
                };
            }
        }

        // Fallback sur le token si DB indisponible (acceptable car non utilisé pour l'autorisation)
        return {
            user: {
                id: userId,
                email: tokenData.email,
                role: tokenData.role,
                name: tokenData.name,
                lastName: tokenData.lastName
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


