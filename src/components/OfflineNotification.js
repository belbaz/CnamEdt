"use client";
import { useEffect, useRef, useState } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import "./OfflineNotification.css";

export default function OfflineNotification({ forceShow = false, lastUpdateTimestamp = null, showModal: externalShowModal = null, onModalClose: externalOnModalClose = null }) {
    const { isOnline } = useNetworkStatus();
    const [showNotification, setShowNotification] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [internalShowModal, setInternalShowModal] = useState(false);
    const timeoutRef = useRef(null);
    
    // Utiliser la prop externe si fournie, sinon l'état interne
    const showModal = externalShowModal !== null ? externalShowModal : internalShowModal;

    useEffect(() => {
        // Nettoyer le timeout précédent si il existe
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Afficher la notification quand on est hors ligne ou si forceShow est true
        if (!isOnline || forceShow) {
            if (!showNotification && !isClosing) {
                setShowNotification(true);
                setIsClosing(false);

                // Fermer après 5 secondes
                timeoutRef.current = setTimeout(() => {
                    setIsClosing(true);
                    setTimeout(() => {
                        setShowNotification(false);
                        setIsClosing(false);
                        timeoutRef.current = null;
                    }, 300);
                }, 5000);
            }
        } else if (isOnline && !forceShow && showNotification) {
            // Si on revient en ligne, fermer la notification immédiatement
            setIsClosing(true);
            setTimeout(() => {
                setShowNotification(false);
                setIsClosing(false);
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
    // SAUF si on a un contrôle externe de la modale (dans ce cas, on peut afficher seulement la modale)
    const shouldShowNotification = (isOnline && !forceShow) || !showNotification;
    
    // Si on a un contrôle externe de la modale, on peut afficher seulement la modale sans la notification
    // Dans ce cas, on ne retourne null que si la modale n'est pas ouverte
    if (externalShowModal !== null) {
        // Si on a un contrôle externe, on affiche seulement la modale si elle est ouverte
        if (!showModal) {
            return null;
        }
        // Sinon, on continue pour afficher la modale
    } else if (shouldShowNotification) {
        // Si on n'a pas de contrôle externe et qu'on ne doit pas afficher la notification, on ne retourne rien
        return null;
    }

    // Formater le timestamp pour l'affichage
    const formatLastUpdate = (timestamp) => {
        if (!timestamp) {
            return 'Non disponible';
        }
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Non disponible';
            return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Non disponible';
        }
    };

    const handleClick = () => {
        if (externalOnModalClose) {
            // Si on a un contrôle externe, on ne fait rien ici (le parent gère)
            return;
        }
        setInternalShowModal(true);
        // Annuler la fermeture automatique si on ouvre la modal
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const handleCloseModal = () => {
        if (externalOnModalClose) {
            externalOnModalClose();
        } else {
            setInternalShowModal(false);
        }
    };

    return (
        <>
            {!shouldShowNotification && (
                <div className={`offline-notification ${isClosing ? 'closing' : ''}`}>
                    <div className="offline-notification-content" onClick={handleClick} style={{ cursor: 'pointer' }}>
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
            )}

            {showModal && (
                <div className="offline-modal-overlay" onClick={handleCloseModal}>
                    <div className="offline-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="offline-modal-close" onClick={handleCloseModal} aria-label="Fermer">
                            ×
                        </button>
                        <div className="offline-modal-header">
                            <svg className="offline-modal-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path 
                                    d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" 
                                    fill="currentColor"
                                />
                            </svg>
                            <h2 className="offline-modal-title">
                                {!isOnline || forceShow ? 'Mode hors ligne' : 'Informations EDT'}
                            </h2>
                        </div>
                        <div className="offline-modal-body">
                            <p className="offline-modal-message">
                                {!isOnline || forceShow 
                                    ? 'Actuellement en mode hors ligne.'
                                    : 'L\'emploi du temps est à jour.'
                                }
                            </p>
                            <div className="offline-modal-info">
                                <p className="offline-modal-label">Dernière sauvegarde :</p>
                                <p className="offline-modal-date">{formatLastUpdate(lastUpdateTimestamp)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

