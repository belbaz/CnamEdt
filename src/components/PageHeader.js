"use client";
import { useState, useRef, useEffect } from "react";
import SettingsMenu from "./SettingsMenu";
import Tooltip from "./Tooltip";
import Spinner from "./Spinner";
import "./PageHeader.css";

export default function PageHeader({
                                       darkMode,
                                       oledMode,
                                       onToggleDarkMode,
                                       onToggleOledMode,
                                       isMobile = false,
                                       onSettingsOpenChange,
                                       compactMode,
                                       isPWAInstalled = false,
                                       currentVersion = null,
                                       viewMode = 'horizontal',
                                       onViewModeChange = null,
                                       showTimeLabels = true,
                                       onToggleTimeLabels = null,
                                       hide15MinSpacing = false,
                                       onToggle15MinSpacing = null,
                                       showTimeRemaining = true,
                                       onToggleTimeRemaining = null,
                                       showTooltips = true,
                                       onToggleTooltips = null,
                                       userInfo = null,
                                       isLoadingUser = false
                                   }) {
    const [showEasterEgg, setShowEasterEgg] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showTooltip, setShowTooltip] = useState({ settings: false, dashboard: false, login: false, theme: false });
    const [longPressTimer, setLongPressTimer] = useState(null);
    const clickCount = useRef(0);
    const clickTimer = useRef(null);
    const buttonRef = useRef(null);
    const userMenuRef = useRef(null);
    const isBlockedRef = useRef(false); // Protection contre les clics juste après activation/désactivation


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

    // Fermer le menu utilisateur si on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    // Gestion du long press pour les tooltips sur mobile
    const handleLongPressStart = (buttonId) => {
        const timer = setTimeout(() => {
            setShowTooltip(prev => ({ ...prev, [buttonId]: true }));
        }, 500); // 500ms pour le long press
        setLongPressTimer(timer);
    };

    const handleLongPressEnd = (buttonId) => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
        // Garder le tooltip affiché quelques instants après le relâchement
        setTimeout(() => {
            setShowTooltip(prev => ({ ...prev, [buttonId]: false }));
        }, 1500);
    };

    // Masquer le tooltip lors d'un clic
    const handleClick = (buttonId) => {
        setShowTooltip(prev => ({ ...prev, [buttonId]: false }));
        // Annuler le timer de long press s'il existe
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

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

                    {/* Salutation utilisateur avec menu */}
                    {isLoadingUser ? (
                        <div className="userInfo userInfoLoading">
                            <Spinner size="small" ariaLabel="Chargement de l'utilisateur..." />
                        </div>
                    ) : userInfo && userInfo.name ? (
                        <div 
                            ref={userMenuRef}
                            className="userInfo"
                            style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            title="Menu utilisateur"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span> {userInfo.lastName} {userInfo.name || ""}</span>
                                {userInfo.role && (
                                    <span className="userRoleLabel">{userInfo.role}</span>
                                )}
                                <svg 
                                    width="12" 
                                    height="12" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    xmlns="http://www.w3.org/2000/svg"
                                    style={{ 
                                        transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease'
                                    }}
                                >
                                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            {showUserMenu && (
                                <div className="userMenuDropdown">
                                    <button
                                        className="userMenuItem"
                                        onClick={() => {
                                            window.location.href = '/dashboard';
                                            setShowUserMenu(false);
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Tableau de bord
                                    </button>
                                    <button
                                        className="userMenuItem userMenuItemLogout"
                                        onClick={async () => {
                                            setShowUserMenu(false);
                                            try {
                                                await fetch("/api/logout", { method: "POST" });
                                                window.location.href = "/";
                                            } catch (error) {
                                                console.error("[PageHeader] Erreur déconnexion:", error);
                                            }
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Se déconnecter
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
                <div className="header-actions">
                    <Tooltip 
                        text="Paramètres"
                        show={showTooltip.settings}
                        enabled={showTooltips}
                    >
                        <div
                            onMouseEnter={() => setShowTooltip(prev => ({ ...prev, settings: true }))}
                            onMouseLeave={() => setShowTooltip(prev => ({ ...prev, settings: false }))}
                            onTouchStart={() => handleLongPressStart('settings')}
                            onTouchEnd={() => handleLongPressEnd('settings')}
                            onMouseDown={() => handleClick('settings')}
                        >
                            <SettingsMenu
                                onOpenChange={onSettingsOpenChange}
                                compactMode={compactMode}
                                isMobile={isMobile}
                                isPWAInstalled={isPWAInstalled}
                                currentVersion={currentVersion}
                                showTimeLabels={showTimeLabels}
                                onToggleTimeLabels={onToggleTimeLabels}
                                hide15MinSpacing={hide15MinSpacing}
                                onToggle15MinSpacing={onToggle15MinSpacing}
                                showTimeRemaining={showTimeRemaining}
                                onToggleTimeRemaining={onToggleTimeRemaining}
                                showTooltips={showTooltips}
                                onToggleTooltips={onToggleTooltips}
                            />
                        </div>
                    </Tooltip>
                    {isLoadingUser ? (
                        <button
                            className="login-btn user-loading-btn"
                            disabled
                            aria-label="Chargement..."
                        >
                            <Spinner size="medium" ariaLabel="Chargement..." />
                        </button>
                    ) : userInfo ? (
                        <Tooltip 
                            text="Tableau de bord"
                            show={showTooltip.dashboard}
                            enabled={showTooltips}
                        >
                            <button
                                className="dashboard-btn"
                                onClick={(e) => {
                                    handleClick('dashboard');
                                    window.location.href = '/dashboard';
                                }}
                                aria-label="Tableau de bord"
                                onMouseEnter={() => setShowTooltip(prev => ({ ...prev, dashboard: true }))}
                                onMouseLeave={() => setShowTooltip(prev => ({ ...prev, dashboard: false }))}
                                onTouchStart={() => handleLongPressStart('dashboard')}
                                onTouchEnd={() => handleLongPressEnd('dashboard')}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </Tooltip>
                    ) : (
                        <Tooltip 
                            text="Se connecter"
                            show={showTooltip.login}
                            enabled={showTooltips}
                        >
                            <button
                                className="login-btn"
                                onClick={(e) => {
                                    handleClick('login');
                                    window.location.href = '/login';
                                }}
                                aria-label="Se connecter"
                                onMouseEnter={() => setShowTooltip(prev => ({ ...prev, login: true }))}
                                onMouseLeave={() => setShowTooltip(prev => ({ ...prev, login: false }))}
                                onTouchStart={() => handleLongPressStart('login')}
                                onTouchEnd={() => handleLongPressEnd('login')}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </Tooltip>
                    )}
                    <Tooltip 
                        text={darkMode ? (oledMode ? "Mode OLED actif" : "Mode sombre") : "Mode sombre"}
                        show={showTooltip.theme}
                        enabled={showTooltips}
                    >
                        <div style={{ position: 'relative' }}>
                            <button
                                ref={buttonRef}
                                className={`theme-toggle ${oledMode ? 'oled-active' : ''}`}
                                onClick={(e) => {
                                    handleClick('theme');
                                    handleThemeToggleClick(e);
                                }}
                                aria-label={darkMode ? (oledMode ? "Mode OLED actif" : "Mode sombre") : "Mode sombre"}
                                onMouseEnter={() => setShowTooltip(prev => ({ ...prev, theme: true }))}
                                onMouseLeave={() => setShowTooltip(prev => ({ ...prev, theme: false }))}
                                onTouchStart={() => handleLongPressStart('theme')}
                                onTouchEnd={() => handleLongPressEnd('theme')}
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
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
