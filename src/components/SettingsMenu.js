"use client";
import {useState, useEffect, useRef} from "react";
import "./SettingsMenu.css";
import EasterEgg from "./EasterEgg";
import Toast from "./Toast";

export default function SettingsMenu({
                                         onOpenChange,
                                         compactMode,
                                         testMode,
                                         onToggleTestMode,
                                         isMobile = false,
                                         isNative = false,
                                         currentVersion = null,
                                         onCheckUpdates = null,
                                         showTimeLabels = true,
                                         onToggleTimeLabels = null
                                     }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showEasterEgg, setShowEasterEgg] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [version, setVersion] = useState(currentVersion || null);
    const [isTestMode, setIsTestMode] = useState(false);
    const copyrightClickCount = useRef(0);
    const copyrightClickTimeout = useRef(null);
    // Afficher le mode test uniquement si NEXT_PUBLIC_ENV=DEV est défini explicitement
    const isDev = (process.env.NEXT_PUBLIC_ENV || '').toUpperCase() === 'DEV';
    const showUpdateButton = isDev ? true : (isMobile || isNative);

    // Récupérer la version depuis l'API ou utiliser currentVersion
    useEffect(() => {
        if (currentVersion) {
            setVersion(currentVersion);
        } else if (!isNative && typeof window !== 'undefined') {
            // Pour le web, récupérer depuis l'API
            // Vérifier si le mode test est activé
            const isTestChannel = (process.env.NEXT_PUBLIC_APP_CHANNEL || 'prod') === 'test';
            const toggleTest = localStorage.getItem('updateTestMode') === 'true';
            const testMode = isTestChannel || toggleTest;
            const apiUrl = `/api/version${testMode ? '?test=true' : ''}`;

            fetch(apiUrl)
                .then(res => res.json())
                .then(data => {
                    if (data.version) {
                        setVersion(data.version);
                    }
                })
                .catch(() => {
                    // En cas d'erreur, garder null
                });
        }
    }, [isNative, currentVersion]);

    // Vérifier si le mode test est activé
    useEffect(() => {
        if (typeof window === 'undefined') {
            setIsTestMode(false);
            return;
        }

        const checkTestMode = () => {
            const isTestChannel = (process.env.NEXT_PUBLIC_APP_CHANNEL || 'prod') === 'test';
            const updateTestMode = localStorage.getItem('updateTestMode') === 'true';
            setIsTestMode(isTestChannel || updateTestMode);
        };

        checkTestMode();

        // Écouter les changements de localStorage (pour détecter l'activation/désactivation)
        const handleStorageChange = (e) => {
            if (e.key === 'updateTestMode') {
                checkTestMode();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Vérifier aussi périodiquement (car localStorage peut changer dans le même onglet)
        const interval = setInterval(checkTestMode, 500);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [isNative, currentVersion]);

    useEffect(() => {
        if (typeof onOpenChange === 'function') {
            onOpenChange(isOpen);
        }
    }, [isOpen, onOpenChange]);

    // Fermer avec la touche Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Gérer les clics sur le bouton Copyright
    const handleCopyrightClick = async () => {
        copyrightClickCount.current += 1;

        // Réinitialiser le compteur après 3 secondes d'inactivité
        if (copyrightClickTimeout.current) {
            clearTimeout(copyrightClickTimeout.current);
        }
        copyrightClickTimeout.current = setTimeout(() => {
            copyrightClickCount.current = 0;
        }, 3000);

        // Si 5 clics, déclencher l'easter egg et basculer le mode test
        if (copyrightClickCount.current >= 5) {
            copyrightClickCount.current = 0;

            // Activer/désactiver le mode test
            const currentTestMode = localStorage.getItem('updateTestMode') === 'true';
            const newTestMode = !currentTestMode;
            localStorage.setItem('updateTestMode', newTestMode.toString());

            // Afficher les confettis
            setShowEasterEgg(true);

            // Afficher un toast avec le message
            setToastMessage(newTestMode ? 'Mode test activé' : 'Mode test désactivé');
            setShowToast(true);

            // Recharger la version si on est sur web (pour afficher la bonne version test/prod)
            if (!isNative && typeof window !== 'undefined') {
                const apiUrl = `/api/version${newTestMode ? '?test=true' : ''}`;
                fetch(apiUrl)
                    .then(res => res.json())
                    .then(data => {
                        if (data.version) {
                            setVersion(data.version);
                        }
                    })
                    .catch(() => {
                        // En cas d'erreur, ignorer
                    });
            }

            // Afficher une notification Android si on est sur l'app native (optionnel)
            // Utiliser une fonction asynchrone séparée pour éviter l'import au build time
            if (isNative && typeof window !== 'undefined') {
                // Délai pour éviter les problèmes de build
                setTimeout(async () => {
                    try {
                        // Essayer d'utiliser LocalNotifications (nécessite @capacitor/local-notifications)
                        // Utiliser Function() pour éviter l'analyse statique de Next.js
                        const dynamicImport = new Function('moduleName', 'return import(moduleName)');
                        const moduleName = '@' + 'capacitor/' + 'local-notifications';
                        const module = await dynamicImport(moduleName);
                        const {LocalNotifications} = module;

                        // Vérifier les permissions
                        const permResult = await LocalNotifications.checkPermissions();
                        if (permResult.display === 'granted') {
                            await LocalNotifications.schedule({
                                notifications: [
                                    {
                                        title: '🎉 Easter Egg !',
                                        body: 'Merci d\'avoir découvert ce secret ! 🎊',
                                        id: Date.now()
                                    }
                                ]
                            });
                        } else {
                            // Demander les permissions si elles ne sont pas accordées
                            await LocalNotifications.requestPermissions();
                            const newPermResult = await LocalNotifications.checkPermissions();
                            if (newPermResult.display === 'granted') {
                                await LocalNotifications.schedule({
                                    notifications: [
                                        {
                                            title: '🎉 Easter Egg !',
                                            body: 'Merci d\'avoir découvert ce secret ! 🎊',
                                            id: Date.now()
                                        }
                                    ]
                                });
                            }
                        }
                    } catch (localNotifError) {
                        // Si LocalNotifications n'est pas disponible, on continue (le toast est déjà affiché)
                        // Erreur silencieuse car le package est optionnel
                    }
                }, 100);
            }
        }
    };

    const handleCloseEasterEgg = () => {
        setShowEasterEgg(false);
    };

    return (
        <>
            <button
                className="settings-button"
                onClick={() => setIsOpen(!isOpen)}
                title="Paramètres"
            >
                <img src="/settings.svg" alt="Paramètres" width="22" height="22" aria-hidden="true"/>
            </button>

            {isOpen && (
                <>
                    <div className="settings-overlay" onClick={() => setIsOpen(false)}/>
                    <div className="settings-menu">
                        <div className="settings-header">
                            <h3>Paramètres</h3>
                            <button className="settings-close" onClick={() => setIsOpen(false)}>✕</button>
                        </div>

                        <div className="settings-content">
                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={showTimeLabels}
                                        onChange={(e) => onToggleTimeLabels && onToggleTimeLabels(e.target.checked)}
                                    />
                                    <span>Afficher les heures</span>
                                </label>
                            </div>

                            {isDev && (
                                <div className="setting-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={testMode}
                                            onChange={(e) => onToggleTestMode(e.target.checked)}
                                        />
                                        <span>Mode Test (Cours de test)</span>
                                    </label>
                                </div>
                            )}

                            {showUpdateButton && (
                                <div className="setting-item setting-button-item">
                                    <button
                                        className="settings-action check-updates-button"
                                        onClick={() => {
                                            if (onCheckUpdates) {
                                                onCheckUpdates();
                                                setIsOpen(false);
                                            }
                                        }}
                                    >
                                        <span className="button-icon">🔄</span>
                                        <div className="button-content">
                                            <span className="button-label">Update</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            <div className="setting-item setting-button-item">
                                <a 
                                    href={"https://belbaz.vercel.app/contact"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="settings-action contact-button"
                                >
                                    <span className="button-icon">✉️</span>
                                    <span className="button-label">Contact</span>
                                </a>
                            </div>

                            <div className="setting-item copyright-item">
                                {isTestMode && (
                                    <div className="copyright-line">
                                        <span className="copyright-text test-mode-badge">Version test</span>
                                    </div>
                                )}
                                <div className="copyright-line">
                                    <span
                                        className="copyright-text"
                                        onClick={handleCopyrightClick}
                                    >
                                        © {new Date().getFullYear()} EDT CNAM
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <EasterEgg isActive={showEasterEgg} onClose={handleCloseEasterEgg}/>
            <Toast
                message={toastMessage}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
        </>
    );
}
