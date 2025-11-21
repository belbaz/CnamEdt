"use client";
import { useState, useEffect, useCallback } from 'react';
import './WebVersionChecker.css';

/**
 * Composant qui vérifie périodiquement si une nouvelle version du site est disponible
 * Affiche une notification pour inviter l'utilisateur à recharger
 */
export default function WebVersionChecker() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [currentBuildId, setCurrentBuildId] = useState(null);
    const [isReloading, setIsReloading] = useState(false);

    // Récupérer le build ID initial au montage
    useEffect(() => {
        const fetchInitialBuildId = async () => {
            try {
                const response = await fetch('/api/build-id', {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });

                if (response.ok) {
                    const data = await response.json();
                    setCurrentBuildId(data.buildId);
                    console.log('[WebVersionChecker] Build ID initial:', data.buildId);
                }
            } catch (error) {
                console.error('[WebVersionChecker] Erreur lors de la récupération du build ID initial:', error);
            }
        };

        fetchInitialBuildId();
    }, []);

    // Vérifier périodiquement si une nouvelle version est disponible
    useEffect(() => {
        if (!currentBuildId) return;

        const checkForUpdate = async () => {
            try {
                const response = await fetch('/api/build-id', {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });

                if (response.ok) {
                    const data = await response.json();

                    // Si le build ID a changé, une nouvelle version est disponible
                    if (data.buildId !== currentBuildId) {
                        console.log('[WebVersionChecker] Nouvelle version détectée!');
                        console.log('[WebVersionChecker] Ancien:', currentBuildId, '→ Nouveau:', data.buildId);
                        setUpdateAvailable(true);
                        setIsVisible(true);
                    }
                }
            } catch (error) {
                // Ignorer les erreurs silencieusement (peut être hors ligne)
                console.debug('[WebVersionChecker] Erreur lors de la vérification:', error.message);
            }
        };

        // Vérifier toutes les 5 minutes
        const interval = setInterval(checkForUpdate, 5 * 60 * 1000);

        // Vérifier aussi au focus de la fenêtre (retour sur l'onglet)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkForUpdate();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentBuildId]);

    // Vider le cache automatiquement lors d'un rechargement manuel si une mise à jour est disponible
    useEffect(() => {
        if (!updateAvailable) return;

        const handleBeforeUnload = async (e) => {
            // Ne pas afficher de message de confirmation
            // Juste vider le cache en arrière-plan
            console.log('[WebVersionChecker] Rechargement détecté - Nettoyage du cache...');

            try {
                // Vider les caches de manière synchrone (navigator.sendBeacon style)
                if ('caches' in window) {
                    // Marquer pour nettoyage au prochain chargement
                    sessionStorage.setItem('_clearCacheOnLoad', 'true');
                }
            } catch (error) {
                console.error('[WebVersionChecker] Erreur beforeunload:', error);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [updateAvailable]);

    // Nettoyer le cache au chargement si demandé
    useEffect(() => {
        const shouldClearCache = sessionStorage.getItem('_clearCacheOnLoad');

        if (shouldClearCache === 'true') {
            console.log('[WebVersionChecker] Nettoyage du cache au chargement...');
            sessionStorage.removeItem('_clearCacheOnLoad');

            // Vider tous les caches
            (async () => {
                try {
                    if ('caches' in window) {
                        const cacheNames = await caches.keys();
                        console.log('[WebVersionChecker] Suppression de', cacheNames.length, 'caches');
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                    }

                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        console.log('[WebVersionChecker] Désinscription de', registrations.length, 'service workers');
                        await Promise.all(registrations.map(reg => reg.unregister()));
                    }

                    console.log('[WebVersionChecker] Cache nettoyé avec succès');
                } catch (error) {
                    console.error('[WebVersionChecker] Erreur lors du nettoyage:', error);
                }
            })();
        }
    }, []);

    const handleReload = useCallback(async () => {
        setIsReloading(true);

        console.log('[WebVersionChecker] Début du rechargement avec nettoyage complet...');

        try {
            // 1. Vider tous les caches du Service Worker
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log('[WebVersionChecker] Suppression de', cacheNames.length, 'caches');
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            // 2. Désinscrire tous les Service Workers (optionnel mais recommandé)
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                console.log('[WebVersionChecker] Désinscription de', registrations.length, 'service workers');
                await Promise.all(registrations.map(reg => reg.unregister()));
            }

            // 3. Vider le localStorage (sauf les préférences utilisateur importantes)
            // On garde : darkMode, oledMode, compactMode, verticalMode, hideWeekends
            const keysToKeep = ['darkMode', 'oledMode', 'compactMode', 'verticalMode', 'hideWeekends'];
            const savedPrefs = {};
            keysToKeep.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) savedPrefs[key] = value;
            });

            localStorage.clear();

            // Restaurer les préférences
            Object.entries(savedPrefs).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });

            console.log('[WebVersionChecker] localStorage nettoyé (préférences conservées)');

            // 4. Vider le sessionStorage
            sessionStorage.clear();
            console.log('[WebVersionChecker] sessionStorage nettoyé');

        } catch (error) {
            console.error('[WebVersionChecker] Erreur lors du nettoyage:', error);
        }

        // 5. Forcer le rechargement complet avec bypass du cache
        // Utiliser location.href avec timestamp pour forcer un hard reload
        setTimeout(() => {
            console.log('[WebVersionChecker] Rechargement de la page...');
            // Ajouter un paramètre de cache-bust pour forcer le rechargement
            const url = new URL(window.location.href);
            url.searchParams.set('_reload', Date.now());
            window.location.href = url.toString();
        }, 500);
    }, []);

    const handleDismiss = useCallback(() => {
        setIsVisible(false);
        // Réafficher dans 30 minutes si l'utilisateur dismiss
        setTimeout(() => {
            if (updateAvailable) {
                setIsVisible(true);
            }
        }, 30 * 60 * 1000);
    }, [updateAvailable]);

    if (!isVisible || !updateAvailable) return null;

    return (
        <div className="web-version-notification">
            <div className="web-version-content">
                <div className="web-version-icon">🎉</div>
                <div className="web-version-text">
                    <strong>Nouvelle version disponible</strong>
                    <span>Rechargez pour profiter des dernières améliorations</span>
                </div>
                <div className="web-version-actions">
                    <button
                        className="web-version-button web-version-button-primary"
                        onClick={handleReload}
                        disabled={isReloading}
                    >
                        {isReloading ? 'Rechargement...' : 'Recharger'}
                    </button>
                    <button
                        className="web-version-button web-version-button-secondary"
                        onClick={handleDismiss}
                        disabled={isReloading}
                    >
                        Plus tard
                    </button>
                </div>
            </div>
        </div>
    );
}
