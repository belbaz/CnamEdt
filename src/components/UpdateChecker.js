"use client";
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './UpdateChecker.css';

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

    // Exposer la méthode checkForUpdates via la ref
    useImperativeHandle(ref, () => ({
        checkForUpdates: () => {
            setManualCheck(true);
            checkForUpdates(true);
        }
    }));

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
            // Appeler l'API du site web pour obtenir la dernière version
            const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://edt-eicnam.vercel.app';
            const versionUrl = `${apiUrl}/api/version`;
            
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

            // Comparer les versions
            const needsUpdate = compareVersions(currentVersion, data.version);
            console.log('[UpdateChecker] Mise à jour nécessaire:', needsUpdate);
            console.log('[UpdateChecker] Version locale:', currentVersion, '→ Version distante:', data.version);

            if (needsUpdate) {
                setUpdateAvailable(true);
                setIsVisible(true);
            } else if (isManual) {
                // Si vérification manuelle et pas de mise à jour, afficher un message
                alert(`Vous utilisez la dernière version (${currentVersion}) 🎉`);
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

    // Compare deux versions (format: "1.0.0")
    // Retourne true si remoteVersion > localVersion
    const compareVersions = (local, remote) => {
        const localParts = local.split('.').map(Number);
        const remoteParts = remote.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (remoteParts[i] > localParts[i]) return true;
            if (remoteParts[i] < localParts[i]) return false;
        }

        return false; // Versions identiques
    };

    const handleUpdate = () => {
        if (downloadUrl) {
            console.log('[UpdateChecker] Téléchargement:', downloadUrl);
            window.open(downloadUrl, '_system');
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
                    <div className="update-version">
                        <span className="update-version-label">Version actuelle</span>
                        <span className="update-version-number">{currentVersion}</span>
                    </div>
                    <div className="update-version-arrow">→</div>
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
                
                <div className="update-popup-buttons">
                    <button 
                        className="update-popup-button update-popup-button-primary"
                        onClick={handleUpdate}
                    >
                        Télécharger
                    </button>
                    
                    <button 
                        className="update-popup-button update-popup-button-secondary"
                        onClick={handleLater}
                    >
                        Plus tard
                    </button>
                </div>
                
                <p className="update-popup-info">
                    <small>💡 La mise à jour s'installera automatiquement après le téléchargement</small>
                </p>
            </div>
        </div>
    );
});

UpdateChecker.displayName = 'UpdateChecker';

export default UpdateChecker;

