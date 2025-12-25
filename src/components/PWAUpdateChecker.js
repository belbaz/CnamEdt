"use client";
import { useState, useEffect, useCallback } from 'react';
import './PWAUpdateChecker.css';

// Clé pour marquer qu'une mise à jour vient d'être effectuée
const UPDATE_FLAG_KEY = 'pwa_update_in_progress';
const UPDATE_FLAG_TTL = 15000; // 15 secondes

// Clés localStorage à conserver (préférences utilisateur)
// Ces clés ne seront PAS supprimées lors d'une mise à jour
const LOCALSTORAGE_KEYS_TO_KEEP = [
    'compactMode',
    'weekMode', 
    'cookieConsent',
    'theme',
    'devMode',
    'showTestModeIndicator',
    'darkMode',
    'oledMode',
    'autoScrollToday',
    'viewMode',
    'showTimeLabels',
    'hide15MinSpacing',
    'showTimeRemaining',
    'showTooltips',
    'colorPosition',
    'colorBackgroundOpacity',
    'showFullYear',
    'collapsedDays',
    'histo-last-seen-date',
    'histo-auto-check-expanded',
    'pwa_install_dismissed',
    'allow_analytics'
];

/**
 * Supprime VRAIMENT tous les caches de l'application.
 * Cette fonction est SYNCHRONE autant que possible pour éviter les problèmes de timing.
 */
async function nukeAllCaches() {
    if (typeof window === 'undefined') {
        return false;
    }

    console.log('%c[PWAUpdateChecker] 🔥 DÉBUT SUPPRESSION TOTALE DU CACHE 🔥', 'color: red; font-weight: bold; font-size: 14px');

    let success = true;

    // ========== ÉTAPE 1 : SAUVEGARDER LES PRÉFÉRENCES ==========
    console.log('[PWAUpdateChecker] 📦 Sauvegarde des préférences utilisateur...');
    const savedPrefs = {};
    try {
        for (const key of LOCALSTORAGE_KEYS_TO_KEEP) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                savedPrefs[key] = value;
            }
        }
        console.log('[PWAUpdateChecker] ✓ Préférences sauvegardées:', Object.keys(savedPrefs).length);
    } catch (err) {
        console.warn('[PWAUpdateChecker] ⚠ Erreur sauvegarde préférences:', err);
    }

    // ========== ÉTAPE 2 : VIDER LE LOCALSTORAGE (CACHE EDT) ==========
    console.log('[PWAUpdateChecker] 🗑️ Suppression du localStorage...');
    try {
        // Lister ce qu'on va supprimer
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!LOCALSTORAGE_KEYS_TO_KEEP.includes(key)) {
                keysToDelete.push(key);
            }
        }
        console.log('[PWAUpdateChecker] Clés à supprimer:', keysToDelete);
        
        // Supprimer les clés (pas clear() pour garder les préférences)
        for (const key of keysToDelete) {
            localStorage.removeItem(key);
            console.log('[PWAUpdateChecker] ✓ Supprimé:', key);
        }
        console.log('[PWAUpdateChecker] ✓ localStorage nettoyé');
    } catch (err) {
        console.warn('[PWAUpdateChecker] ⚠ Erreur localStorage:', err);
        success = false;
    }

    // ========== ÉTAPE 3 : SUPPRIMER LES CACHES DU CACHE STORAGE ==========
    console.log('[PWAUpdateChecker] 🗑️ Suppression du Cache Storage...');
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            console.log('[PWAUpdateChecker] Caches trouvés:', cacheNames);
            
            for (const cacheName of cacheNames) {
                const deleted = await caches.delete(cacheName);
                console.log(`[PWAUpdateChecker] ${deleted ? '✓' : '✗'} Cache supprimé: ${cacheName}`);
            }
            
            // Vérifier que c'est bien vide
            const remaining = await caches.keys();
            if (remaining.length > 0) {
                console.warn('[PWAUpdateChecker] ⚠ Caches restants:', remaining);
                success = false;
            } else {
                console.log('[PWAUpdateChecker] ✓ Cache Storage vidé');
            }
        } catch (err) {
            console.warn('[PWAUpdateChecker] ⚠ Erreur Cache Storage:', err);
            success = false;
        }
    }

    // ========== ÉTAPE 4 : DÉSINSCRIRE LES SERVICE WORKERS ==========
    console.log('[PWAUpdateChecker] 🗑️ Désinscription des Service Workers...');
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            console.log('[PWAUpdateChecker] Service Workers trouvés:', registrations.length);
            
            for (const registration of registrations) {
                const unregistered = await registration.unregister();
                console.log(`[PWAUpdateChecker] ${unregistered ? '✓' : '✗'} SW désinscrit:`, registration.scope);
            }
            
            // Attendre un peu que la désinscription soit effective
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Vérifier
            const remaining = await navigator.serviceWorker.getRegistrations();
            if (remaining.length > 0) {
                console.warn('[PWAUpdateChecker] ⚠ SWs restants:', remaining.length);
                // Réessayer
                for (const reg of remaining) {
                    await reg.unregister();
                }
            } else {
                console.log('[PWAUpdateChecker] ✓ Tous les SW désinscrits');
            }
        } catch (err) {
            console.warn('[PWAUpdateChecker] ⚠ Erreur SW:', err);
            success = false;
        }
    }

    // ========== ÉTAPE 5 : RE-VÉRIFIER LE CACHE STORAGE ==========
    // Car le SW pouvait être en train de recréer des caches
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            if (cacheNames.length > 0) {
                console.log('[PWAUpdateChecker] ⚠ Caches recréés par SW, suppression à nouveau:', cacheNames);
                for (const cacheName of cacheNames) {
                    await caches.delete(cacheName);
                }
            }
        } catch (err) {
            // Ignore
        }
    }

    // ========== ÉTAPE 6 : RESTAURER LES PRÉFÉRENCES ==========
    console.log('[PWAUpdateChecker] 📦 Restauration des préférences...');
    try {
        for (const [key, value] of Object.entries(savedPrefs)) {
            localStorage.setItem(key, value);
        }
        console.log('[PWAUpdateChecker] ✓ Préférences restaurées');
    } catch (err) {
        console.warn('[PWAUpdateChecker] ⚠ Erreur restauration:', err);
    }

    console.log('%c[PWAUpdateChecker] 🔥 FIN SUPPRESSION - Succès: ' + success + ' 🔥', 'color: red; font-weight: bold; font-size: 14px');
    
    return success;
}

