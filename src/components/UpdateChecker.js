"use client";
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './UpdateChecker.css';
import { downloadAndInstall, initAppUpdater } from '@/utils/appUpdater';

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

    // Exposer la méthode checkForUpdates via la ref
    useImperativeHandle(ref, () => ({
        checkForUpdates: () => {
            setManualCheck(true);
            checkForUpdates(true);
        }
    }));

    useEffect(() => {
        // Initialiser AppUpdater si on est en mode natif
        if (isNative) {
            initAppUpdater().then((ready) => {
                setAppUpdaterReady(ready);
                console.log('[UpdateChecker] AppUpdater initialisé:', ready);
            });
        }
    }, [isNative]);

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
            // Vérifier si le mode test est activé
            const testMode = typeof window !== 'undefined' && localStorage.getItem('updateTestMode') === 'true';
            
            // Appeler l'API du site web pour obtenir la dernière version
            const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://edt-eicnam.vercel.app';
            const versionUrl = `${apiUrl}/api/version${testMode ? '?test=true' : ''}`;
            
            console.log('[UpdateChecker] Vérification des mises à jour...');
            console.log('[UpdateChecker] URL API:', versionUrl);
            console.log('[UpdateChecker] Version actuelle:', currentVersion);
            console.log('[UpdateChecker] Mode test:', testMode);
            
            const response = await fetch(versionUrl, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            console.log('[UpdateChecker] Réponse HTTP:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[UpdateChecker] Erreur API:', response.status, errorText);
                if (isManual) {
                    alert(`Erreur lors de la vérification des mises à jour.\nCode: ${response.status}\nVeuillez réessayer plus tard.`);
                }
                return;
            }

            const data = await response.json();
            console.log('[UpdateChecker] Réponse API:', data);

            if (!data.version) {
                console.error('[UpdateChecker] Réponse invalide - version manquante');
                if (isManual) {
                    alert('Erreur: réponse invalide du serveur.');
                }
                return;
            }

            setLatestVersion(data.version);
            setDownloadUrl(data.url);
            setChangelog(data.changelog);
            
            // Si c'est une version test, enregistrer dans localStorage
            if (data.isTest && typeof window !== 'undefined') {
                localStorage.setItem('isTestVersion', 'true');
            }

            // Comparer les versions
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
                alert(`Erreur lors de la vérification des mises à jour.\nDétails: ${error.message}\nVeuillez vérifier votre connexion internet.`);
            }
        } finally {
            setIsChecking(false);
            setManualCheck(false);
        }
    };

    // Compare deux versions (gère X.X et X.X.X)
    // Retourne true si remoteVersion > localVersion
    const compareVersions = (local, remote) => {
        const localParts = local.split('.').map(Number);
        const remoteParts = remote.split('.').map(Number);
        
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

        // En mode natif, utiliser le plugin d'installation automatique
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
    };

    const handleLater = () => {
        handleClose();
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsClosing(false);
        }, 300);
    };

    const handleCloseUpToDate = () => {
        setIsUpToDateClosing(true);
        setTimeout(() => {
            setIsUpToDateVisible(false);
            setIsUpToDateClosing(false);
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

                {changelog && (
                    <p className="update-popup-changelog">
                        📝 {changelog}
                    </p>
                )}
                
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
                
                <p className="update-popup-info">
                    <small>
                        {isNative 
                            ? '💡 La mise à jour sera téléchargée et installée automatiquement'
                            : '💡 La mise à jour s\'installera automatiquement après le téléchargement'}
                    </small>
                </p>
            </div>
        </div>
    );
});

UpdateChecker.displayName = 'UpdateChecker';

export default UpdateChecker;

