// @ts-nocheck
"use client";
import {useState, useRef, useEffect} from "react";
import SettingsMenu from "./SettingsMenu";
import Tooltip from "./Tooltip";
import Spinner from "./Spinner";
import DemoModeModal from "./DemoModeModal";
import {useI18n} from "../i18n/I18nContext";
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
                                       colorPosition = 'background',
                                       onColorPositionChange = null,
                                       colorBackgroundOpacity = 0.6,
                                       onColorBackgroundOpacityChange = null,
                                       timePassedOverlayIntensity = 0.5,
                                       onTimePassedOverlayIntensityChange = null,
                                       userInfo = null,
                                       isLoadingUser = false
                                   }) {
    const [showEasterEgg, setShowEasterEgg] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showTooltip, setShowTooltip] = useState({
        settings: false,
        agenda: false,
        dashboard: false,
        login: false,
        theme: false
    });
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false); // Pour éviter les erreurs d'hydratation
    const [longPressTimer, setLongPressTimer] = useState(null);
    const clickCount = useRef(0);
    const clickTimer = useRef(null);
    const buttonRef = useRef(null);
    const userMenuRef = useRef(null);
    const isBlockedRef = useRef(false); // Protection contre les clics juste après activation/désactivation
    const { t } = useI18n();

    // Vérifier le mode démo côté client uniquement (après le montage)
    useEffect(() => {
        const hostname = window.location.hostname;
        const envMode = process.env.NEXT_PUBLIC_MODE_DEMO === 'true';
        setIsDemoMode(hostname === 'demo-edt.vercel.app' || envMode);
    }, []);


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
            setShowTooltip(prev => ({...prev, [buttonId]: true}));
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
            setShowTooltip(prev => ({...prev, [buttonId]: false}));
        }, 1500);
    };

    // Masquer le tooltip lors d'un clic
    const handleClick = (buttonId) => {
        setShowTooltip(prev => ({...prev, [buttonId]: false}));
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
                        onClick={() => {
                            try {
                                window.location.href = '/';
                            } catch {
                                window.location.reload();
                            }
                        }}
                        style={{cursor: 'pointer', margin: 0}}
                        title={t('pageHeader.backToEDT')}
                    >
                        Edt
                    </h1>

                    {/* Badge Mode démo */}
                    {isDemoMode && (
                        <>
                            <div
                                className="demo-mode-badge"
                                onClick={() => setShowDemoModal(true)}
                                title={t('pageHeader.demoModeInfo')}
                            >
                                {t('pageHeader.demoMode')}
                            </div>
                            <DemoModeModal
                                isOpen={showDemoModal}
                                onClose={() => setShowDemoModal(false)}
                            />
                        </>
                    )}

                    {/* Salutation utilisateur avec menu */}
                    {isLoadingUser ? (
                        <div className="userInfo userInfoLoading">
                            {/*<p style={{margin: "0"}}>Chargement</p>*/}
                            <Spinner size="small" ariaLabel={t('pageHeader.loadingUser')}/>
                        </div>
                    ) : userInfo && userInfo.name ? (
                        <div
                            ref={userMenuRef}
                            className="userInfo"
                            style={{position: 'relative', cursor: 'pointer'}}
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            title={t('pageHeader.userMenu')}
                        >
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                     xmlns="http://www.w3.org/2000/svg" style={{opacity: 0.7}}>
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor"
                                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
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
                                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                          strokeLinejoin="round"/>
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
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"
                                                  strokeLinecap="round" strokeLinejoin="round"/>
                                            <rect x="14" y="3" width="7" height="7" stroke="currentColor"
                                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <rect x="3" y="14" width="7" height="7" stroke="currentColor"
                                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <rect x="14" y="14" width="7" height="7" stroke="currentColor"
                                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        {t('pageHeader.dashboard')}
                                    </button>
                                    <button
                                        className="userMenuItem userMenuItemLogout"
                                        onClick={async () => {
                                            setShowUserMenu(false);
                                            try {
                                                await fetch("/api/logout", {method: "POST"});
                                                window.location.href = "/";
                                            } catch (error) {
                                                console.error("[PageHeader] Erreur déconnexion:", error);
                                            }
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                                  strokeLinejoin="round"/>
                                        </svg>
                                        {t('pageHeader.logout')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            ref={userMenuRef}
                            className="userInfo userInfoGuest"
                            style={{position: 'relative', cursor: 'pointer'}}
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            title={t('pageHeader.guestMenu')}
                        >
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                     xmlns="http://www.w3.org/2000/svg" style={{opacity: 0.7}}>
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor"
                                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span>{t('pageHeader.guestMenu')}</span>
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
                                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                          strokeLinejoin="round"/>
                                </svg>
                            </div>
                            {showUserMenu && (
                                <div className="userMenuDropdown">
                                    <button
                                        className="userMenuItem"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = '/login';
                                            setShowUserMenu(false);
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
                                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                                  strokeLinejoin="round"/>
                                        </svg>
                                        {t('pageHeader.login')}
                                    </button>
                                    <button
                                        className="userMenuItem userMenuItemSignup"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = '/signup';
                                            setShowUserMenu(false);
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor"
                                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"
                                                    strokeLinecap="round" strokeLinejoin="round"/>
                                            <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2"
                                                  strokeLinecap="round" strokeLinejoin="round"/>
                                            <line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="2"
                                                  strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        {t('pageHeader.signup')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="header-actions">
                    <Tooltip
                        text={t('pageHeader.settings')}
                        show={showTooltip.settings}
                        enabled={showTooltips}
                    >
                        <div
                            onMouseEnter={() => setShowTooltip(prev => ({...prev, settings: true}))}
                            onMouseLeave={() => setShowTooltip(prev => ({...prev, settings: false}))}
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
                                colorPosition={colorPosition}
                                onColorPositionChange={onColorPositionChange}
                                colorBackgroundOpacity={colorBackgroundOpacity}
                                onColorBackgroundOpacityChange={onColorBackgroundOpacityChange}
                                timePassedOverlayIntensity={timePassedOverlayIntensity}
                                onTimePassedOverlayIntensityChange={onTimePassedOverlayIntensityChange}
                            />
                        </div>
                    </Tooltip>
                    <Tooltip
                        text={t('pageHeader.agenda')}
                        show={showTooltip.agenda}
                        enabled={showTooltips}
                    >
                        <button
                            className="agenda-btn"
                            onClick={(e) => {
                                handleClick('agenda');
                                window.location.href = '/agenda';
                            }}
                            aria-label={t('pageHeader.agenda')}
                            onMouseEnter={() => setShowTooltip(prev => ({...prev, agenda: true}))}
                            onMouseLeave={() => setShowTooltip(prev => ({...prev, agenda: false}))}
                            onTouchStart={() => handleLongPressStart('agenda')}
                            onTouchEnd={() => handleLongPressEnd('agenda')}
                        >
                            <img
                                src="/agenda.svg"
                                alt={t('pageHeader.agenda')}
                                width="24"
                                height="24"
                                style={{display: 'block'}}
                            />
                        </button>
                    </Tooltip>
                    {isLoadingUser ? (
                        <button
                            className="login-btn user-loading-btn"
                            disabled
                            aria-label={t('pageHeader.loading')}
                        >
                            <Spinner size="medium" ariaLabel={t('pageHeader.loading')}/>
                        </button>
                    ) : userInfo ? (
                        <Tooltip
                            text={t('pageHeader.dashboard')}
                            show={showTooltip.dashboard}
                            enabled={showTooltips}
                        >
                            <button
                                className="dashboard-btn"
                                onClick={(e) => {
                                    handleClick('dashboard');
                                    window.location.href = '/dashboard';
                                }}
                                aria-label={t('pageHeader.dashboard')}
                                onMouseEnter={() => setShowTooltip(prev => ({...prev, dashboard: true}))}
                                onMouseLeave={() => setShowTooltip(prev => ({...prev, dashboard: false}))}
                                onTouchStart={() => handleLongPressStart('dashboard')}
                                onTouchEnd={() => handleLongPressEnd('dashboard')}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                     xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"
                                          strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"
                                          strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2"
                                          strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2"
                                          strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </Tooltip>
                    ) : (
                        <Tooltip
                            text={t('pageHeader.login')}
                            show={showTooltip.login}
                            enabled={showTooltips}
                        >
                            <button
                                className="login-btn"
                                onClick={(e) => {
                                    handleClick('login');
                                    window.location.href = '/login';
                                }}
                                aria-label={t('pageHeader.login')}
                                onMouseEnter={() => setShowTooltip(prev => ({...prev, login: true}))}
                                onMouseLeave={() => setShowTooltip(prev => ({...prev, login: false}))}
                                onTouchStart={() => handleLongPressStart('login')}
                                onTouchEnd={() => handleLongPressEnd('login')}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                     xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor"
                                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </Tooltip>
                    )}
                    <Tooltip
                        text={
                            darkMode
                                ? (oledMode ? t('pageHeader.themeOLED') : t('pageHeader.themeDark'))
                                : t('pageHeader.themeLight')
                        }
                        show={showTooltip.theme}
                        enabled={showTooltips}
                    >
                        <div style={{position: 'relative'}}>
                            <button
                                ref={buttonRef}
                                className={`theme-toggle ${oledMode ? 'oled-active' : ''}`}
                                onClick={(e) => {
                                    handleClick('theme');
                                    handleThemeToggleClick(e);
                                }}
                                aria-label={
                                    darkMode
                                        ? (oledMode ? t('pageHeader.themeOLED') : t('pageHeader.themeDark'))
                                        : t('pageHeader.themeLight')
                                }
                                onMouseEnter={() => setShowTooltip(prev => ({...prev, theme: true}))}
                                onMouseLeave={() => setShowTooltip(prev => ({...prev, theme: false}))}
                                onTouchStart={() => handleLongPressStart('theme')}
                                onTouchEnd={() => handleLongPressEnd('theme')}
                            >
                                {darkMode ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <circle cx="12" cy="12" r="4.5" fill={oledMode ? "#000000" : "#fbbf24"}
                                                stroke={oledMode ? "#ffffff" : "#f59e0b"} strokeWidth="1"/>
                                        <path
                                            d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05l-2.12-2.12"
                                            stroke={oledMode ? "#ffffff" : "#f59e0b"} strokeWidth="2"
                                            strokeLinecap="round"/>
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
                                        <span
                                            className="easter-egg-text">{oledMode ? t('pageHeader.oledActivated') : t('pageHeader.oledDeactivated')}</span>
                                        <span className="easter-egg-subtitle">
                                            {oledMode
                                                ? t('pageHeader.oledEnergy')
                                                : t('pageHeader.oledBack')}
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

