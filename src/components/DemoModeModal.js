"use client";
import { useEffect } from "react";
import "./DemoModeModal.css";

export default function DemoModeModal({ isOpen, onClose }) {
    // Bloquer le scroll quand la modal est ouverte
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = "";
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="demo-modal-overlay" onClick={onClose}>
            <div className="demo-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="demo-modal-header">
                    <div className="demo-modal-icon">🎯</div>
                    <h2 className="demo-modal-title">Mode Démo</h2>
                    <button 
                        className="demo-modal-close" 
                        onClick={onClose}
                        aria-label="Fermer"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="demo-modal-body">
                    <p className="demo-modal-intro">
                        Vous visualisez des données de démonstration générées automatiquement.
                    </p>
                    
                    <div className="demo-modal-section">
                        <p className="demo-modal-info">
                            Ces données incluent des cours variés, des professeurs et des matières fictives pour toute l'année scolaire. 
                            Elles ne correspondent pas à un emploi du temps réel.
                        </p>
                    </div>
                </div>
                
                <div className="demo-modal-footer">
                    <button className="demo-modal-button" onClick={onClose}>
                        Compris
                    </button>
                </div>
            </div>
        </div>
    );
}

