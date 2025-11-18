"use client";
import { useEffect, useRef, useState } from "react";
import "./SupabaseNotification.css";

export default function SupabaseNotification({ show = false, source = null }) {
    const [showNotification, setShowNotification] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
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

    // Ne rien afficher si la notification ne doit pas être affichée
    if (!showNotification) {
        return null;
    }

    // Déterminer le message selon la source
    let message = "Données depuis Supabase";
    if (source === 'database-fallback') {
        message = "Données depuis Supabase (fallback)";
    } else if (source === 'force-db' || source === 'database') {
        message = "Mode Supabase";
    }

    return (
        <div className={`supabase-notification ${isClosing ? 'closing' : ''}`}>
            <div className="supabase-notification-content">
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
    );
}

