"use client";

// Helper d'environnement unifié pour l'app (client-side)
export function isDevMode() {
    try {
        if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_ENV) {
            return process.env.NEXT_PUBLIC_ENV === 'DEV';
        }
    } catch (_) {
        // Ignorer toute erreur d'accès à process côté client
    }
    return false;
}

// Const prête à l'emploi si on préfère sans appel de fonction
export const IS_DEV_MODE = isDevMode();