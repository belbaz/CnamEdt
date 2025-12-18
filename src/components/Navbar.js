"use client";
import {useState, useEffect} from "react";
import PageHeader from "./PageHeader";
import WeekPicker from "./WeekPicker";
import FilterPanel from "./FilterPanel";
import Tooltip from "./Tooltip";
import "./Navbar.css";
import {isDevMode, useDevMode} from "../utils/env";
import {getSchoolYearLabel} from "../utils/dateUtils";

export default function Navbar({
                                   darkMode,
                                   oledMode,
                                   onToggleDarkMode,
                                   onToggleOledMode,
                                   availableWeeks,
                                   selectedWeek,
                                   onWeekChange,
                                   onRefresh,
                                   onToday,
                                   showRefreshButton = true,
                                   isMobile = false,
                                   onSettingsOpenChange,
                                   onToggleAllDays,
                                   allDaysCollapsed = false,
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
                                   subjects = [],
                                   selectedSubjects = [],
                                   onSubjectsChange = null,
                                   showOnlyExams = false,
                                   onShowOnlyExamsChange = null,
                                   showFilter = false,
                                   userInfo = null,
                                   isLoadingUser = false,
                                   showFullYear = false,
                                   onToggleFullYear = null
                               }) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [newHistoryCount, setNewHistoryCount] = useState(0);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [showTooltip, setShowTooltip] = useState({
        today: false,
        filter: false,
        options: false,
        history: false,
        fullYear: false
    });
    const [longPressTimer, setLongPressTimer] = useState(null);
    const devMode = useDevMode();

    // Calculer l'année scolaire pour l'afficher dans l'icône
    const schoolYear = getSchoolYearLabel();
    const [startYearShort, endYearShort] = schoolYear.split('-').map(y => y.slice(-2));

    // Vérifier les nouvelles modifications dans l'historique
    useEffect(() => {
        const checkNewHistory = async () => {
            try {
                const res = await fetch('/api/history', {cache: 'no-store'});
                const data = await res.json();
                if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                    // Récupérer la dernière date vue depuis localStorage
                    const lastSeenDate = localStorage.getItem('histo-last-seen-date');
                    const lastSeen = lastSeenDate ? parseInt(lastSeenDate, 10) : 0;

                    // Si jamais vu (lastSeen === 0), afficher juste "1" pour indiquer qu'il y a des modifications
                    if (lastSeen === 0) {
                        setNewHistoryCount(1);
                    } else {
                        // Sinon, compter les vrais nouveaux cours ajoutés depuis la dernière visite
                        const newCount = data.items.filter(item => {
                            const itemDate = new Date(item.first_seen).getTime();
                            return itemDate > lastSeen;
                        }).length;
                        setNewHistoryCount(newCount);
                    }
                }
            } catch (e) {
                // Erreur silencieuse
            }
        };

        checkNewHistory();
        // Vérifier toutes les minutes
        const interval = setInterval(checkNewHistory, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleShowHistory = () => {
        // Marquer comme vu en sauvegardant la date actuelle
        try {
            const now = Date.now();
            localStorage.setItem('histo-last-seen-date', now.toString());
            setNewHistoryCount(0);
        } catch (e) {
            // Erreur silencieuse
        }

        if (typeof window !== 'undefined') {
            window.location.href = '/histo';
        }
    };

    const handleClearCache = () => {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            // Clear localStorage
            localStorage.clear();

            // Clear sessionStorage
            sessionStorage.clear();

            // Clear all cookies
            document.cookie.split(";").forEach((cookie) => {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            });

            // Clear cache via Cache API if available
            if ('caches' in window) {
                caches.keys().then((names) => {
                    names.forEach((name) => {
                        caches.delete(name);
                    });
                });
            }

            // Reload the page
            window.location.reload();
        }
    };

    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;

                    // Hystérésis : deux seuils différents pour éviter le clignotement
                    if (scrollY > 90 && !isScrolled) {
                        setIsScrolled(true);
                    } else if (scrollY < 40 && isScrolled) {
                        setIsScrolled(false);
                    }

                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, {passive: true});
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isScrolled]);

    // Fermer le menu options quand on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOptionsMenuOpen && !event.target.closest('.options-menu-container')) {
                setIsOptionsMenuOpen(false);
            }
        };

        if (isOptionsMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOptionsMenuOpen]);

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
        <div className={`navbar-container ${isScrolled ? 'scrolled' : ''}`}>
            <div className="navbar-content">
                <PageHeader
                    darkMode={darkMode}
                    oledMode={oledMode}
                    onToggleDarkMode={onToggleDarkMode}
                    onToggleOledMode={onToggleOledMode}
                    isMobile={isMobile}
                    onSettingsOpenChange={onSettingsOpenChange}
                    compactMode={compactMode}
                    isPWAInstalled={isPWAInstalled}
                    currentVersion={currentVersion}
                    viewMode={viewMode}
                    onViewModeChange={onViewModeChange}
                    showTimeLabels={showTimeLabels}
                    onToggleTimeLabels={onToggleTimeLabels}
                    hide15MinSpacing={hide15MinSpacing}
                    onToggle15MinSpacing={onToggle15MinSpacing}
                    showTimeRemaining={showTimeRemaining}
                    onToggleTimeRemaining={onToggleTimeRemaining}
                    showTooltips={showTooltips}
                    onToggleTooltips={onToggleTooltips}
                    userInfo={userInfo}
                    isLoadingUser={isLoadingUser}
                />

                <div className="navbar-controls">
                    {!showFullYear && (
                        <div className="week-picker-container">
                            <WeekPicker
                                availableWeeks={availableWeeks}
                                selectedWeek={selectedWeek}
                                onWeekChange={onWeekChange}
                                onRefresh={onRefresh}
                                onToday={onToday}
                                showTooltips={showTooltips}
                                showRefreshButton={showRefreshButton}
                                isMobile={isMobile}
                                onToggleAllDays={onToggleAllDays}
                                allDaysCollapsed={allDaysCollapsed}
                                isOnline={typeof navigator !== 'undefined' ? navigator.onLine : true}
                            />
                        </div>
                    )}
                    {showFullYear && (
                        <div className="week-picker-container">
                            <button
                                onClick={onToggleFullYear}
                                style={{
                                    padding: '0.625rem 1rem',
                                    background: 'var(--primary-color)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--primary-color)',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    boxShadow: 'var(--shadow-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                aria-label="Désactiver la vue année scolaire"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                                </svg>
                                Année scolaire complète
                            </button>
                        </div>
                    )}
                    <div className="navbar-actions-right">
                        <div className="dev-buttons-container">
                            <div className="view-filter-group">
                                <Tooltip
                                    text="Retour à la semaine actuelle"
                                    show={showTooltip.today}
                                    enabled={showTooltips}
                                >
                                    <button
                                        className="today-btn today-btn-mobile"
                                        onClick={(e) => {
                                            handleClick('today');
                                            onToday();
                                        }}
                                        aria-label="Retour à la semaine actuelle"
                                        onMouseEnter={() => setShowTooltip(prev => ({...prev, today: true}))}
                                        onMouseLeave={() => setShowTooltip(prev => ({...prev, today: false}))}
                                        onTouchStart={() => handleLongPressStart('today')}
                                        onTouchEnd={() => handleLongPressEnd('today')}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                             xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor"
                                                  strokeWidth="2"/>
                                            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"
                                                  strokeLinecap="round"/>
                                            <circle cx="12" cy="15" r="1" fill="currentColor"/>
                                        </svg>
                                    </button>
                                </Tooltip>
                                {onToggleFullYear && (
                                    <Tooltip
                                        text={showFullYear ? "Voir la semaine" : "Voir toute l'année scolaire"}
                                        show={showTooltip.fullYear}
                                        enabled={showTooltips}
                                    >
                                        <button
                                            className={`view-filter-group-btn ${showFullYear ? 'active' : ''}`}
                                            onClick={(e) => {
                                                handleClick('fullYear');
                                                onToggleFullYear();
                                            }}
                                            aria-label={showFullYear ? "Voir la semaine" : "Voir toute l'année scolaire"}
                                            onMouseEnter={() => setShowTooltip(prev => ({...prev, fullYear: true}))}
                                            onMouseLeave={() => setShowTooltip(prev => ({...prev, fullYear: false}))}
                                            onTouchStart={() => handleLongPressStart('fullYear')}
                                            onTouchEnd={() => handleLongPressEnd('fullYear')}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                                 stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                                 strokeLinejoin="round">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                <line x1="16" y1="2" x2="16" y2="6"/>
                                                <line x1="8" y1="2" x2="8" y2="6"/>
                                                <line x1="3" y1="10" x2="21" y2="10"/>
                                                <path d="M7 14h.01"/>
                                                <path d="M12 14h.01"/>
                                                <path d="M17 14h.01"/>
                                                <path d="M7 18h.01"/>
                                                <path d="M12 18h.01"/>
                                                <path d="M17 18h.01"/>
                                            </svg>
                                        </button>
                                    </Tooltip>
                                )}
                                {showFilter && (
                                    <Tooltip
                                        text="Filtrer les cours"
                                        show={showTooltip.filter}
                                        enabled={showTooltips}
                                    >
                                        <div
                                            onMouseEnter={() => setShowTooltip(prev => ({...prev, filter: true}))}
                                            onMouseLeave={() => setShowTooltip(prev => ({...prev, filter: false}))}
                                            onTouchStart={() => handleLongPressStart('filter')}
                                            onTouchEnd={() => handleLongPressEnd('filter')}
                                            onMouseDown={() => handleClick('filter')}
                                        >
                                            <FilterPanel
                                                subjects={subjects}
                                                selectedSubjects={selectedSubjects}
                                                onSubjectsChange={onSubjectsChange || (() => {
                                                })}
                                                showOnlyExams={showOnlyExams}
                                                onShowOnlyExamsChange={onShowOnlyExamsChange}
                                                isVisible={showFilter}
                                            />
                                        </div>
                                    </Tooltip>
                                )}
                                {isDevMode() ?
                                    <Tooltip
                                        text="Afficher l'historique des modifications"
                                        show={showTooltip.history}
                                        enabled={showTooltips}
                                    >
                                        <div style={{position: "relative"}}>
                                            <button
                                                className="history-btn"
                                                onClick={(e) => {
                                                    handleClick('history');
                                                    handleShowHistory();
                                                }}
                                                aria-label="Afficher l'historique des modifications"
                                                onMouseEnter={() => setShowTooltip(prev => ({...prev, history: true}))}
                                                onMouseLeave={() => setShowTooltip(prev => ({...prev, history: false}))}
                                                onTouchStart={() => handleLongPressStart('history')}
                                                onTouchEnd={() => handleLongPressEnd('history')}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 500 500" fill="none"
                                                     xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                    <g transform="translate(0,500) scale(0.1,-0.1)" fill="currentColor"
                                                       stroke="none">
                                                        <path
                                                            d="M2221 4564 c-409 -56 -784 -229 -1108 -511 l-73 -64 0 111 c0 124 -12 165 -62 217 -86 89 -242 75 -313 -27 -41 -59 -47 -134 -43 -537 l3 -368 28 -48 c35 -60 87 -94 157 -104 30 -4 226 -6 435 -3 361 5 382 6 420 26 62 32 98 91 103 168 5 75 -17 127 -74 175 -49 40 -107 51 -267 51 l-132 1 68 65 c329 315 812 484 1268 444 413 -36 754 -194 1045 -484 292 -293 449 -632 484 -1048 18 -213 -17 -485 -87 -683 -144 -405 -463 -761 -847 -945 -133 -63 -217 -93 -356 -124 -508 -113 -1027 9 -1426 335 -109 89 -248 242 -325 357 -172 257 -256 508 -283 847 -12 157 -15 168 -42 207 -43 62 -104 90 -181 86 -77 -5 -135 -41 -170 -107 -20 -38 -23 -59 -23 -147 0 -283 82 -616 219 -887 358 -707 1071 -1147 1861 -1147 331 0 631 70 920 213 716 357 1160 1071 1160 1867 0 1048 -774 1929 -1813 2065 -145 19 -404 18 -546 -1z"/>
                                                        <path
                                                            d="M2430 3637 c-50 -16 -114 -84 -129 -137 -9 -34 -11 -194 -9 -655 l3 -610 25 -45 c16 -28 43 -55 74 -75 l49 -30 421 0 421 0 45 25 c118 66 145 217 57 317 -61 70 -78 73 -394 73 l-283 0 0 481 c0 352 -3 493 -12 523 -16 53 -81 118 -134 134 -49 14 -86 14 -134 -1z"/>
                                                    </g>
                                                </svg>
                                            </button>
                                            {newHistoryCount > 0 && (
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
                                                {newHistoryCount > 9 ? '9+' : newHistoryCount}
                                            </span>
                                            )}
                                        </div>
                                    </Tooltip>
                                    :
                                    ''
                                }
                                {/* Menu déroulant pour toutes les options */}
                                <div className="options-menu-container">
                                    <Tooltip
                                        text="Plus d'options"
                                        show={showTooltip.options && !isOptionsMenuOpen}
                                        enabled={showTooltips}
                                    >
                                        <button
                                            className="options-menu-toggle"
                                            onClick={(e) => {
                                                handleClick('options');
                                                setIsOptionsMenuOpen(!isOptionsMenuOpen);
                                            }}
                                            aria-label="Plus d'options"
                                            aria-expanded={isOptionsMenuOpen}
                                            onMouseEnter={() => setShowTooltip(prev => ({...prev, options: true}))}
                                            onMouseLeave={() => setShowTooltip(prev => ({...prev, options: false}))}
                                            onTouchStart={() => handleLongPressStart('options')}
                                            onTouchEnd={() => handleLongPressEnd('options')}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                                 xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                                                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                                                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                                            </svg>
                                        </button>
                                    </Tooltip>
                                    {isOptionsMenuOpen && (
                                        <div className="options-menu-dropdown">
                                            <button
                                                className="options-menu-item"
                                                onClick={() => {
                                                    onViewModeChange && onViewModeChange(viewMode === 'horizontal' ? 'vertical' : 'horizontal');
                                                    setIsOptionsMenuOpen(false);
                                                }}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                     xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                    {viewMode === 'horizontal' ? (
                                                        <>
                                                            <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor"
                                                                  strokeWidth="2" strokeLinecap="round"/>
                                                            <path d="M9 3v18M15 3v18" stroke="currentColor"
                                                                  strokeWidth="2" strokeLinecap="round"/>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <path d="M12 3v18M6 3v18M18 3v18" stroke="currentColor"
                                                                  strokeWidth="2" strokeLinecap="round"/>
                                                            <path d="M3 9h18M3 15h18" stroke="currentColor"
                                                                  strokeWidth="2" strokeLinecap="round"/>
                                                        </>
                                                    )}
                                                </svg>
                                                <span>{viewMode === 'horizontal' ? "Vue verticale" : "Vue horizontale"}</span>
                                            </button>
                                            {viewMode === 'horizontal' && (
                                                <button
                                                    className="options-menu-item"
                                                    onClick={() => {
                                                        onToggleAllDays();
                                                        setIsOptionsMenuOpen(false);
                                                    }}
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                        {allDaysCollapsed ? (
                                                            <path d="M6 9l6 6 6-6" stroke="currentColor"
                                                                  strokeWidth="2.2" strokeLinecap="round"
                                                                  strokeLinejoin="round"/>
                                                        ) : (
                                                            <path d="M6 15l6-6 6 6" stroke="currentColor"
                                                                  strokeWidth="2.2" strokeLinecap="round"
                                                                  strokeLinejoin="round"/>
                                                        )}
                                                    </svg>
                                                    <span>{allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {devMode && (
                                <div>
                                    <button
                                        className="dev-clear-cache-btn"
                                        onClick={handleClearCache}
                                        title="Vider le cache et les cookies (localhost uniquement)"
                                        aria-label="Vider le cache et les cookies"
                                    >
                                        DEV
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
