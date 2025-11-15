"use client";
import { useState, useRef, useEffect } from "react";
import SettingsMenu from "./SettingsMenu";
import FilterPanel from "./FilterPanel";
import "./PageHeader.css";

export default function PageHeader({
                                       darkMode,
                                       oledMode,
                                       onToggleDarkMode,
                                       onToggleOledMode,
                                       isMobile = false,
                                       onSettingsOpenChange,
                                       compactMode,
                                       isNative = false,
                                       currentVersion = null,
                                       onCheckUpdates = null,
                                       viewMode = 'horizontal',
                                       onViewModeChange = null,
                                       showTimeLabels = true,
                                       onToggleTimeLabels = null,
                                       hide15MinSpacing = false,
                                       onToggle15MinSpacing = null,
                                       subjects = [],
                                       selectedSubjects = [],
                                       onSubjectsChange = null,
                                       showOnlyExams = false,
                                       onShowOnlyExamsChange = null,
                                       showFilter = false
                                   }) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [showEasterEgg, setShowEasterEgg] = useState(false);
    const clickCount = useRef(0);
    const clickTimer = useRef(null);
    const buttonRef = useRef(null);
    const isBlockedRef = useRef(false); // Protection contre les clics juste après activation/désactivation

    const handleDownloadAPK = async () => {
        setIsDownloading(true);
        try {
            window.location.href = '/apk';
        } finally {
            setIsDownloading(false);
        }
    };

    // Gérer les 5 clics rapides sur la lune (uniquement en dark mode)
    const handleThemeToggleClick = (e) => {
        // Si bloqué (juste après un toggle OLED), ignorer le clic
        if (isBlockedRef.current) {
            return;
        }

        // Si pas en dark mode, comportement normal
        if (!darkMode) {
            onToggleDarkMode();
            return;
        }

        // En dark mode, on compte les clics
        clickCount.current += 1;

        // Si on atteint 5 clics, toggle le mode OLED (activation OU désactivation)
        if (clickCount.current >= 5) {
            // Annuler le timer de toggle normal s'il existe
            if (clickTimer.current) {
                clearTimeout(clickTimer.current);
                clickTimer.current = null;
            }
            
            // Toggle le mode OLED
            onToggleOledMode();
            
            // Afficher l'easter egg
            setShowEasterEgg(true);
            setTimeout(() => setShowEasterEgg(false), 4000);
            
            // Reset le compteur
            clickCount.current = 0;
            
            // Bloquer les clics pendant 1 seconde
            isBlockedRef.current = true;
            setTimeout(() => {
                isBlockedRef.current = false;
            }, 1000);
            
            return;
        }

        // Si c'est le premier clic, on démarre un petit délai avant le toggle normal
        if (clickCount.current === 1) {
            // On attend 300ms pour voir si d'autres clics arrivent
            clickTimer.current = setTimeout(() => {
                // Si on n'a pas atteint 5 clics, faire le toggle normal
                if (clickCount.current < 5) {
                    onToggleDarkMode();
                }
                clickCount.current = 0;
                clickTimer.current = null;
            }, 300);
        } else {
            // Si on clique à nouveau rapidement, on annule le timer de toggle normal
            // et on démarre un timer de 3 secondes pour reset le compteur
            if (clickTimer.current) {
                clearTimeout(clickTimer.current);
            }
            
            // Timer de 3 secondes pour reset le compteur si on n'atteint pas 5 clics
            clickTimer.current = setTimeout(() => {
                clickCount.current = 0;
                clickTimer.current = null;
            }, 3000);
        }
    };

    useEffect(() => {
        return () => {
            if (clickTimer.current) {
                clearTimeout(clickTimer.current);
            }
        };
    }, []);

    return (
        <div className="page-header">
            <div className="header-content">
                <div className="title-container">
                    <h1 
                        className="page-title" 
                        onClick={() => { try { window.location.href = '/'; } catch { window.location.reload(); } }}
                        style={{ cursor: 'pointer' }}
                        title="Revenir à l'EDT (réinitialiser l'URL)"
                    >
                        Edt
                        <img src="/cnam.svg" alt="Logo CNAM" className="cnam-logo"
                             aria-hidden="true"/>
                    </h1>

                </div>
                <div className="header-actions">
                    {!isNative && (
                        <button
                            className="download-apk-button"
                            onClick={handleDownloadAPK}
                            disabled={isDownloading}
                            title="Télécharger l'APK Android"
                        >
                            {isDownloading ? '⏳' : '📱'}
                        </button>
                    )}
                    <FilterPanel
                        subjects={subjects}
                        selectedSubjects={selectedSubjects}
                        onSubjectsChange={onSubjectsChange || (() => {})}
                        showOnlyExams={showOnlyExams}
                        onShowOnlyExamsChange={onShowOnlyExamsChange}
                        isVisible={showFilter}
                    />
                    <SettingsMenu
                        onOpenChange={onSettingsOpenChange}
                        compactMode={compactMode}
                        isMobile={isMobile}
                        isNative={isNative}
                        currentVersion={currentVersion}
                        onCheckUpdates={onCheckUpdates}
                        showTimeLabels={showTimeLabels}
                        onToggleTimeLabels={onToggleTimeLabels}
                        hide15MinSpacing={hide15MinSpacing}
                        onToggle15MinSpacing={onToggle15MinSpacing}
                    />
                    <button
                        className="view-toggle"
                        onClick={() => onViewModeChange && onViewModeChange(viewMode === 'horizontal' ? 'vertical' : 'horizontal')}
                        title={viewMode === 'horizontal' ? "Vue verticale" : "Vue horizontale"}
                        aria-label={viewMode === 'horizontal' ? "Vue verticale" : "Vue horizontale"}
                    >
                        {viewMode === 'horizontal' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M9 3v18M15 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M12 3v18M6 3v18M18 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M3 9h18M3 15h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        )}
                    </button>
                    <div style={{ position: 'relative' }}>
                        <button
                            ref={buttonRef}
                            className={`theme-toggle ${oledMode ? 'oled-active' : ''}`}
                            onClick={handleThemeToggleClick}
                            title={darkMode ? (oledMode ? "Mode OLED actif" : "Mode sombre") : "Mode sombre"}
                        >
                            {darkMode ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <circle cx="12" cy="12" r="4.5" fill={oledMode ? "#000000" : "#fbbf24"} stroke={oledMode ? "#ffffff" : "#f59e0b"} strokeWidth="1"/>
                                    <path d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05l-2.12-2.12" stroke={oledMode ? "#ffffff" : "#f59e0b"} strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            ) : (
                                "🌙"
                            )}
                        </button>
                        {showEasterEgg && (
                            <div className="easter-egg-notification">
                                <div className="easter-egg-content">
                                    <div className="easter-egg-particles">
                                        <div className="easter-egg-particle"></div>
                                        <div className="easter-egg-particle"></div>
                                        <div className="easter-egg-particle"></div>
                                        <div className="easter-egg-particle"></div>
                                        <div className="easter-egg-particle"></div>
                                    </div>
                                    <span className="easter-egg-icon">{oledMode ? '🌙' : '💡'}</span>
                                    <span className="easter-egg-text">Mode OLED {oledMode ? 'activé' : 'désactivé'} !</span>
                                    <span className="easter-egg-subtitle">
                                        {oledMode 
                                            ? 'Économie d\'énergie pour écran OLED 🔋' 
                                            : 'Retour au mode sombre classique'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
