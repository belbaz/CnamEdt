"use client";
import { useState, useEffect, useCallback } from 'react';
import './PWAUpdateChecker.css';

/**
 * Nettoie les caches HTTP côté client pour forcer une reconstruction propre.
 * On ne touche pas à localStorage / sessionStorage pour éviter de casser
 * les préférences utilisateur ou la session.
 */
async function clearAppCaches() {
    if (typeof window === 'undefined' || !('caches' in window)) {
        return;
    }

    try {
        const keys = await caches.keys();
        await Promise.all(
            keys.map((key) => {
                console.log('[PWAUpdateChecker] Suppression cache client:', key);
                return caches.delete(key);
            })
        );
    } catch (err) {
        console.warn('[PWAUpdateChecker] Erreur suppression caches client:', err);
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
                const showNotification = () => {
                    setTimeout(() => {
                        setIsVisible(true);
                    }, 1500);
                };

                // Vérifier si un nouveau Service Worker est en attente
                if (reg.waiting) {
                    setWaitingWorker(reg.waiting);
                    setUpdateAvailable(true);
                    showNotification();
                }

                // Écouter les mises à jour
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    // Nouveau Service Worker installé et prêt (mise à jour)
                                    setWaitingWorker(newWorker);
                                    setUpdateAvailable(true);
                                    showNotification();
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
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[PWAUpdateChecker] Nouveau Service Worker actif - rechargement');
            window.location.reload();
        });
    }, [isPageLoaded]);

    const handleReload = useCallback(async () => {
        setIsReloading(true);

        // Supprimer le cache HTTP du client avant de recharger,
        // pour s'assurer qu'on repart sur une base propre.
        await clearAppCaches();

        if (!waitingWorker) {
            // Pas de worker en attente, recharger normalement
            setTimeout(() => {
                window.location.reload();
            }, 500);
            return;
        }

        // Envoyer un message au Service Worker pour qu'il prenne le contrôle
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });

        // Attendre un peu puis recharger
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }, [waitingWorker]);

    const handleDismiss = useCallback(() => {
        setIsVisible(false);
        // Réafficher dans 30 minutes si une mise à jour est toujours disponible
        setTimeout(() => {
            if (updateAvailable) {
                setIsVisible(true);
            }
        }, 30 * 60 * 1000);
    }, [updateAvailable]);

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

