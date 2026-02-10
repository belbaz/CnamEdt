"use client";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/i18n/I18nContext";
import styles from "./OrientationManager.module.css";

/**
 * Composant qui gère l'orientation de l'écran sur mobile
 * - Verrouille en portrait par défaut
 * - Affiche un bouton pendant 4s quand le téléphone est en position horizontale
 * - Permet de basculer manuellement en mode paysage
 * - Revient automatiquement en portrait quand on remet le téléphone vertical
 */
export default function OrientationManager() {
    const { t } = useI18n();
    const [showRotateButton, setShowRotateButton] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);
    const [manualLandscape, setManualLandscape] = useState(false);
    const buttonTimeoutRef = useRef(null);
    const hideButtonTimeoutRef = useRef(null);

    useEffect(() => {
        // Vérifier si on est sur mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;

        // Fonction pour déverrouiller l'orientation
        const unlockOrientation = () => {
            try {
                if (window.screen?.orientation?.unlock) {
                    window.screen.orientation.unlock();
                }
            } catch (err) {
                console.warn('Impossible de déverrouiller l\'orientation:', err);
            }
        };

        // Fonction pour détecter l'orientation physique du téléphone
        const handleOrientationChange = () => {
            // Récupérer l'orientation actuelle
            const orientation = window.screen?.orientation?.type || 
                               (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
            
            const isCurrentlyLandscape = orientation.includes('landscape');
            setIsLandscape(isCurrentlyLandscape);

            // Si le téléphone est en position horizontale et qu'on n'est pas déjà en mode paysage manuel
            if (isCurrentlyLandscape && !manualLandscape) {
                // Afficher le bouton
                setShowRotateButton(true);
                
                // Annuler le timeout précédent si existant
                if (hideButtonTimeoutRef.current) {
                    clearTimeout(hideButtonTimeoutRef.current);
                }
                
                // Cacher le bouton après 4 secondes
                hideButtonTimeoutRef.current = setTimeout(() => {
                    setShowRotateButton(false);
                }, 4000);
            } 
            // Si le téléphone revient en position verticale
            else if (!isCurrentlyLandscape) {
                // Cacher le bouton immédiatement
                setShowRotateButton(false);
                if (hideButtonTimeoutRef.current) {
                    clearTimeout(hideButtonTimeoutRef.current);
                }
                
                // Si on était en mode paysage manuel, revenir en portrait
                if (manualLandscape) {
                    setManualLandscape(false);
                    unlockOrientation();
                }
            }
        };

        // Fonction pour verrouiller en paysage
        const lockLandscape = async () => {
            try {
                if (window.screen?.orientation?.lock) {
                    await window.screen.orientation.lock('landscape');
                }
            } catch (err) {
                console.warn('Impossible de verrouiller en paysage:', err);
            }
        };

        // Gérer le clic sur le bouton de rotation
        const handleRotateClick = () => {
            setManualLandscape(true);
            setShowRotateButton(false);
            lockLandscape();
        };

        // Stocker la fonction pour pouvoir la retirer plus tard
        window.__handleRotateClick = handleRotateClick;

        // Écouter les changements d'orientation
        if (window.screen?.orientation) {
            window.screen.orientation.addEventListener('change', handleOrientationChange);
        }
        
        // Fallback pour les navigateurs qui ne supportent pas screen.orientation
        window.addEventListener('resize', handleOrientationChange);
        
        // Vérifier l'orientation initiale
        handleOrientationChange();

        // Nettoyage
        return () => {
            if (window.screen?.orientation) {
                window.screen.orientation.removeEventListener('change', handleOrientationChange);
            }
            window.removeEventListener('resize', handleOrientationChange);
            
            if (buttonTimeoutRef.current) {
                clearTimeout(buttonTimeoutRef.current);
            }
            if (hideButtonTimeoutRef.current) {
                clearTimeout(hideButtonTimeoutRef.current);
            }
            
            delete window.__handleRotateClick;
        };
    }, [manualLandscape]);

    // Ne rien afficher si le bouton n'est pas visible
    if (!showRotateButton) return null;

    return (
        <div className={styles.orientationButtonContainer}>
            <button
                className={styles.orientationButton}
                onClick={() => window.__handleRotateClick?.()}
                aria-label={t('orientation.ariaLabel')}
            >
                <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.rotateIcon}
                >
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M16 10L19 10L19 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 10L16 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={styles.buttonText}>{t('orientation.switchToLandscape')}</span>
            </button>
        </div>
    );
}
