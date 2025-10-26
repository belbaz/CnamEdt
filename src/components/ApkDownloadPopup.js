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
        if (typeof window === 'undefined') return;

        // Vérifier si on est dans l'app native (Capacitor)
        let isNativeApp = false;
        try {
            const { Capacitor } = require('@capacitor/core');
            isNativeApp = Capacitor && Capacitor.isNativePlatform();
        } catch (e) {
            // Pas de Capacitor, donc on est sur le web
            isNativeApp = false;
        }

        // Ne pas afficher dans l'app native
        if (isNativeApp) return;

        // Vérifier si l'utilisateur est sur Android
        const userAgent = navigator.userAgent.toLowerCase();
        const isAndroid = /android/.test(userAgent);

        // Ne pas afficher si ce n'est pas Android
        if (!isAndroid) return;

        // Vérifier si l'utilisateur a déjà refusé la popup
        const hasDeclined = localStorage.getItem('apk_download_declined');
        if (hasDeclined === 'true') return;

        // Vérifier si la popup a déjà été affichée dans cette session
        const hasSeenInSession = sessionStorage.getItem('apk_popup_shown');
        if (hasSeenInSession === 'true') return;

        // Attendre un peu avant d'afficher (pour une meilleure UX)
        const timer = setTimeout(() => {
            setIsVisible(true);
            sessionStorage.setItem('apk_popup_shown', 'true');
        }, 2000); // Attendre 2 secondes après le chargement

        return () => clearTimeout(timer);
    }, []);

    const handleDownload = () => {
        const apkUrl = process.env.NEXT_PUBLIC_APK_URL || 'https://aeftxgwfokzlspojzisx.supabase.co/storage/v1/object/public/Apk%20Edt%20Eicnam/apk/app-debug.apk';
        
        // Ouvrir le lien de téléchargement
        window.open(apkUrl, '_blank');
        
        // Fermer la popup
        handleClose();
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

