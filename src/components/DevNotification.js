"use client";
import { useEffect } from "react";
import "./DevNotification.css";

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
            </div>
        </div>
    );
}

