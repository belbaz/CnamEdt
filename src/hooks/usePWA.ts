"use client";
import { useState, useEffect } from 'react';

/**
 * Hook pour détecter si l'app est installée en PWA
 * et gérer l'état de l'installation
 */
export function usePWA() {
    const [isInstalled, setIsInstalled] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [canInstall, setCanInstall] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Détecter si l'app est en mode standalone (installée)
        const checkStandalone = () => {
            // iOS Safari
            const isIOSStandalone =
                ((window.navigator as any).standalone === true) ||
                (window.matchMedia('(display-mode: standalone)').matches);

            // Android/Desktop Chrome
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

            return isIOSStandalone || isStandaloneMode;
        };

        setIsStandalone(checkStandalone());
        setIsInstalled(checkStandalone());

        // Écouter l'événement beforeinstallprompt (Chrome/Edge)
        const handleBeforeInstallPrompt = (e: any) => {
            console.log('[PWA] beforeinstallprompt déclenché');
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Vérifier périodiquement si l'installation est possible (fallback)
        // Chrome peut ne pas déclencher beforeinstallprompt dans certains cas
        const checkInstallability = async () => {
            try {
                // Vérifier si le manifest est valide
                const manifestResponse = await fetch('/manifest.webmanifest');
                if (manifestResponse.ok) {
                    const manifest = await manifestResponse.json();
                    console.log('[PWA] Manifest valide:', manifest.name);

                    // Vérifier si le Service Worker est actif
                    if ('serviceWorker' in navigator) {
                        const registration = await navigator.serviceWorker.getRegistration();
                        if (registration) {
                            console.log('[PWA] Service Worker actif');
                            console.log('[PWA] État installation:', {
                                isStandalone: checkStandalone(),
                                userAgent: navigator.userAgent.substring(0, 50)
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn('[PWA] Erreur vérification installabilité:', error);
            }
        };

        // Vérifier après un délai
        setTimeout(checkInstallability, 2000);

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

