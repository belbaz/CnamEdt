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

    useEffect(() => {
        // Ne pas afficher si déjà installée
        if (isInstalled) {
            setIsVisible(false);
            return;
        }

        // Vérifier si l'utilisateur a déjà refusé
        const dismissed = localStorage.getItem('pwa_install_dismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
            setIsVisible(false);
            return;
        }

        // Afficher seulement si l'installation est possible
        if (canInstall) {
            // Attendre un peu avant d'afficher (meilleure UX)
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 3000); // 3 secondes après le chargement

            return () => clearTimeout(timer);
        }
    }, [canInstall, isInstalled]);

    const handleInstall = async () => {
        const installed = await promptInstall();
        if (installed) {
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem('pwa_install_dismissed', 'true');
    };

    // Ne pas afficher sur iOS (pas de beforeinstallprompt)
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIOS || !isVisible || isDismissed || isInstalled) {
        return null;
    }

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

