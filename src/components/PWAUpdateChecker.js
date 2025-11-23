"use client";
import { useState, useEffect, useCallback } from 'react';
import './PWAUpdateChecker.css';

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

    useEffect(() => {
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

        // Enregistrer le Service Worker
        navigator.serviceWorker
            .register('/sw.js', { 
                updateViaCache: 'none' // Toujours vérifier les mises à jour
            })
            .then((reg) => {
                setRegistration(reg);
                console.log('[PWAUpdateChecker] Service Worker enregistré');

                // Vérifier périodiquement les mises à jour (toutes les heures)
                const checkForUpdates = () => {
                    reg.update().catch((err) => {
                        console.debug('[PWAUpdateChecker] Erreur vérification mise à jour:', err);
                    });
                };

                // Vérifier immédiatement
                checkForUpdates();

                // Vérifier toutes les heures
                const updateInterval = setInterval(checkForUpdates, 60 * 60 * 1000);

                // Vérifier si un nouveau Service Worker est en attente
                if (reg.waiting) {
                    setWaitingWorker(reg.waiting);
                    setUpdateAvailable(true);
                    setIsVisible(true);
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
                                    setIsVisible(true);
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
    }, []);

    const handleReload = useCallback(async () => {
        if (!waitingWorker) {
            // Pas de worker en attente, recharger normalement
            setIsReloading(true);
            setTimeout(() => {
                window.location.reload();
            }, 500);
            return;
        }

        setIsReloading(true);

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

    if (!isVisible || !updateAvailable) return null;

    return (
        <div className="pwa-update-notification">
            <div className="pwa-update-content">
                <div className="pwa-update-icon">🔄</div>
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

