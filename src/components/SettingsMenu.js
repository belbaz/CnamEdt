"use client";
import { useState, useEffect } from "react";
import "./SettingsMenu.css";

export default function SettingsMenu({ autoScrollToday, onToggleAutoScroll, onOpenChange }) {
    const [isOpen, setIsOpen] = useState(false);

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
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
