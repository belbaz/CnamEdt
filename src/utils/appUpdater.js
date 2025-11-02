"use client";

/**
 * Service pour gérer la mise à jour automatique de l'application
 * Utilise le plugin Capacitor personnalisé AppUpdater
 */

let AppUpdaterPlugin = null;

/**
 * Initialise le plugin AppUpdater
 * @returns {Promise<boolean>} true si le plugin est disponible
 */
export async function initAppUpdater() {
    if (typeof window === 'undefined') return false;

    try {
        const { registerPlugin } = require('@capacitor/core');
        AppUpdaterPlugin = registerPlugin('AppUpdater');
        return AppUpdaterPlugin !== null;
    } catch (error) {
        console.warn('[AppUpdater] Plugin non disponible:', error);
        return false;
    }
}

/**
 * Vérifie si l'application peut demander la permission d'installer des packages
 * @returns {Promise<{canRequest: boolean}>}
 */
export async function canRequestPackageInstalls() {
    if (!AppUpdaterPlugin) {
        await initAppUpdater();
    }

    if (!AppUpdaterPlugin) {
        return { canRequest: false };
    }

    try {
        const result = await AppUpdaterPlugin.canRequestPackageInstalls();
        return result;
    } catch (error) {
        console.error('[AppUpdater] Erreur lors de la vérification:', error);
        return { canRequest: false };
    }
}

/**
 * Télécharge et installe automatiquement un APK
 * @param {string} url - URL de l'APK à télécharger
 * @param {string} version - Version de l'APK
 * @param {Function} onProgress - Callback pour le suivi de progression
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function downloadAndInstall(url, version) {
    if (!AppUpdaterPlugin) {
        await initAppUpdater();
    }

    if (!AppUpdaterPlugin) {
        throw new Error('Plugin AppUpdater non disponible. Vérifiez que vous êtes dans l\'application native.');
    }

    try {
        // Télécharger et installer
        const result = await AppUpdaterPlugin.downloadAndInstall({
            url,
            version
        });
        
        return result;
    } catch (error) {
        console.error('[AppUpdater] Erreur lors du téléchargement/installation:', error);
        throw error;
    }
}