/**
 * Vérifie si une mise à jour est en cours (flag récent dans sessionStorage)
 */
function isUpdateInProgress() {
    if (typeof window === 'undefined') return false;
    try {
        const flag = sessionStorage.getItem(UPDATE_FLAG_KEY);
        if (!flag) return false;
        const timestamp = parseInt(flag, 10);
        // Le flag est valide pendant UPDATE_FLAG_TTL ms
        return Date.now() - timestamp < UPDATE_FLAG_TTL;
    } catch {
        return false;
    }
}

/**
 * Marque qu'une mise à jour est en cours
 */
function setUpdateInProgress() {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(UPDATE_FLAG_KEY, Date.now().toString());
    } catch {
        // Ignore
    }
}

/**
 * Supprime le flag de mise à jour
 */
function clearUpdateFlag() {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(UPDATE_FLAG_KEY);
    } catch {
        // Ignore
    }
}

/**
 * Composant pour détecter et gérer les mises à jour de la PWA
 * Affiche une bannière "Nouvelle version disponible" avec bouton recharger
 */
export default function PWAUpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [registration, setRegistration] = useState(null);
    const [waitingWorker, setWaitingWorker] = useState(null);

    const [isPageLoaded, setIsPageLoaded] = useState(false);

    useEffect(() => {
        // Attendre que la page soit complètement chargée
        if (document.readyState === 'complete') {
            setIsPageLoaded(true);
        } else {
            const handleLoad = () => setIsPageLoaded(true);
            window.addEventListener('load', handleLoad);
            return () => window.removeEventListener('load', handleLoad);
        }
    }, []);

    useEffect(() => {
        if (!isPageLoaded) return;

        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        // Vérifier si le cache est activé
        const cacheEnabled = (typeof window.__ACTIVE_CACHE !== 'undefined')
            ? !!window.__ACTIVE_CACHE
            : true;

        if (!cacheEnabled) {
            console.log('[PWAUpdateChecker] Cache désactivé, pas d\'enregistrement SW');
            return;
        }

        // Version locale stockée
        const localVersion = window.__APP_VERSION || null;

        // Enregistrer le Service Worker
        navigator.serviceWorker
            .register('/sw.js', {
                updateViaCache: 'none' // Toujours vérifier les mises à jour
            })
            .then((reg) => {
                setRegistration(reg);
                console.log('[PWAUpdateChecker] Service Worker enregistré');

                // Fonction pour vérifier la version serveur et forcer une mise à jour si nécessaire
                const checkVersionUpdate = async () => {
                    try {
                        const response = await fetch('/api/version?t=' + Date.now(), {
                            cache: 'no-store'
                        });
                        if (response.ok) {
                            const data = await response.json();
                            const serverVersion = data.version;

                            // Si la version serveur est différente de la version locale, forcer une mise à jour
                            if (localVersion && serverVersion && localVersion !== serverVersion) {
                                console.log(`[PWAUpdateChecker] Nouvelle version détectée: ${localVersion} → ${serverVersion}`);
                                // Forcer la mise à jour du Service Worker
                                reg.update().catch((err) => {
                                    console.debug('[PWAUpdateChecker] Erreur lors de la mise à jour forcée:', err);
                                });
                            }
                        }
                    } catch (err) {
                        console.debug('[PWAUpdateChecker] Erreur vérification version:', err);
                    }
                };

                // Vérifier périodiquement les mises à jour (toutes les heures)
                const checkForUpdates = () => {
                    reg.update().catch((err) => {
                        console.debug('[PWAUpdateChecker] Erreur vérification mise à jour:', err);
                    });
                };

                // Vérifier immédiatement
                checkForUpdates();
                // Vérifier aussi la version immédiatement
                checkVersionUpdate();

                // Vérifier toutes les heures
                const updateInterval = setInterval(() => {
                    checkForUpdates();
                    checkVersionUpdate();
                }, 60 * 60 * 1000);

                // Fonction pour afficher la notification avec un délai
                // Ne pas afficher si une mise à jour est en cours (on vient de recharger)
                const showNotification = () => {
                    if (isUpdateInProgress()) {
                        console.log('[PWAUpdateChecker] Mise à jour en cours, popup ignorée');
                        clearUpdateFlag();
                        return;
                    }
                    setTimeout(() => {
                        setIsVisible(true);
                    }, 1500);
                };

                // Vérifier si un nouveau Service Worker est en attente
                // Ne pas afficher la popup si on vient de faire une mise à jour
                if (reg.waiting && !isUpdateInProgress()) {
                    setWaitingWorker(reg.waiting);
                    setUpdateAvailable(true);
                    showNotification();
                } else if (reg.waiting && isUpdateInProgress()) {
                    console.log('[PWAUpdateChecker] Waiting worker détecté mais mise à jour en cours, ignoré');
                    clearUpdateFlag();
                }

                // Écouter les mises à jour
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    // Nouveau Service Worker installé et prêt (mise à jour)
                                    // Ne pas afficher si une mise à jour est déjà en cours
                                    if (!isUpdateInProgress()) {
                                        setWaitingWorker(newWorker);
                                        setUpdateAvailable(true);
                                        showNotification();
                                    } else {
                                        console.log('[PWAUpdateChecker] Nouveau SW installé mais mise à jour en cours, ignoré');
                                    }
                                } else {
                                    // Première installation
                                    console.log('[PWAUpdateChecker] Service Worker installé pour la première fois');
                                }
                            }
                        });
                    }
                });

                return () => {
                    clearInterval(updateInterval);
                };
            })
            .catch((error) => {
                console.error('[PWAUpdateChecker] Erreur enregistrement SW:', error);
            });

        // Écouter les changements de contrôleur (mise à jour appliquée)
        // Note: On ne fait plus rien ici car le handleReload gère tout
        const handleControllerChange = () => {
            console.log('[PWAUpdateChecker] Nouveau Service Worker actif (controllerchange)');
            // Le rechargement est géré par handleReload, pas besoin de faire quoi que ce soit ici
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
    }, [isPageLoaded]);

    const handleReload = useCallback(async () => {
        setIsReloading(true);

        // Marquer qu'une mise à jour est en cours pour éviter la popup en boucle
        setUpdateInProgress();

        console.log('%c[PWAUpdateChecker] 🚀 DÉBUT MISE À JOUR 🚀', 'color: blue; font-weight: bold; font-size: 16px');

        try {
            // Étape 1 : Supprimer TOUS les caches
            const success = await nukeAllCaches();
            console.log('[PWAUpdateChecker] Nettoyage terminé, succès:', success);

            // Étape 2 : Attendre un peu que tout soit bien nettoyé
            await new Promise(resolve => setTimeout(resolve, 300));

            // Étape 3 : Vérifier une dernière fois les caches
            if ('caches' in window) {
                const remainingCaches = await caches.keys();
                if (remainingCaches.length > 0) {
                    console.log('[PWAUpdateChecker] ⚠ Caches encore présents, suppression finale:', remainingCaches);
                    for (const name of remainingCaches) {
                        await caches.delete(name);
                    }
                }
            }

            // Étape 4 : Forcer un rechargement complet en ajoutant un paramètre de cache-bust
            // Cela force le navigateur à ignorer son cache HTTP interne
            console.log('%c[PWAUpdateChecker] 🔄 RECHARGEMENT FORCÉ 🔄', 'color: green; font-weight: bold; font-size: 16px');
            
            const currentUrl = new URL(window.location.href);
            // Supprimer les anciens paramètres de cache-bust
            currentUrl.searchParams.delete('_nocache');
            currentUrl.searchParams.delete('testPWA');
            // Ajouter un nouveau paramètre de cache-bust
            currentUrl.searchParams.set('_nocache', Date.now().toString());
            
            // Utiliser location.replace pour ne pas créer d'entrée dans l'historique
            window.location.replace(currentUrl.toString());
        } catch (err) {
            console.error('[PWAUpdateChecker] Erreur lors de la mise à jour:', err);
            // En cas d'erreur, recharger quand même
            window.location.reload();
        }
    }, []);

    const handleDismiss = useCallback(() => {
        setIsVisible(false);
        // Réafficher dans 30 minutes si une mise à jour est toujours disponible
        setTimeout(() => {
            if (updateAvailable) {
                setIsVisible(true);
            }
        }, 30 * 60 * 1000);
    }, [updateAvailable]);

    // Nettoyer l'URL après un rechargement de mise à jour (supprimer _nocache)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.searchParams.has('_nocache')) {
                url.searchParams.delete('_nocache');
                // Remplacer l'URL sans recharger la page
                window.history.replaceState({}, '', url.toString());
                console.log('[PWAUpdateChecker] URL nettoyée (paramètre _nocache supprimé)');
            }
        }
    }, []);

    // Mode debug pour tester l'affichage : ajouter ?testPWA=true dans l'URL
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('testPWA=true')) {
            console.log('[PWAUpdateChecker] Mode test activé');
            setUpdateAvailable(true);
            setTimeout(() => {
                setIsVisible(true);
            }, 1500);
        }
    }, []);

    if (!isVisible || !updateAvailable) return null;

    return (
        <div className="pwa-update-notification">
            <div className="pwa-update-content">
                <div className="pwa-update-icon"><Icon /></div>
                <div className="pwa-update-text">
                    <strong>Nouvelle version disponible</strong>
                    <span>Rechargez pour profiter des dernières améliorations</span>
                </div>
                <div className="pwa-update-actions">
                    <button
                        className="pwa-update-button pwa-update-button-primary"
                        onClick={handleReload}
                        disabled={isReloading}
                    >
                        {isReloading ? 'Rechargement...' : 'Recharger'}
                    </button>
                    <button
                        className="pwa-update-button pwa-update-button-secondary"
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

const Icon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px">
        <radialGradient id="U82P9tORUQOQwN6q6fq4Ja" cx="28.686" cy="21.073" r="17.032"
            gradientUnits="userSpaceOnUse">
            <stop offset=".683" stopColor="#c24717" />
            <stop offset=".756" stopColor="#bb4417" />
            <stop offset=".862" stopColor="#a83b18" />
            <stop offset=".987" stopColor="#892c1a" />
            <stop offset="1" stopColor="#852a1a" />
        </radialGradient>
        <path fill="url(#U82P9tORUQOQwN6q6fq4Ja)"
            d="M32.002,8.271l0.162-0.496c0.33-1.011-0.184-2.12-1.18-2.493	C21.73,1.815,11.12,5.639,6.348,14.597c-3.137,5.89-3.031,12.643-0.305,18.212l5.354-2.71c-1.876-3.885-1.937-8.582,0.246-12.681	c3.363-6.314,10.947-9.173,18.085-7.811C30.717,9.795,31.69,9.228,32.002,8.271z" />
        <radialGradient id="U82P9tORUQOQwN6q6fq4Jb" cx="-243.314" cy="-250.927" r="17.032"
            gradientTransform="rotate(180 -112 -112)" gradientUnits="userSpaceOnUse">
            <stop offset=".683" stopColor="#c24717" />
            <stop offset=".756" stopColor="#bb4417" />
            <stop offset=".862" stopColor="#a83b18" />
            <stop offset=".987" stopColor="#892c1a" />
            <stop offset="1" stopColor="#852a1a" />
        </radialGradient>
        <path fill="url(#U82P9tORUQOQwN6q6fq4Jb)"
            d="M15.998,39.729l-0.162,0.496c-0.33,1.011,0.184,2.12,1.18,2.493	c9.253,3.467,19.864-0.357,24.635-9.315c3.137-5.89,3.031-12.643,0.305-18.212l-5.354,2.71c1.876,3.885,1.937,8.582-0.246,12.681	c-3.363,6.314-10.947,9.173-18.085,7.811C17.283,38.205,16.31,38.772,15.998,39.729z" />
        <linearGradient id="U82P9tORUQOQwN6q6fq4Jc" x1="12.838" x2="34.961" y1="7.678" y2="40.027"
            gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fed100" />
            <stop offset="1" stopColor="#e36001" />
        </linearGradient>
        <path fill="url(#U82P9tORUQOQwN6q6fq4Jc)"
            d="M10,24c0,2.004,0.436,4.006,1.291,5.861l2.48-1.26c0.699-0.355,1.478,0.312,1.235,1.057	l-2.439,7.482c-0.214,0.656-0.919,1.014-1.575,0.8L3.51,35.501c-0.745-0.243-0.824-1.265-0.126-1.62l2.563-1.303	c-3.528-7.427-2.235-16.574,3.911-22.72C13.763,5.953,18.881,4,24,4C24,4,10,10,10,24z M44.49,12.499l-7.482-2.439	c-0.656-0.214-1.361,0.145-1.575,0.8l-2.439,7.482c-0.243,0.745,0.536,1.412,1.235,1.057l2.48-1.26C37.564,19.994,38,21.996,38,24	c0,14-14,20-14,20c5.119,0,10.237-1.952,14.142-5.857c6.146-6.146,7.439-15.293,3.911-22.72l2.563-1.303	C45.315,13.765,45.235,12.742,44.49,12.499z" />
    </svg>
);

