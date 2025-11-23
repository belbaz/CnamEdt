"use client";
import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import './PWAInstallPrompt.css';

/**
 * Composant pour afficher un prompt d'installation PWA personnalisé
 * S'affiche uniquement si l'app n'est pas encore installée et que l'installation est possible
 */
export default function PWAInstallPrompt() {
    const { canInstall, isInstalled, promptInstall } = usePWA();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [showManualPrompt, setShowManualPrompt] = useState(false);

    useEffect(() => {
        // Ne pas afficher si déjà installée
        if (isInstalled) {
            setIsVisible(false);
            setShowManualPrompt(false);
            return;
        }

        // Vérifier si l'utilisateur a déjà refusé
        const dismissed = localStorage.getItem('pwa_install_dismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
            setIsVisible(false);
            setShowManualPrompt(false);
            return;
        }

        // Afficher si l'installation est possible via beforeinstallprompt
        if (canInstall) {
            console.log('[PWAInstallPrompt] canInstall = true, affichage dans 3s');
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 3000);
            return () => clearTimeout(timer);
        }

        // Fallback: Afficher une bannière manuelle si on est sur Android/Chrome
        // même sans beforeinstallprompt (l'utilisateur pourra utiliser le menu Chrome)
        const isAndroid = /Android/.test(navigator.userAgent);
        const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Opera/.test(navigator.userAgent);
        
        if (isAndroid && isChrome && !isInstalled && !isDismissed) {
            console.log('[PWAInstallPrompt] Android + Chrome détecté, affichage bannière manuelle dans 5s');
            const timer = setTimeout(() => {
                setShowManualPrompt(true);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [canInstall, isInstalled]);

    const handleInstall = async () => {
        const installed = await promptInstall();
        if (installed) {
            setIsVisible(false);
            setShowManualPrompt(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setShowManualPrompt(false);
        setIsDismissed(true);
        localStorage.setItem('pwa_install_dismissed', 'true');
    };

    const handleManualInstall = () => {
        // Ouvrir les instructions pour installation manuelle
        alert('Pour installer l\'application :\n\n1. Appuyez sur le menu (⋮) en haut à droite\n2. Sélectionnez "Ajouter à l\'écran d\'accueil" ou "Installer l\'application"\n3. Confirmez l\'installation');
        handleDismiss();
    };

    // Ne pas afficher sur iOS (pas de beforeinstallprompt)
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    
    // Afficher la bannière automatique si canInstall est true
    if (isVisible && !isDismissed && !isInstalled && !isIOS) {
        return (
            <div className="pwa-install-prompt">
                <div className="pwa-install-content">
                    <div className="pwa-install-icon">📱</div>
                    <div className="pwa-install-text">
                        <strong>Installer l'application</strong>
                        <span>Ajoutez EDT EICNAM à votre écran d'accueil pour un accès rapide</span>
                    </div>
                    <div className="pwa-install-actions">
                        <button
                            className="pwa-install-button pwa-install-button-primary"
                            onClick={handleInstall}
                        >
                            Installer
                        </button>
                        <button
                            className="pwa-install-button pwa-install-button-secondary"
                            onClick={handleDismiss}
                        >
                            Plus tard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Afficher la bannière manuelle si pas de beforeinstallprompt mais sur Android/Chrome
    if (showManualPrompt && !isDismissed && !isInstalled && !isIOS) {
        return (
            <div className="pwa-install-prompt">
                <div className="pwa-install-content">
                    <div className="pwa-install-icon">📱</div>
                    <div className="pwa-install-text">
                        <strong>Installer l'application</strong>
                        <span>Utilisez le menu Chrome (⋮) → "Ajouter à l'écran d'accueil"</span>
                    </div>
                    <div className="pwa-install-actions">
                        <button
                            className="pwa-install-button pwa-install-button-primary"
                            onClick={handleManualInstall}
                        >
                            Comment installer ?
                        </button>
                        <button
                            className="pwa-install-button pwa-install-button-secondary"
                            onClick={handleDismiss}
                        >
                            Plus tard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;

    return (
        <div className="pwa-install-prompt">
            <div className="pwa-install-content">
                <div className="pwa-install-icon">📱</div>
                <div className="pwa-install-text">
                    <strong>Installer l'application</strong>
                    <span>Ajoutez EDT EICNAM à votre écran d'accueil pour un accès rapide</span>
                </div>
                <div className="pwa-install-actions">
                    <button
                        className="pwa-install-button pwa-install-button-primary"
                        onClick={handleInstall}
                    >
                        Installer
                    </button>
                    <button
                        className="pwa-install-button pwa-install-button-secondary"
                        onClick={handleDismiss}
                    >
                        Plus tard
                    </button>
                </div>
            </div>
        </div>
    );
}

