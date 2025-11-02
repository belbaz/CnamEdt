"use client";
import { useState, useEffect } from "react";
import "./SettingsMenu.css";

export default function SettingsMenu({ 
    autoScrollToday, 
    onToggleAutoScroll, 
    onOpenChange,
    compactMode,
    testMode,
    onToggleTestMode,
    isMobile = false,
    isNative = false,
    currentVersion = null,
    onCheckUpdates = null,
    showTimeLabels = true,
    onToggleTimeLabels = null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const isDev = process.env.NEXT_PUBLIC_ENV === 'dev';

    useEffect(() => {
        if (typeof onOpenChange === 'function') {
            onOpenChange(isOpen);
        }
    }, [isOpen, onOpenChange]);

    // Fermer avec la touche Escape
    useEffect(() => {
        if (!isOpen) return;
        
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    return (
        <>
            <button 
                className="settings-button"
                onClick={() => setIsOpen(!isOpen)}
                title="Paramètres"
            >
                ⚙️
            </button>

            {isOpen && (
                <>
                    <div className="settings-overlay" onClick={() => setIsOpen(false)} />
                    <div className="settings-menu">
                        <div className="settings-header">
                            <h3>Paramètres</h3>
                            <button className="settings-close" onClick={() => setIsOpen(false)}>✕</button>
                        </div>
                        
                        <div className="settings-content">
                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={autoScrollToday}
                                        onChange={(e) => onToggleAutoScroll(e.target.checked)}
                                    />
                                    <span>Défiler automatiquement vers aujourd'hui</span>
                                </label>
                            </div>

                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={showTimeLabels}
                                        onChange={(e) => onToggleTimeLabels && onToggleTimeLabels(e.target.checked)}
                                    />
                                    <span>Afficher les heures</span>
                                </label>
                            </div>

                            {isDev && (
                                <div className="setting-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={testMode}
                                            onChange={(e) => onToggleTestMode(e.target.checked)}
                                        />
                                        <span>Mode Test (Cours de test)</span>
                                    </label>
                                </div>
                            )}

                            {isNative && currentVersion && (
                                <div className="setting-item setting-button-item">
                                    <button 
                                        className="check-updates-button"
                                        onClick={() => {
                                            if (onCheckUpdates) {
                                                onCheckUpdates();
                                                setIsOpen(false);
                                            }
                                        }}
                                    >
                                        <span className="button-icon">🔄</span>
                                        <div className="button-content">
                                            <span className="button-label">Vérifier les mises à jour</span>
                                            <span className="button-version">Version actuelle : {currentVersion}</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
