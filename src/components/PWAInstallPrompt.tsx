// @ts-nocheck
"use client";
import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import {useI18n} from '@/i18n/I18nContext';
import './PWAInstallPrompt.css';

/**
 * Composant pour afficher un prompt d'installation PWA personnalisé
 * S'affiche uniquement si l'app n'est pas encore installée et que l'installation est possible
 */
export default function PWAInstallPrompt() {
    const { t } = useI18n();
    const { canInstall, isInstalled, promptInstall } = usePWA();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [showManualPrompt, setShowManualPrompt] = useState(false);

    // Fonction pour détecter si on est sur mobile (iPhone ou Android)
    const isMobileDevice = () => {
        if (typeof window === 'undefined') return false;
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /iPhone|iPad|iPod|Android/i.test(userAgent);
    };

    useEffect(() => {
        // Ne pas afficher si on n'est pas sur mobile
        if (!isMobileDevice()) {
            setIsVisible(false);
            setShowManualPrompt(false);
            return;
        }

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
        alert(t('pwaInstall.manualInstructions'));
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
                        <strong>{t('pwaInstall.title')}</strong>
                        <span>{t('pwaInstall.description')}</span>
                    </div>
                    <div className="pwa-install-actions">
                        <button
                            className="pwa-install-button pwa-install-button-primary"
                            onClick={handleInstall}
                        >
                            {t('pwaInstall.install')}
                        </button>
                        <button
                            className="pwa-install-button pwa-install-button-secondary"
                            onClick={handleDismiss}
                        >
                            {t('pwaInstall.later')}
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
                        <strong>{t('pwaInstall.manualTitle')}</strong>
                        <span>{t('pwaInstall.manualDescription')}</span>
                    </div>
                    <div className="pwa-install-actions">
                        <button
                            className="pwa-install-button pwa-install-button-primary"
                            onClick={handleManualInstall}
                        >
                            {t('pwaInstall.howToInstall')}
                        </button>
                        <button
                            className="pwa-install-button pwa-install-button-secondary"
                            onClick={handleDismiss}
                        >
                            {t('pwaInstall.later')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}


