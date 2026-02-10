"use client";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/i18n/I18nContext";
import styles from "./OrientationManager.module.css";

/**
 * Composant qui gère l'orientation de l'écran sur mobile
 * - FORCE l'affichage en portrait par défaut (via CSS transform)
 * - Affiche un bouton pendant 4s quand le téléphone PHYSIQUE est en position horizontale
 * - L'orientation ne change QUE si on appuie sur le bouton
 * - Revient automatiquement en portrait quand on remet le téléphone vertical
 * 
 * IMPORTANT: Cette solution fonctionne dans les navigateurs web (pas besoin d'app native)
 * Elle utilise CSS transform pour forcer l'orientation visuelle
 */
export default function OrientationManager() {
    const { t } = useI18n();
    const [showRotateButton, setShowRotateButton] = useState(false);
    const [manualLandscape, setManualLandscape] = useState(false);
    const [isPhysicallyLandscape, setIsPhysicallyLandscape] = useState(false);
    const hideButtonTimeoutRef = useRef(null);

    // Appliquer/retirer la classe CSS sur le body pour forcer l'orientation
    useEffect(() => {
        const body = document.body;
        
        // Déterminer si on doit forcer le mode portrait
        const shouldForcePortrait = isPhysicallyLandscape && !manualLandscape;
        
        if (shouldForcePortrait) {
            body.classList.add('force-portrait-orientation');
            console.log('[OrientationManager] Mode portrait forcé via CSS');
        } else if (manualLandscape && isPhysicallyLandscape) {
            body.classList.remove('force-portrait-orientation');
            body.classList.add('allow-landscape-orientation');
            console.log('[OrientationManager] Mode paysage autorisé');
        } else {
            body.classList.remove('force-portrait-orientation');
            body.classList.remove('allow-landscape-orientation');
        }
        
        return () => {
            body.classList.remove('force-portrait-orientation');
            body.classList.remove('allow-landscape-orientation');
        };
    }, [isPhysicallyLandscape, manualLandscape]);

    useEffect(() => {
        // Vérifier si on est sur mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;

        // Fonction pour détecter l'orientation PHYSIQUE du téléphone
        const handleOrientationChange = () => {
            // Détection basée sur les dimensions de la fenêtre
            const isLandscape = window.innerWidth > window.innerHeight;
            setIsPhysicallyLandscape(isLandscape);
            
            console.log('[OrientationManager] Changement détecté:', {
                isLandscape,
                manualLandscape,
                width: window.innerWidth,
                height: window.innerHeight
            });

            // Si le téléphone est physiquement en position horizontale et qu'on n'a pas activé le mode paysage manuellement
            if (isLandscape && !manualLandscape) {
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
            else if (!isLandscape) {
                // Cacher le bouton immédiatement
                setShowRotateButton(false);
                if (hideButtonTimeoutRef.current) {
                    clearTimeout(hideButtonTimeoutRef.current);
                }
                
                // Si on était en mode paysage manuel, revenir en portrait
                if (manualLandscape) {
                    setManualLandscape(false);
                }
            }
        };

        // Gérer le clic sur le bouton de rotation
        const handleRotateClick = () => {
            console.log('[OrientationManager] Bouton cliqué - Passage en mode paysage');
            setManualLandscape(true);
            setShowRotateButton(false);
        };

        // Stocker la fonction pour pouvoir la retirer plus tard
        window.__handleRotateClick = handleRotateClick;

        // Écouter les changements de taille de fenêtre pour détecter la rotation physique
        window.addEventListener('resize', handleOrientationChange);
        
        // Écouter aussi les changements d'orientation
        if (window.screen?.orientation) {
            window.screen.orientation.addEventListener('change', handleOrientationChange);
        }
        
        // Vérifier l'orientation initiale
        handleOrientationChange();

        // Nettoyage
        return () => {
            if (window.screen?.orientation) {
                window.screen.orientation.removeEventListener('change', handleOrientationChange);
            }
            window.removeEventListener('resize', handleOrientationChange);
            
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
