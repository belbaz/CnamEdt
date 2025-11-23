"use client";
import { useState, useEffect } from 'react';

/**
 * Hook pour détecter si l'app est installée en PWA
 * et gérer l'état de l'installation
 */
export function usePWA() {
    const [isInstalled, setIsInstalled] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [canInstall, setCanInstall] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Détecter si l'app est en mode standalone (installée)
        const checkStandalone = () => {
            // iOS Safari
            const isIOSStandalone = 
                (window.navigator.standalone === true) ||
                (window.matchMedia('(display-mode: standalone)').matches);
            
            // Android/Desktop Chrome
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
            
            return isIOSStandalone || isStandaloneMode;
        };

        setIsStandalone(checkStandalone());
        setIsInstalled(checkStandalone());

        // Écouter l'événement beforeinstallprompt (Chrome/Edge)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Vérifier si l'app est déjà installée
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setCanInstall(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    /**
     * Provoquer l'installation de la PWA
     */
    const promptInstall = async () => {
        if (!deferredPrompt) {
            // Sur iOS, rediriger vers les instructions
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                alert('Pour installer l\'application sur iOS:\n1. Appuyez sur le bouton Partager\n2. Sélectionnez "Sur l\'écran d\'accueil"');
                return false;
            }
            return false;
        }

        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                setIsInstalled(true);
                setCanInstall(false);
            }
            
            setDeferredPrompt(null);
            return outcome === 'accepted';
        } catch (error) {
            console.error('[PWA] Erreur lors de l\'installation:', error);
            return false;
        }
    };

    return {
        isInstalled,
        isStandalone,
        canInstall,
        promptInstall
    };
}

