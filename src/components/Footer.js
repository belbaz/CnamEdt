"use client";
import './Footer.css';
import {useState, useEffect} from 'react';
import Link from 'next/link';
import {useDevMode} from '../utils/env';

export default function Footer({
    testMode = false,
    onToggleTestMode = null,
    testWeekMode = false,
    onToggleTestWeek = null
}) {
    const [version, setVersion] = useState(null);
    const devMode = useDevMode();

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const res = await fetch('/api/version');
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                const data = await res.json();
                if (data.version) {
                    setVersion(data.version);
                }
            } catch (err) {
                console.error("Failed to fetch version:", err);
                // Ne pas afficher d'erreur, simplement ne pas afficher la version
                setVersion(null);
            }
        };

        fetchVersion();
    }, []); // ← exécute une seule fois au montage

    return (
        <footer className="app-footer">
            <div className="app-footer-content">
                <span className="app-footer-text">EDT EICNAM</span>
                {version && (
                    <>
                        <span className="app-footer-separator">•</span>
                        <span className="app-footer-version">Version {version}</span>
                    </>
                )}
                {process.env.NEXT_PUBLIC_ENV === "DEV" && (
                    <>
                        <span className="app-footer-separator">•</span>
                        <span className="app-footer-dev">MODE DEV</span>
                    </>
                )}
                <span className="app-footer-separator">•</span>
                <Link href="/politique-confidentialite" className="app-footer-link">
                    Politique de confidentialité
                </Link>
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
