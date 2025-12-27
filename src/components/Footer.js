"use client";
import './Footer.css';
import {useState, useEffect} from 'react';
import Link from 'next/link';
import {useDevMode} from '../utils/env';
import {useI18n} from '../i18n/I18nContext';

export default function Footer({
                                   testMode = false,
                                   onToggleTestMode = null,
                                   testWeekMode = false,
                                   onToggleTestWeek = null
                               }) {
    const { t } = useI18n();
    const [version, setVersion] = useState(null);
    const [isDemoMode, setIsDemoMode] = useState(false); // Pour éviter les erreurs d'hydratation
    const devMode = useDevMode();
    
    // Vérifier le mode démo côté client uniquement (après le montage)
    useEffect(() => {
        const hostname = window.location.hostname;
        const envMode = process.env.NEXT_PUBLIC_MODE_DEMO === 'true';
        setIsDemoMode(hostname === 'demo-edt.vercel.app' || envMode);
    }, []);

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
                <Link href="/politique-confidentialite" className="app-footer-link">
                    {t('footer.privacy')}
                </Link>
                <div className="app-footer-content-first">
                    <span className="app-footer-text">EDT EICNAM</span>
                    {version && (
                        <>
                            <span className="app-footer-separator">•</span>
                            <span className="app-footer-version">{t('footer.version')} {version}</span>
                        </>
                    )}
                    {process.env.NEXT_PUBLIC_ENV === "DEV" && (
                        <>
                            <span className="app-footer-separator">•</span>
                            <span className="app-footer-dev">{t('footer.devMode')}</span>
                        </>
                    )}
                    {isDemoMode && (
                        <>
                            <span className="app-footer-separator">•</span>
                            <span className="app-footer-demo">{t('footer.demoMode')}</span>
                        </>
                    )}
                </div>
            </div>

            {devMode && (
                <div className="app-footer-dev-buttons">
                    <button
                        className={`test-mode-btn ${testMode ? 'active' : ''}`}
                        onClick={onToggleTestMode}
                        title={t('footer.testTodayTitle')}
                    >
                        {testMode ? t('footer.testTodayActive') : t('footer.testTodayInactive')}
                    </button>
                    <button
                        className={`test-week-btn ${testWeekMode ? 'active' : ''}`}
                        onClick={onToggleTestWeek}
                        title={t('footer.testWeekTitle')}
                    >
                        {testWeekMode ? t('footer.testWeekActive') : t('footer.testWeekInactive')}
                    </button>
                </div>
            )}
        </footer>
    );
}
