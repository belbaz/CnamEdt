// @ts-nocheck
"use client";
import { useEffect } from "react";
import {useI18n} from "@/i18n/I18nContext";
import "./DemoModeModal.css";

export default function DemoModeModal({ isOpen, onClose }) {
    const { t } = useI18n();
    // Bloquer le scroll quand la modal est ouverte
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = "";
            };
        }
    }, [isOpen]);

    // Fermer la modal avec la touche ESC
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="demo-modal-overlay" onClick={onClose}>
            <div className="demo-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="demo-modal-header">
                    <h2 className="demo-modal-title">{t('demoMode.title')}</h2>
                    <button 
                        className="demo-modal-close" 
                        onClick={onClose}
                        aria-label={t('demoMode.close')}
                    >
                        ✕
                    </button>
                </div>
                
                <div className="demo-modal-body">
                    <p className="demo-modal-intro">
                        {t('demoMode.intro')}
                    </p>
                    
                    <div className="demo-modal-section">
                        <p className="demo-modal-info">
                            {t('demoMode.info')}
                        </p>
                    </div>
                </div>
                
                <div className="demo-modal-footer">
                    <button className="demo-modal-button" onClick={onClose}>
                        {t('demoMode.understood')}
                    </button>
                </div>
            </div>
        </div>
    );
}


