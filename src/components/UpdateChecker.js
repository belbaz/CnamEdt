"use client";
import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import './UpdateChecker.css';
import { downloadAndInstall, initAppUpdater, canRequestPackageInstalls } from '@/utils/appUpdater';

/**
 * Composant pour vérifier les mises à jour de l'APK
 * S'affiche uniquement dans l'app native (Capacitor)
 * Vérifie au démarrage si une nouvelle version est disponible
 * Peut être déclenché manuellement via une ref
 */
const UpdateChecker = forwardRef(({ currentVersion, isNative }, ref) => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [latestVersion, setLatestVersion] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [changelog, setChangelog] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [manualCheck, setManualCheck] = useState(false);
    const [isUpToDateVisible, setIsUpToDateVisible] = useState(false);
    const [isUpToDateClosing, setIsUpToDateClosing] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [installProgress, setInstallProgress] = useState(null);
    const [appUpdaterReady, setAppUpdaterReady] = useState(false);
    const [isErrorVisible, setIsErrorVisible] = useState(false);
    const [isErrorClosing, setIsErrorClosing] = useState(false);
    const [errorTitle, setErrorTitle] = useState('Connexion impossible');
    const [errorMessage, setErrorMessage] = useState("Vérifiez votre connexion internet et réessayez.");
    const [isCheckingPermission, setIsCheckingPermission] = useState(false);
    const appStateListenerRef = useRef(null);

    // Exposer la méthode checkForUpdates via la ref
    useImperativeHandle(ref, () => ({
        checkForUpdates: () => {
            setManualCheck(true);
            checkForUpdates(true);
        }
    }));

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsClosing(false);
        }, 300);
    }, []);

    /**
     * Procède à l'installation de l'APK
     */
    const proceedWithInstallation = useCallback(async () => {
        if (!downloadUrl || !latestVersion) {
            console.error('[UpdateChecker] URL ou version manquante pour l\'installation');
            setIsInstalling(false);
            setInstallProgress(null);
            return;
        }

        setIsInstalling(true);
        setInstallProgress({ status: 'starting', message: 'Préparation...' });

        try {
            console.log('[UpdateChecker] Démarrage de l\'installation automatique...');
            console.log('[UpdateChecker] URL:', downloadUrl);
            console.log('[UpdateChecker] Version:', latestVersion);

            await downloadAndInstall(
                downloadUrl,
                latestVersion
            );
            
            // Mettre à jour l'état de progression manuellement
            setInstallProgress({ 
                status: 'downloading', 
                message: 'Téléchargement en cours...' 
            });

            // Succès - l'installation va démarrer
            setInstallProgress({ 
                status: 'success', 
                message: 'Installation démarrée. Suivez les instructions à l\'écran.' 
            });
            
            // Fermer la popup après un court délai
            setTimeout(() => {
                handleClose();
                setIsInstalling(false);
                setInstallProgress(null);
            }, 2000);

        } catch (error) {
            console.error('[UpdateChecker] Erreur lors de l\'installation:', error);
            setInstallProgress({ 
                status: 'error', 
                message: error.message || 'Erreur lors de l\'installation' 
            });
            
            // Afficher un message d'erreur à l'utilisateur
            setTimeout(() => {
                alert(`Erreur lors de l'installation automatique:\n${error.message}\n\nVoulez-vous télécharger manuellement l'APK ?`);
                // Fallback : téléchargement manuel
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `edt_cnam_v${latestVersion}.apk`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setIsInstalling(false);
                setInstallProgress(null);
            }, 1000);
        }
    }, [downloadUrl, latestVersion, handleClose]);

    /**
     * Demande la permission d'installation et ouvre les paramètres si nécessaire
     */
    const requestInstallPermission = useCallback(() => {
        if (typeof window === 'undefined' || !window.AndroidAppUpdater) {
            alert('Impossible de demander la permission. Veuillez activer l\'installation depuis des sources inconnues dans les paramètres Android.');
            return;
        }

        try {
            // Essayer de demander la permission
            if (typeof window.AndroidAppUpdater.requestInstallPermission === 'function') {
                const granted = window.AndroidAppUpdater.requestInstallPermission();
                if (granted) {
                    // Permission accordée immédiatement
                    proceedWithInstallation();
                    return;
                }
            }

            // Ouvrir les paramètres pour que l'utilisateur active la permission
            if (typeof window.AndroidAppUpdater.openInstallSettings === 'function') {
                setIsCheckingPermission(true);
                window.AndroidAppUpdater.openInstallSettings();
                
                // Afficher un message à l'utilisateur
                alert('Veuillez activer l\'autorisation d\'installer des apps inconnues dans les paramètres Android, puis revenez à l\'application.');
            } else {
                alert('Veuillez activer l\'autorisation d\'installer des apps inconnues dans les paramètres Android pour cette application.');
            }
        } catch (error) {
            console.error('[UpdateChecker] Erreur lors de la demande de permission:', error);
            alert('Erreur lors de la demande de permission. Veuillez activer l\'installation depuis des sources inconnues dans les paramètres Android.');
        }
    }, [proceedWithInstallation]);

    /**
     * Vérifie la permission d'installation et procède si accordée
     */
    const checkInstallPermissionAndProceed = useCallback(async () => {
        if (!downloadUrl || !latestVersion) {
            console.error('[UpdateChecker] URL ou version manquante');
            setIsCheckingPermission(false);
            return;
        }

        try {
            const { canRequest } = await canRequestPackageInstalls();
            console.log('[UpdateChecker] Permission d\'installation vérifiée:', canRequest);

            if (canRequest) {
                // Permission accordée, procéder à l'installation
                setIsCheckingPermission(false);
                await proceedWithInstallation();
            } else {
                // Permission non accordée, demander à l'utilisateur
                setIsCheckingPermission(false);
                requestInstallPermission();
            }
        } catch (error) {
            console.error('[UpdateChecker] Erreur lors de la vérification de la permission:', error);
            setIsCheckingPermission(false);
            // En cas d'erreur, essayer quand même de procéder
            await proceedWithInstallation();
        }
    }, [downloadUrl, latestVersion, proceedWithInstallation, requestInstallPermission]);

    useEffect(() => {
        // Initialiser AppUpdater si on est en mode natif
        if (isNative) {
            initAppUpdater().then((ready) => {
                setAppUpdaterReady(ready);
                console.log('[UpdateChecker] AppUpdater initialisé:', ready);
            });

            // Écouter les changements d'état de l'app pour vérifier la permission après retour des paramètres
            if (typeof window !== 'undefined') {
                import('@capacitor/app').then(({ App }) => {
                    appStateListenerRef.current = App.addListener('appStateChange', async ({ isActive }) => {
                        if (isActive && isCheckingPermission) {
                            // Vérifier à nouveau la permission après un court délai
                            setTimeout(async () => {
                                await checkInstallPermissionAndProceed();
                            }, 500);
                        }
                    });
                }).catch(() => {
                    // Plugin non disponible, ignorer
                });

                // Écouter aussi les événements de visibilité
                const handleVisibilityChange = async () => {
                    if (document.visibilityState === 'visible' && isCheckingPermission) {
                        setTimeout(async () => {
                            await checkInstallPermissionAndProceed();
                        }, 500);
                    }
                };
                document.addEventListener('visibilitychange', handleVisibilityChange);

                return () => {
                    if (appStateListenerRef.current) {
                        appStateListenerRef.current.remove();
                    }
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                };
            }
        }
    }, [isNative, isCheckingPermission, checkInstallPermissionAndProceed]);

    useEffect(() => {
        // Ne vérifier que dans l'app native
        if (!isNative) return;

        console.log('[UpdateChecker] Vérification automatique au démarrage...');
        console.log('[UpdateChecker] Version actuelle:', currentVersion);

        checkForUpdates(false);
    }, [isNative, currentVersion]);

    const checkForUpdates = async (isManual = false) => {
        setIsChecking(true);
        
        try {
            // Déterminer le canal désiré (test/prod) : bascule locale a priorité sur le canal build
            const builtIsTest = (process.env.NEXT_PUBLIC_APP_CHANNEL || 'prod') === 'test';
            const toggleTest = typeof window !== 'undefined' && localStorage.getItem('updateTestMode') === 'true';
            const desiredIsTest = toggleTest || builtIsTest;
            
            // Déterminer la bonne base URL pour l'API version
            // - En app native (Capacitor) ou protocole file:, l'origine locale n'a pas d'API → utiliser le site distant
            // - En web, utiliser l'origine courante
            let baseUrl;
            const defaultRemote = process.env.NEXT_PUBLIC_SITE_URL || 'https://edt-eicnam.vercel.app';
            if (typeof window !== 'undefined') {
                const isFile = window.location.protocol === 'file:';
                baseUrl = (isNative || isFile) ? defaultRemote : window.location.origin;
            } else {
                baseUrl = defaultRemote;
            }
            // Demander explicitement le canal désiré au serveur
            const versionUrl = `${baseUrl}/api/version?test=${desiredIsTest ? 'true' : 'false'}`;
            
            console.log('[UpdateChecker] Vérification des mises à jour...');
            console.log('[UpdateChecker] URL API:', versionUrl);
            console.log('[UpdateChecker] Version actuelle:', currentVersion);
            
            const response = await fetch(versionUrl, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            console.log('[UpdateChecker] Réponse HTTP:', response.status, response.statusText);

            // Si le serveur renvoie du HTML (ex: page statique), ce n'est pas une API → fallback vers site distant
            const contentType = response.headers.get('content-type') || '';
            if (!response.ok || (!contentType.includes('application/json') && !contentType.includes('json'))) {
                const bodyText = await response.text();
                console.warn('[UpdateChecker] Réponse non JSON ou erreur, tentative fallback. type=', contentType);
                // Fallback une seule fois si on n'est pas déjà sur le site distant
                if (!baseUrl.startsWith('http') || baseUrl.includes('localhost')) {
                    const fallbackUrl = `${defaultRemote}/api/version?test=${desiredIsTest ? 'true' : 'false'}`;
                    console.log('[UpdateChecker] Fallback vers:', fallbackUrl);
                    const resp2 = await fetch(fallbackUrl, { method: 'GET', cache: 'no-store' });
                    if (!resp2.ok) {
                        const t2 = await resp2.text();
                        throw new Error(`API version indisponible. Code ${resp2.status}. Détails: ${t2.slice(0,120)}`);
                    }
                    const data2 = await resp2.json();
                    console.log('[UpdateChecker] Réponse API (fallback):', data2);
                    if (!data2.version) throw new Error('Réponse invalide (fallback)');
                    setLatestVersion(data2.version);
                    setDownloadUrl(data2.url);
                    setChangelog(data2.changelog);
                    const needsUpdate2 = compareVersions(currentVersion, data2.version);
                    setUpdateAvailable(needsUpdate2);
                    setIsVisible(needsUpdate2);
                    return;
                }
                // Si déjà distant, lever une erreur explicite
                throw new Error(`Réponse non JSON depuis ${versionUrl}: ${bodyText.slice(0,120)}`);
            }

            const data = await response.json();
            console.log('[UpdateChecker] Réponse API:', data);

            if (!data.version) {
                console.error('[UpdateChecker] Réponse invalide - version manquante');
                if (isManual) {
                    setErrorTitle('Information indisponible');
                    setErrorMessage("Le serveur n'a renvoyé aucune version. Réessayez plus tard.");
                    setIsErrorVisible(true);
                }
                return;
            }

            setLatestVersion(data.version);
            setDownloadUrl(data.url);
            setChangelog(data.changelog);
            
            // Ne pas persister de flag global de version test côté mobile

            // Comparer uniquement les versions (ne pas forcer sur changement de canal si versions identiques)
            const needsUpdate = compareVersions(currentVersion, data.version);
            console.log('[UpdateChecker] Mise à jour nécessaire:', needsUpdate);
            console.log('[UpdateChecker] Version locale:', currentVersion, '→ Version distante:', data.version);

            if (needsUpdate) {
                setUpdateAvailable(true);
                setIsVisible(true);
            } else if (isManual) {
                // Si vérification manuelle et pas de mise à jour, afficher une belle modale
                setIsUpToDateVisible(true);
            }
        } catch (error) {
            console.error('[UpdateChecker] Erreur lors de la vérification:', error);
            console.error('[UpdateChecker] Type d\'erreur:', error.name);
            console.error('[UpdateChecker] Message:', error.message);
            if (isManual) {
                const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
                setErrorTitle(offline ? 'Connexion impossible' : 'Vérification impossible');
                setErrorMessage(offline
                    ? "Vous semblez hors ligne. Vérifiez votre connexion internet et réessayez."
                    : `Une erreur est survenue: ${error.message}`
                );
                setIsErrorVisible(true);
            }
        } finally {
            setIsChecking(false);
            setManualCheck(false);
        }
    };

    // Compare deux versions (gère X.X et X.X.X)
    // Retourne true si remoteVersion > localVersion
    const compareVersions = (local, remote) => {
        // Normaliser les valeurs nulles/indéfinies
        const normalize = (v) => {
            if (typeof v !== 'string') return '0.0.0';
            const t = v.trim();
            return t.length > 0 ? t : '0.0.0';
        };

        const localSafe = normalize(local);
        const remoteSafe = normalize(remote);

        const localParts = localSafe.split('.').map(Number);
        const remoteParts = remoteSafe.split('.').map(Number);
        
        // Normaliser à 3 parties (ajouter 0 si manquant)
        while (localParts.length < 3) localParts.push(0);
        while (remoteParts.length < 3) remoteParts.push(0);

        for (let i = 0; i < 3; i++) {
            if (remoteParts[i] > localParts[i]) return true;
            if (remoteParts[i] < localParts[i]) return false;
        }

        return false; // Versions identiques
    };


    const handleUpdate = async () => {
        if (!downloadUrl || !latestVersion) {
            console.error('[UpdateChecker] URL ou version manquante');
            return;
        }

        if (!isNative) {
            // Fallback pour le web : téléchargement classique
            // Vérifier si c'est une version test
            const isTestVersion = downloadUrl.includes('test');
            const fileName = isTestVersion ? `edt_cnam_v_test_${latestVersion}.apk` : `edt_cnam_v${latestVersion}.apk`;
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        // Vérifier la permission AVANT de lancer l'installation
        await checkInstallPermissionAndProceed();
    };

    const handleLater = () => {
        handleClose();
    };

    const handleCloseUpToDate = () => {
        setIsUpToDateClosing(true);
        setTimeout(() => {
            setIsUpToDateVisible(false);
            setIsUpToDateClosing(false);
        }, 300);
    };

    const handleCloseError = () => {
        setIsErrorClosing(true);
        setTimeout(() => {
            setIsErrorVisible(false);
            setIsErrorClosing(false);
        }, 300);
    };

    // Modale "à jour"
    if (isUpToDateVisible) {
        return (
            <div className={`update-popup-overlay ${isUpToDateClosing ? 'closing' : ''}`} onClick={handleCloseUpToDate}>
                <div className={`update-popup up-to-date-popup ${isUpToDateClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                    <div className="update-popup-icon up-to-date-icon">
                        {/* Icône discrète */}
                    </div>
                    
                    <h2 className="update-popup-title up-to-date-title">
                        Vous êtes à jour
                    </h2>
                    
                    <div className="up-to-date-version-info">
                        <div className="up-to-date-version-badge">
                            <span className="up-to-date-version-label">Version actuelle</span>
                            <span className="up-to-date-version-number">{currentVersion}</span>
                        </div>
                    </div>

                    <p className="up-to-date-message">
                        Vous utilisez déjà la dernière version de l'application.
                    </p>
                    
                    <div className="update-popup-buttons">
                        <button 
                            className="update-popup-button update-popup-button-primary"
                            onClick={handleCloseUpToDate}
                        >
                            Compris
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Modale erreur (offline / réponse vide)
    if (isErrorVisible) {
        return (
            <div className={`update-popup-overlay ${isErrorClosing ? 'closing' : ''}`} onClick={handleCloseError}>
                <div className={`update-popup update-error-popup ${isErrorClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                    <div className="update-error-illustration" aria-hidden="true">
                        {/* Wifi/coupure inline SVG pour rester léger et compatible thème */}
                        <svg viewBox="0 0 128 128" width="96" height="96" role="img">
                            <defs>
                                <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                                    <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.9" />
                                    <stop offset="100%" stopColor="#667eea" stopOpacity="0.9" />
                                </linearGradient>
                            </defs>
                            <g fill="none" stroke="url(#g1)" strokeWidth="6" strokeLinecap="round">
                                <path d="M16 42c28-24 68-24 96 0" opacity="0.35"/>
                                <path d="M28 58c22-18 50-18 72 0" opacity="0.55"/>
                                <path d="M44 74c14-10 26-10 40 0" opacity="0.8"/>
                            </g>
                            <g fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round">
                                <path d="M92 20l16 16"/>
                                <path d="M108 20L92 36"/>
                            </g>
                            <circle cx="64" cy="96" r="8" fill="#ef4444" />
                        </svg>
                    </div>
                    <h2 className="update-popup-title update-error-title">{errorTitle}</h2>
                    <p className="update-error-message">{errorMessage}</p>
                    <div className="update-popup-buttons">
                        <button className="update-popup-button update-popup-button-primary" onClick={handleCloseError}>
                            OK
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!isVisible || !updateAvailable) return null;

    return (
        <div className={`update-popup-overlay ${isClosing ? 'closing' : ''}`}>
            <div className={`update-popup ${isClosing ? 'closing' : ''}`}>
                <div className="update-popup-icon">
                    🎉
                </div>
                
                <h2 className="update-popup-title">
                    Mise à jour disponible
                </h2>
                
                <div className="update-popup-versions">
                    <div className="update-version update-version-current">
                        <span className="update-version-label">Version actuelle</span>
                        <span className="update-version-number">{currentVersion}</span>
                    </div>
                    <div className="update-version-arrow-container">
                        <div className="update-version-arrow">→</div>
                    </div>
                    <div className="update-version update-version-new">
                        <span className="update-version-label">Nouvelle version</span>
                        <span className="update-version-number">{latestVersion}</span>
                    </div>
                </div>

                {/*{changelog && (*/}
                {/*    <p className="update-popup-changelog">*/}
                {/*        📝 {changelog}*/}
                {/*    </p>*/}
                {/*)}*/}
                
                {/* Affichage de la progression si installation en cours */}
                {isInstalling && installProgress && (
                    <div className="update-install-progress">
                        <div className="update-progress-message">
                            {installProgress.status === 'downloading' && installProgress.progress !== undefined ? (
                                <>
                                    <div className="update-progress-bar-container">
                                        <div 
                                            className="update-progress-bar"
                                            style={{ width: `${installProgress.progress}%` }}
                                        />
                                    </div>
                                    <p className="update-progress-text">
                                        {installProgress.message || `Téléchargement: ${installProgress.progress}%`}
                                    </p>
                                </>
                            ) : (
                                <p className="update-progress-text">
                                    {installProgress.message || 'En cours...'}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="update-popup-buttons">
                    <button 
                        className="update-popup-button update-popup-button-primary"
                        onClick={handleUpdate}
                        disabled={isInstalling}
                    >
                        {isInstalling ? 'Installation...' : 'Mettre à jour'}
                    </button>
                    
                    {!isInstalling && (
                        <button 
                            className="update-popup-button update-popup-button-secondary"
                            onClick={handleLater}
                        >
                            Plus tard
                        </button>
                    )}
                </div>

                {/*<p className="update-popup-info">*/}
                {/*    <small>*/}
                {/*        {isNative */}
                {/*            ? '💡 La mise à jour sera téléchargée et installée automatiquement'*/}
                {/*            : '💡 La mise à jour s\'installera automatiquement après le téléchargement'}*/}
                {/*    </small>*/}
                {/*</p>*/}
            </div>
        </div>
    );
});

UpdateChecker.displayName = 'UpdateChecker';

export default UpdateChecker;

