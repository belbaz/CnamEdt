"use client";
import { useState } from "react";
import "./SettingsMenu.css";

export default function SettingsMenu({ autoScrollToday, onToggleAutoScroll }) {
    const [isOpen, setIsOpen] = useState(false);

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
