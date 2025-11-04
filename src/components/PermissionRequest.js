"use client";
import { useState, useEffect, useRef } from 'react';
import './PermissionRequest.css';

/**
 * Composant pour demander les permissions essentielles au démarrage de l'application
 * - Notifications
 * - Installation de sources inconnues (pour les mises à jour)
 */
export default function PermissionRequest({ isNative = false }) {
    const [showDialog, setShowDialog] = useState(false);
    const [permissions, setPermissions] = useState({
        notifications: { granted: false, requested: false },
        installPackages: { granted: false, requested: false }
    });
    const appListenerRef = useRef(null);

    useEffect(() => {
        if (!isNative || typeof window === 'undefined') return;

        // Vérifier les permissions au démarrage
        checkPermissions();

        // Écouter quand l'app revient au premier plan (après avoir visité les paramètres)
        const handleAppStateChange = () => {
            // Vérifier à nouveau les permissions après un court délai
            setTimeout(() => {
                checkPermissions();
            }, 500);
        };

        // Écouter les événements de visibilité et focus
        document.addEventListener('visibilitychange', handleAppStateChange);
        window.addEventListener('focus', handleAppStateChange);

        // Si Capacitor App est disponible, écouter les événements d'état de l'app
        if (typeof window !== 'undefined') {
            import('@capacitor/app').then(({ App }) => {
                appListenerRef.current = App.addListener('appStateChange', ({ isActive }) => {
                    if (isActive) {
                        handleAppStateChange();
                    }
                });
            }).catch(() => {
                // Plugin non disponible, ignorer
            });
        }

        return () => {
            document.removeEventListener('visibilitychange', handleAppStateChange);
            window.removeEventListener('focus', handleAppStateChange);
            if (appListenerRef.current) {
                appListenerRef.current.remove();
                appListenerRef.current = null;
            }
        };
    }, [isNative]);

    const checkPermissions = async () => {
        try {
            // Vérifier les notifications
            let notificationsGranted = false;
            try {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                const permResult = await LocalNotifications.checkPermissions();
                notificationsGranted = permResult.display === 'granted';
            } catch (e) {
                console.log('[PermissionRequest] Erreur lors de la vérification des notifications:', e);
            }

            // Vérifier la permission d'installation
            let installPackagesGranted = false;
            if (window.AndroidAppUpdater && typeof window.AndroidAppUpdater.canRequestPackageInstalls === 'function') {
                installPackagesGranted = window.AndroidAppUpdater.canRequestPackageInstalls();
            }

            const allGranted = notificationsGranted && installPackagesGranted;
            const hasRequestedBefore = localStorage.getItem('permissions_requested') === 'true';

            // Afficher le dialogue si les permissions ne sont pas accordées
            if (!allGranted && !hasRequestedBefore) {
                setShowDialog(true);
            }

            setPermissions({
                notifications: { granted: notificationsGranted, requested: false },
                installPackages: { granted: installPackagesGranted, requested: false }
            });
        } catch (error) {
            console.error('[PermissionRequest] Erreur lors de la vérification des permissions:', error);
        }
    };

    const requestNotifications = async () => {
        try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            const permResult = await LocalNotifications.requestPermissions();
            
            setPermissions(prev => ({
                ...prev,
                notifications: {
                    granted: permResult.display === 'granted',
                    requested: true
                }
            }));

            return permResult.display === 'granted';
        } catch (error) {
            console.error('[PermissionRequest] Erreur lors de la demande de permission notifications:', error);
            return false;
        }
    };

    const requestInstallPackages = async () => {
        try {
            if (window.AndroidAppUpdater && typeof window.AndroidAppUpdater.requestInstallPermission === 'function') {
                // Cette méthode ouvre les paramètres et retourne immédiatement
                const granted = window.AndroidAppUpdater.requestInstallPermission();
                
                setPermissions(prev => ({
                    ...prev,
                    installPackages: {
                        granted: granted,
                        requested: true
                    }
                }));

                // Si pas accordée, ouvrir les paramètres
                if (!granted && window.AndroidAppUpdater.openInstallSettings) {
                    window.AndroidAppUpdater.openInstallSettings();
                }

                return granted;
            } else {
                // Fallback: rediriger vers les paramètres
                if (window.AndroidAppUpdater && typeof window.AndroidAppUpdater.openInstallSettings === 'function') {
                    window.AndroidAppUpdater.openInstallSettings();
                }
                return false;
            }
        } catch (error) {
            console.error('[PermissionRequest] Erreur lors de la demande de permission installation:', error);
            return false;
        }
    };

    const handleRequestAll = async () => {
        // Demander les notifications
        if (!permissions.notifications.granted) {
            await requestNotifications();
        }

        // Demander la permission d'installation
        if (!permissions.installPackages.granted) {
            await requestInstallPackages();
        }

        // Marquer comme demandé
        localStorage.setItem('permissions_requested', 'true');

        // Vérifier à nouveau après un court délai
        setTimeout(() => {
            checkPermissions();
            // Fermer le dialogue après un court délai
            setTimeout(() => {
                setShowDialog(false);
            }, 1000);
        }, 500);
    };

    const handleSkip = () => {
        localStorage.setItem('permissions_requested', 'true');
        setShowDialog(false);
    };

    if (!showDialog) return null;

    return (
        <div className="permission-request-overlay">
            <div className="permission-request-dialog">
                <div className="permission-request-header">
                    <h2>📱 Autorisations nécessaires</h2>
                </div>
                
                <div className="permission-request-content">
                    <p>Cette application a besoin de certaines autorisations pour fonctionner correctement :</p>
                    
                    <div className="permission-item">
                        <div className="permission-icon">🔔</div>
                        <div className="permission-info">
                            <h3>Notifications</h3>
                            <p>Pour vous informer des mises à jour et des événements importants</p>
                            {permissions.notifications.granted && (
                                <span className="permission-status granted">✓ Accordée</span>
                            )}
                            {!permissions.notifications.granted && permissions.notifications.requested && (
                                <span className="permission-status denied">✗ Refusée</span>
                            )}
                        </div>
                    </div>

                    <div className="permission-item">
                        <div className="permission-icon">📦</div>
                        <div className="permission-info">
                            <h3>Installation depuis sources inconnues</h3>
                            <p>Pour permettre les mises à jour automatiques de l'application</p>
                            {permissions.installPackages.granted && (
                                <span className="permission-status granted">✓ Accordée</span>
                            )}
                            {!permissions.installPackages.granted && permissions.installPackages.requested && (
                                <span className="permission-status denied">✗ Refusée</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="permission-request-actions">
                    <button 
                        className="permission-btn primary" 
                        onClick={handleRequestAll}
                    >
                        Autoriser
                    </button>
                    <button 
                        className="permission-btn secondary" 
                        onClick={handleSkip}
                    >
                        Plus tard
                    </button>
                </div>
            </div>
        </div>
    );
}

