"use client";
import './Footer.css';
import {useState, useEffect} from 'react';
import {useDevMode} from '../utils/env';

export default function Footer({
    testMode = false,
    onToggleTestMode = null,
    testWeekMode = false,
    onToggleTestWeek = null
}) {
    const [version, setVersion] = useState("Loading ...");
    const devMode = useDevMode();

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const res = await fetch('/api/version');
                const data = await res.json();
                if (data.version) {
                    setVersion(data.version);
                } else {
                    setVersion("Unknown");
                }
            } catch (err) {
                console.error("Failed to fetch version:", err);
                setVersion("Error");
            }
        };

        fetchVersion();
    }, []); // ← exécute une seule fois au montage

    return (
        <footer className="app-footer">
            <div className="app-footer-content">
                <span className="app-footer-text">EDT EICNAM</span>
                <span className="app-footer-separator">•</span>
                {process.env.NEXT_PUBLIC_ENV === "DEV" ? (
                    <span className="app-footer-dev">MODE DEV</span>
                ) : (<></>)}
                <span className="app-footer-version">Version {version}</span>
            </div>
            
            {devMode && (
                <div className="app-footer-dev-buttons">
                    <button
                        className={`test-mode-btn ${testMode ? 'active' : ''}`}
                        onClick={onToggleTestMode}
                        title="Ajouter des cours de test pour aujourd'hui (9h-17h)"
                    >
                        {testMode ? '✅ Test Aujourd\'hui' : '🧪 Test Aujourd\'hui'}
                    </button>
                    <button
                        className={`test-week-btn ${testWeekMode ? 'active' : ''}`}
                        onClick={onToggleTestWeek}
                        title="Générer une semaine complète de test (dimanche à dimanche, 7h30-20h)"
                    >
                        {testWeekMode ? '✅ Test Semaine' : '📅 Test Semaine'}
                    </button>
                </div>
            )}
        </footer>
    );
}
