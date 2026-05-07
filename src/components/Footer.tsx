// @ts-nocheck
"use client";
import './Footer.css';
import {useState, useEffect} from 'react';
import Link from 'next/link';
import {useDevMode} from '../utils/env';
import {useI18n} from '../i18n/I18nContext';
import HoverTooltip from './HoverTooltip';

export default function Footer({
                                   testMode = false,
                                   onToggleTestMode = null,
                                   testWeekMode = false,
                                   onToggleTestWeek = null
                               }) {
    const { t } = useI18n();
    const [isDemoMode, setIsDemoMode] = useState(false);
    const devMode = useDevMode();
    
    // Vérifier le mode démo côté client uniquement (après le montage)
    useEffect(() => {
        const hostname = window.location.hostname;
        const envMode = process.env.NEXT_PUBLIC_MODE_DEMO === 'true';
        setIsDemoMode(hostname === 'demo-edt.vercel.app' || envMode);
    }, []);

    // Version depuis package.json
    const version = process.env.NEXT_PUBLIC_APP_VERSION || null;

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
                    <HoverTooltip text={t('footer.testTodayTitle')}>
                        <button
                            className={`test-mode-btn ${testMode ? 'active' : ''}`}
                            onClick={onToggleTestMode}
                            aria-label={t('footer.testTodayTitle')}
                        >
                            {testMode ? t('footer.testTodayActive') : t('footer.testTodayInactive')}
                        </button>
                    </HoverTooltip>
                    <HoverTooltip text={t('footer.testWeekTitle')}>
                        <button
                            className={`test-week-btn ${testWeekMode ? 'active' : ''}`}
                            onClick={onToggleTestWeek}
                            aria-label={t('footer.testWeekTitle')}
                        >
                            {testWeekMode ? t('footer.testWeekActive') : t('footer.testWeekInactive')}
                        </button>
                    </HoverTooltip>
                </div>
            )}
        </footer>
    );
}

