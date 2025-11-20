"use client";
import { useState, useRef, useEffect } from "react";
import SettingsMenu from "./SettingsMenu";
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
                                       showTimeRemaining = true,
                                       onToggleTimeRemaining = null,
                                       userInfo = null,
                                       historyCount = 0,
                                       onShowHistory = null
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
                        style={{ cursor: 'pointer', margin: 0 }}
                        title="Revenir à l'EDT (réinitialiser l'URL)"
                    >
                        Edt
                    </h1>

                    {/* Salutation utilisateur */}
                    {userInfo && userInfo.name && (
                        <div className="userInfo">
                            Bonjour {userInfo.lastName} {userInfo.name || ""}
                        </div>
                    )}
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
                        showTimeRemaining={showTimeRemaining}
                        onToggleTimeRemaining={onToggleTimeRemaining}
                    />
                    {typeof onShowHistory === 'function' && (
                        <div style={{ position: "relative" }}>
                            <button
                                className="history-btn"
                                onClick={onShowHistory}
                                title="Afficher l'historique des modifications"
                                aria-label="Afficher l'historique"
                            >
                                <svg width="18" height="18" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <g transform="translate(0,500) scale(0.1,-0.1)" fill="currentColor" stroke="none">
                                        <path d="M2221 4564 c-409 -56 -784 -229 -1108 -511 l-73 -64 0 111 c0 124 -12 165 -62 217 -86 89 -242 75 -313 -27 -41 -59 -47 -134 -43 -537 l3 -368 28 -48 c35 -60 87 -94 157 -104 30 -4 226 -6 435 -3 361 5 382 6 420 26 62 32 98 91 103 168 5 75 -17 127 -74 175 -49 40 -107 51 -267 51 l-132 1 68 65 c329 315 812 484 1268 444 413 -36 754 -194 1045 -484 292 -293 449 -632 484 -1048 18 -213 -17 -485 -87 -683 -144 -405 -463 -761 -847 -945 -133 -63 -217 -93 -356 -124 -508 -113 -1027 9 -1426 335 -109 89 -248 242 -325 357 -172 257 -256 508 -283 847 -12 157 -15 168 -42 207 -43 62 -104 90 -181 86 -77 -5 -135 -41 -170 -107 -20 -38 -23 -59 -23 -147 0 -283 82 -616 219 -887 358 -707 1071 -1147 1861 -1147 331 0 631 70 920 213 716 357 1160 1071 1160 1867 0 1048 -774 1929 -1813 2065 -145 19 -404 18 -546 -1z"/>
                                        <path d="M2430 3637 c-50 -16 -114 -84 -129 -137 -9 -34 -11 -194 -9 -655 l3 -610 25 -45 c16 -28 43 -55 74 -75 l49 -30 421 0 421 0 45 25 c118 66 145 217 57 317 -61 70 -78 73 -394 73 l-283 0 0 481 c0 352 -3 493 -12 523 -16 53 -81 118 -134 134 -49 14 -86 14 -134 -1z"/>
                                    </g>
                                </svg>
                            </button>
                            {historyCount > 0 && (
                                <span
                                    className="history-badge"
                                    style={{
                                        position: "absolute",
                                        top: "-4px",
                                        right: "-4px",
                                        background: "#ef4444",
                                        color: "white",
                                        borderRadius: "10px",
                                        minWidth: "18px",
                                        height: "18px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        padding: "0 5px",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                        border: "2px solid var(--bg-primary)",
                                        zIndex: 10
                                    }}
                                >
                                    {historyCount > 9 ? '9+' : historyCount}
                                </span>
                            )}
                        </div>
                    )}
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
