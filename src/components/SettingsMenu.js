"use client";
import { useState, useEffect } from "react";
import "./SettingsMenu.css";

export default function SettingsMenu({ 
    autoScrollToday, 
    onToggleAutoScroll, 
    onOpenChange,
    compactMode,
    onCompactModeChange,
    testMode,
    onToggleTestMode,
    isMobile = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const isDev = process.env.NEXT_PUBLIC_ENV === 'dev';

    useEffect(() => {
        if (typeof onOpenChange === 'function') {
            onOpenChange(isOpen);
        }
    }, [isOpen, onOpenChange]);

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

                            <div className="setting-item slider-item">
                                <div className="slider-label">
                                    <span>Compacité</span>
                                    <span className="slider-value">
                                        {compactMode <= 3 ? 'Compact' : 
                                         compactMode <= 6 ? 'Assez compact' : 'Normal'}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="1"
                                    value={compactMode}
                                    onChange={(e) => onCompactModeChange(parseInt(e.target.value))}
                                    className="slider"
                                />
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
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
