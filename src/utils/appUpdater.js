"use client";

/**
 * Service pour gérer la mise à jour automatique de l'application
 * Utilise directement l'interface JavaScript native Android
 */

/**
 * Vérifie si l'interface native est disponible
 * @returns {boolean}
 */
function isNativeInterfaceAvailable() {
    return typeof window !== 'undefined' && 
           window.AndroidAppUpdater !== undefined &&
           typeof window.AndroidAppUpdater.downloadAndInstallApk === 'function';
}

/**
 * Initialise le service de mise à jour
 * @returns {Promise<boolean>} true si le service est disponible
 */
export async function initAppUpdater() {
    if (typeof window === 'undefined') return false;
    
    const available = isNativeInterfaceAvailable();
    console.log('[AppUpdater] Interface native disponible:', available);
    return available;
}

/**
 * Vérifie si l'application peut demander la permission d'installer des packages
 * @returns {Promise<{canRequest: boolean}>}
 */
export async function canRequestPackageInstalls() {
    if (!isNativeInterfaceAvailable()) {
        return { canRequest: false };
    }

    try {
        const canRequest = window.AndroidAppUpdater.canRequestPackageInstalls();
        return { canRequest };
    } catch (error) {
        console.error('[AppUpdater] Erreur lors de la vérification:', error);
        return { canRequest: false };
    }
}

/**
 * Télécharge et installe automatiquement un APK
 * @param {string} url - URL de l'APK à télécharger
 * @param {string} version - Version de l'APK
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function downloadAndInstall(url, version) {
    if (!isNativeInterfaceAvailable()) {
        throw new Error('Interface native non disponible. Vérifiez que vous êtes dans l\'application Android.');
    }

    return new Promise((resolve, reject) => {
        // Écouter les événements de succès et d'erreur
        const handleSuccess = (event) => {
            window.removeEventListener('appUpdateSuccess', handleSuccess);
            window.removeEventListener('appUpdateError', handleError);
            resolve({ success: true, message: event.detail || 'Installation démarrée' });
        };
        
        const handleError = (event) => {
            window.removeEventListener('appUpdateSuccess', handleSuccess);
            window.removeEventListener('appUpdateError', handleError);
            reject(new Error(event.detail || 'Erreur lors de l\'installation'));
        };
        
        window.addEventListener('appUpdateSuccess', handleSuccess);
        window.addEventListener('appUpdateError', handleError);
        
        try {
            // Appeler l'interface native
            window.AndroidAppUpdater.downloadAndInstallApk(url, version);
            
            // Timeout après 30 secondes si pas de réponse
            setTimeout(() => {
                window.removeEventListener('appUpdateSuccess', handleSuccess);
                window.removeEventListener('appUpdateError', handleError);
                reject(new Error('Timeout: aucune réponse après 30 secondes'));
            }, 30000);
        } catch (error) {
            window.removeEventListener('appUpdateSuccess', handleSuccess);
            window.removeEventListener('appUpdateError', handleError);
            reject(error);
        }
    });
}

