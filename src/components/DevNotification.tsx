// @ts-nocheck
"use client";
import { useEffect } from "react";
import "./DevNotification.css";
import HoverTooltip from "./HoverTooltip";

export default function DevNotification({ message, isVisible, onClose }) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000); // Afficher pendant 5 secondes (plus long que Toast car plus d'infos)

            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div className={`dev-notification ${isVisible ? 'dev-notification-show' : ''}`}>
            <div className="dev-notification-content">
                <span className="dev-notification-icon">🔧</span>
                <span className="dev-notification-message">{message}</span>
                <HoverTooltip text="Fermer">
                <button 
                    className="dev-notification-close"
                    onClick={onClose}
                    aria-label="Fermer la notification"
                >
                    ✕
                </button>
                </HoverTooltip>
            </div>
        </div>
    );
}


