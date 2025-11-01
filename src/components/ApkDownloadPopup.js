"use client";
import { useState, useEffect } from 'react';
import './ApkDownloadPopup.css';

/**
 * Popup pour télécharger l'APK sur Android (web uniquement)
 * Ne s'affiche que si :
 * - L'utilisateur est sur le site web (pas dans l'app native)
 * - L'utilisateur est sur Android
 * - L'utilisateur n'a pas déjà refusé la popup
 */
export default function ApkDownloadPopup() {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Vérifier si on est côté client
        if (typeof window === 'undefined') {
            console.log('[APK Popup] Pas côté client');
            return;
        }

        console.log('[APK Popup] Début de la vérification...');

        // Vérifier si on est dans l'app native (Capacitor)
        let isNativeApp = false;
        try {
            const { Capacitor } = require('@capacitor/core');
            isNativeApp = Capacitor && Capacitor.isNativePlatform();
            console.log('[APK Popup] isNativeApp:', isNativeApp);
        } catch (e) {
            // Pas de Capacitor, donc on est sur le web
            isNativeApp = false;
            console.log('[APK Popup] Capacitor non trouvé, on est sur le web');
        }

        // Ne pas afficher dans l'app native
        if (isNativeApp) {
            console.log('[APK Popup] App native détectée, pas de popup');
            return;
        }

        // Vérifier si l'utilisateur est sur Android
        const userAgent = navigator.userAgent.toLowerCase();
        const isAndroid = /android/.test(userAgent);
        console.log('[APK Popup] User Agent:', userAgent);
        console.log('[APK Popup] isAndroid:', isAndroid);

        // Ne pas afficher si ce n'est pas Android
        if (!isAndroid) {
            console.log('[APK Popup] Pas sur Android, pas de popup');
            return;
        }

        // Vérifier si l'utilisateur a déjà refusé la popup
        const hasDeclined = localStorage.getItem('apk_download_declined');
        console.log('[APK Popup] hasDeclined:', hasDeclined);
        if (hasDeclined === 'true') {
            console.log('[APK Popup] Utilisateur a refusé, pas de popup');
            return;
        }

        // Vérifier si la popup a déjà été affichée dans cette session
        const hasSeenInSession = sessionStorage.getItem('apk_popup_shown');
        console.log('[APK Popup] hasSeenInSession:', hasSeenInSession);
        if (hasSeenInSession === 'true') {
            console.log('[APK Popup] Déjà vu dans cette session, pas de popup');
            return;
        }

        // Vérifier l'URL de l'APK
        const apkUrl = process.env.NEXT_PUBLIC_APK_URL;
        console.log('[APK Popup] NEXT_PUBLIC_APK_URL:', apkUrl);

        // Attendre un peu avant d'afficher (pour une meilleure UX)
        console.log('[APK Popup] Affichage de la popup dans 2 secondes...');
        const timer = setTimeout(() => {
            console.log('[APK Popup] 🎉 AFFICHAGE DE LA POPUP !');
            setIsVisible(true);
            sessionStorage.setItem('apk_popup_shown', 'true');
        }, 2000); // Attendre 2 secondes après le chargement

        return () => clearTimeout(timer);
    }, []);

    const handleDownload = async () => {
        try {
            // Récupérer l'URL signée depuis l'API
            const response = await fetch('/api/version');
            
            if (!response.ok) {
                throw new Error('Impossible de récupérer l\'URL de l\'APK');
            }
            
            const data = await response.json();
            const apkUrl = data.url;
            
            console.log('[APK Popup] Téléchargement APK:', apkUrl);
            
            // Créer un élément <a> temporaire pour forcer le téléchargement
            const link = document.createElement('a');
            link.href = apkUrl;
            link.download = `edt_cnam_v${data.version}.apk`; // Nom du fichier téléchargé
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // Déclencher le téléchargement
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('[APK Popup] Téléchargement déclenché');
            
            // Fermer la popup après un court délai
            setTimeout(() => {
                handleClose();
            }, 500);
        } catch (error) {
            console.error('[APK Popup] Erreur lors du téléchargement:', error);
            alert('Erreur lors du téléchargement de l\'APK. Veuillez réessayer.');
        }
    };

    const handleDecline = () => {
        // Enregistrer que l'utilisateur a refusé (ne plus afficher)
        localStorage.setItem('apk_download_declined', 'true');
        handleClose();
    };

    const handleRemindLater = () => {
        // Juste fermer la popup pour cette session
        handleClose();
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsClosing(false);
        }, 300); // Durée de l'animation de fermeture
    };

    if (!isVisible) return null;

    return (
        <div className={`apk-popup-overlay ${isClosing ? 'closing' : ''}`}>
            <div className={`apk-popup ${isClosing ? 'closing' : ''}`}>
                <button 
                    className="apk-popup-close" 
                    onClick={handleDecline}
                    aria-label="Fermer"
                >
                    ✕
                </button>
                
                <div className="apk-popup-icon">
                    📱
                </div>
                
                <h2 className="apk-popup-title">
                    Télécharger l'application
                </h2>
                
                <p className="apk-popup-description">
                    Pour une meilleure expérience, téléchargez l'application mobile officielle.
                </p>
                
                <div className="apk-popup-features">
                    <div className="apk-feature">
                        <span className="apk-feature-icon">⚡</span>
                        <span>Plus rapide</span>
                    </div>
                    <div className="apk-feature">
                        <span className="apk-feature-icon">📲</span>
                        <span>Mode hors ligne</span>
                    </div>
                    <div className="apk-feature">
                        <span className="apk-feature-icon">🔔</span>
                        <span>Notifications</span>
                    </div>
                </div>
                
                <div className="apk-popup-buttons">
                    <button 
                        className="apk-popup-button apk-popup-button-primary"
                        onClick={handleDownload}
                    >
                        Télécharger l'APK
                    </button>
                    
                    <button 
                        className="apk-popup-button apk-popup-button-secondary"
                        onClick={handleRemindLater}
                    >
                        Plus tard
                    </button>
                    
                    <button 
                        className="apk-popup-button apk-popup-button-text"
                        onClick={handleDecline}
                    >
                        Ne plus me demander
                    </button>
                </div>
                
                <p className="apk-popup-info">
                    <small>💡 Vous devrez peut-être autoriser l'installation depuis des sources inconnues</small>
                </p>
            </div>
        </div>
    );
}

