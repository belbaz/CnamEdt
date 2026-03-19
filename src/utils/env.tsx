// @ts-nocheck
"use client";
import { useState, useEffect } from 'react';

/**
 * 🔒 SÉCURITÉ - Variables d'environnement
 * 
 * IMPORTANT : Ce fichier utilise uniquement NEXT_PUBLIC_ENV qui est DÉJÀ exposé au client.
 * 
 * ✅ SÉCURISÉ :
 * - NEXT_PUBLIC_ENV est déjà dans le bundle JavaScript (comportement normal Next.js)
 * - Aucun secret n'est exposé (SUPABASE_SERVICE_ROLE, ICS_URL sans NEXT_PUBLIC_ restent côté serveur)
 * - Le cookie isDevMode ne donne accès à RIEN côté serveur (uniquement affichage UI)
 * - Le cookie isDevMode ne peut pas être utilisé pour accéder à des routes API protégées
 * 
 * ⚠️ Note : NEXT_PUBLIC_* signifie "public" - ces variables sont intentionnellement exposées au client.
 * C'est normal et attendu dans Next.js. Les secrets n'ont PAS le préfixe NEXT_PUBLIC_.
 */

// Helper pour lire un cookie
function getCookie(name) {
    if (typeof document === 'undefined') {
        return null;
    }
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

// Helper d'environnement unifié pour l'app (client-side)
// Vérifie d'abord le cookie isDevMode, puis l'environnement
// ⚠️ ATTENTION: Ne pas utiliser dans le rendu initial pour éviter les erreurs d'hydratation
// Utilisez useDevMode() hook à la place dans les composants React
// 
// 🔒 SÉCURITÉ : Cette fonction est UNIQUEMENT côté client et ne donne accès à aucun secret.
// Le cookie isDevMode contrôle uniquement l'affichage UI (infos supplémentaires, boutons dev).
export function isDevMode() {
    try {
        // Vérifier d'abord le cookie isDevMode (bypass l'env)
        if (typeof document !== 'undefined') {
            const cookieValue = getCookie('isDevMode');
            if (cookieValue === 'true') {
                return true;
            }
        }
        
        // Sinon, vérifier l'environnement normal
        // Note: NEXT_PUBLIC_ENV est déjà exposé au client (c'est normal avec le préfixe NEXT_PUBLIC_)
        if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_ENV) {
            return process.env.NEXT_PUBLIC_ENV === 'DEV';
        }
    } catch (_) {
        // Ignorer toute erreur d'accès à process côté client
    }
    return false;
}

// Hook React pour utiliser isDevMode sans erreur d'hydratation
// Ce hook vérifie le cookie uniquement après l'hydratation
export function useDevMode() {
    // Commencer avec la valeur de l'env (sans cookie) pour éviter l'hydratation mismatch
    const [devMode, setDevMode] = useState(() => {
        try {
            if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_ENV) {
                return process.env.NEXT_PUBLIC_ENV === 'DEV';
            }
        } catch (_) {
            // Ignorer toute erreur
        }
        return false;
    });

    useEffect(() => {
        // Après l'hydratation, vérifier le cookie
        const cookieValue = getCookie('isDevMode');
        if (cookieValue === 'true') {
            setDevMode(true);
        } else {
            // Sinon, utiliser la valeur de l'env
            try {
                if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_ENV) {
                    setDevMode(process.env.NEXT_PUBLIC_ENV === 'DEV');
                } else {
                    setDevMode(false);
                }
            } catch (_) {
                setDevMode(false);
            }
        }
    }, []);

    return devMode;
}

// Const prête à l'emploi si on préfère sans appel de fonction
// Note: Cette constante est évaluée au chargement du module et ne réagira pas aux changements de cookie
// Utilisez isDevMode() pour une vérification dynamique (hors rendu React) ou useDevMode() hook dans les composants
export const IS_DEV_MODE = isDevMode();
