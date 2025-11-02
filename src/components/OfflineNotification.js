"use client";
import { useState, useEffect, useRef } from "react";
import "./OfflineNotification.css";

export default function OfflineNotification({ forceShow = false }) {
    const [isOnline, setIsOnline] = useState(true);
    const [showNotification, setShowNotification] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const timeoutRef = useRef(null);
    const hasShownRef = useRef(false); // Pour éviter les boucles

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Fonction pour vérifier réellement la connexion en testant un fetch
        const checkRealConnection = async () => {
            try {
                // Essayer de fetch une petite ressource pour vérifier la vraie connexion
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000); // Timeout de 2 secondes
                
                await fetch('/api/version', { 
                    method: 'HEAD',
                    cache: 'no-cache',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                setIsOnline(true);
            } catch (error) {
                // Si le fetch échoue, on est probablement hors ligne
                setIsOnline(false);
            }
        };

        // Détecter l'état initial
        const initialOnline = navigator.onLine;
        setIsOnline(initialOnline);
        
        // Si navigator dit qu'on est en ligne, vérifier vraiment (car il peut mentir en localhost)
        if (initialOnline) {
            checkRealConnection();
        }

        const handleOnline = () => {
            setIsOnline(true);
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Ne pas vérifier périodiquement pour éviter les boucles
        // On se fie aux événements online/offline du navigateur

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        // Ne pas réafficher si on l'a déjà montrée récemment (éviter les boucles)
        if (hasShownRef.current && !forceShow) {
            return;
        }

        // Nettoyer le timeout précédent si il existe
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Afficher la notification quand on est hors ligne ou si forceShow est true
        // Mais seulement si elle n'est pas déjà en train de s'afficher
        if ((!isOnline || forceShow) && !showNotification && !isClosing) {
            hasShownRef.current = true;
            setShowNotification(true);
            setIsClosing(false);
            
            // Fermer après 5 secondes
            timeoutRef.current = setTimeout(() => {
                setIsClosing(true);
                setTimeout(() => {
                    setShowNotification(false);
                    setIsClosing(false);
                    timeoutRef.current = null;
                    // Réinitialiser le flag après 10 secondes pour permettre un nouvel affichage si nécessaire
                    setTimeout(() => {
                        hasShownRef.current = false;
                    }, 10000);
                }, 300); // Temps de l'animation de fermeture
            }, 5000);
        } else if (isOnline && !forceShow && showNotification) {
            // Si on revient en ligne, fermer la notification
            setIsClosing(true);
            setTimeout(() => {
                setShowNotification(false);
                setIsClosing(false);
                hasShownRef.current = false;
            }, 300);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [isOnline, showNotification, forceShow, isClosing]);

    // Ne rien afficher si on est en ligne (et pas forceShow) ou si la notification n'est pas affichée
    if ((isOnline && !forceShow) || !showNotification) {
        return null;
    }

    return (
        <div className={`offline-notification ${isClosing ? 'closing' : ''}`}>
            <div className="offline-notification-content">
                <svg className="offline-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    {/* Avion simple */}
                    <path 
                        d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" 
                        fill="white"
                    />
                </svg>
                <span className="offline-text">Mode hors ligne</span>
            </div>
        </div>
    );
}

