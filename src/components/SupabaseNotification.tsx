// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from '../i18n/I18nContext';
import "./SupabaseNotification.css";

export default function SupabaseNotification({ show = false, source = null }) {
    const { t } = useI18n();
    const [showNotification, setShowNotification] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [lastDbUpdate, setLastDbUpdate] = useState(null);
    const [loadingDate, setLoadingDate] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        // Nettoyer le timeout précédent si il existe
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Afficher la notification quand show est true
        if (show) {
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
        } else if (!show && showNotification) {
            // Si show devient false, fermer la notification immédiatement
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
    }, [show, showNotification, isClosing]);

    // Charger la date quand on ouvre la modal
    useEffect(() => {
        if (!showModal) return;
        
        let cancelled = false;
        const fetchLastDbUpdate = async () => {
            setLoadingDate(true);
            try {
                const response = await fetch('/api/last-db-update');
                const data = await response.json();
                if (!cancelled && data.success && data.timestamp) {
                    setLastDbUpdate(data.timestamp);
                }
            } catch (e) {
                if (!cancelled) {
                    console.error('[SupabaseNotification] Erreur récupération date:', e);
                }
            } finally {
                if (!cancelled) {
                    setLoadingDate(false);
                }
            }
        };
        
        fetchLastDbUpdate();
        
        return () => {
            cancelled = true;
        };
    }, [showModal]);

    // Formater le timestamp pour l'affichage
    const formatLastUpdate = (timestamp) => {
        if (!timestamp) {
            return t('supabaseNotification.notAvailable');
        }
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return t('supabaseNotification.notAvailable');
            return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return t('supabaseNotification.notAvailable');
        }
    };

    const handleClick = () => {
        setShowModal(true);
        // Annuler la fermeture automatique si on ouvre la modal
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    // Ne rien afficher si la notification ne doit pas être affichée
    if (!showNotification) {
        return null;
    }

    // Déterminer le message selon la source
    let message = t('supabaseNotification.dataSaved');
    if (source === 'database-fallback') {
        message = t('supabaseNotification.dataSaved');
    } else if (source === 'force-db' || source === 'database') {
        message = t('supabaseNotification.dataSaved');
    }

    return (
        <>
            <div className={`supabase-notification ${isClosing ? 'closing' : ''}`}>
                <div className="supabase-notification-content" onClick={handleClick} style={{ cursor: 'pointer' }}>
                    <svg className="supabase-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        {/* Icône base de données */}
                        <ellipse cx="12" cy="5" rx="9" ry="2" fill="white" opacity="0.9"/>
                        <path d="M21 12c0 1.1-4.03 2-9 2s-9-.9-9-2" stroke="white" strokeWidth="2" fill="none"/>
                        <path d="M3 5v14c0 1.1 4.03 2 9 2s9-.9 9-2V5" stroke="white" strokeWidth="2" fill="none"/>
                        <ellipse cx="12" cy="19" rx="9" ry="2" fill="white" opacity="0.9"/>
                    </svg>
                    <span className="supabase-text">{message}</span>
                </div>
            </div>

            {showModal && (
                <div className="supabase-modal-overlay" onClick={handleCloseModal}>
                    <div className="supabase-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="supabase-modal-close" onClick={handleCloseModal} aria-label={t('supabaseNotification.closeModal')}>
                            ×
                        </button>
                        <div className="supabase-modal-header">
                            <svg className="supabase-modal-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <ellipse cx="12" cy="5" rx="9" ry="2" fill="currentColor" opacity="0.9"/>
                                <path d="M21 12c0 1.1-4.03 2-9 2s-9-.9-9-2" stroke="currentColor" strokeWidth="2" fill="none"/>
                                <path d="M3 5v14c0 1.1 4.03 2 9 2s9-.9 9-2V5" stroke="currentColor" strokeWidth="2" fill="none"/>
                                <ellipse cx="12" cy="19" rx="9" ry="2" fill="currentColor" opacity="0.9"/>
                            </svg>
                            <h2 className="supabase-modal-title">{t('supabaseNotification.modalTitle')}</h2>
                        </div>
                        <div className="supabase-modal-body">
                            <p className="supabase-modal-message">
                                {t('supabaseNotification.noAccessMessage')}
                            </p>
                            <p className="supabase-modal-message">
                                {t('supabaseNotification.recoveredDataMessage')}
                            </p>
                            <div className="supabase-modal-info">
                                <p className="supabase-modal-label">{t('supabaseNotification.lastUpdateLabel')}</p>
                                <p className="supabase-modal-date">
                                    {loadingDate ? t('supabaseNotification.loading') : formatLastUpdate(lastDbUpdate)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


