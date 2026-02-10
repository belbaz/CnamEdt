"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import PageHeader from "./PageHeader";
import WeekPicker from "./WeekPicker";
import FilterPanel from "./FilterPanel";
import Tooltip from "./Tooltip";
import "./Navbar.css";
import { useDevMode } from "../utils/env";
import { getSchoolYearLabel } from "../utils/dateUtils";
import { useI18n } from "../i18n/I18nContext";
import { fetchICSEvents, loadEventsFromCache } from "../services/icsService";

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
    colorPosition = 'background',
    onColorPositionChange = null,
    colorBackgroundOpacity = 0.6,
    onColorBackgroundOpacityChange = null,
    timePassedOverlayIntensity = 0.5,
    onTimePassedOverlayIntensityChange = null,
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
    const [showTooltip, setShowTooltip] = useState({
        today: false,
        filter: false,
        history: false,
        fullYear: false,
        examens: false,
        notes: false,
        viewMode: false
    });
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [hasUpcomingExams, setHasUpcomingExams] = useState(false);
    const devMode = useDevMode();
    const { t } = useI18n();
    const pathname = usePathname();
    const router = useRouter();
    const isExamensPage = pathname === '/examens';

    // Calculer l'année scolaire pour l'afficher dans l'icône
    const schoolYear = getSchoolYearLabel();
    const [startYearShort, endYearShort] = schoolYear.split('-').map(y => y.slice(-2));

    // Vérifier les nouvelles modifications dans l'historique
    useEffect(() => {
        const checkNewHistory = async () => {
            try {
                const res = await fetch('/api/history', { cache: 'no-store' });
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

    // Vérifier s'il y a des examens dans moins d'un mois
    useEffect(() => {
        const checkUpcomingExams = async () => {
            try {
                // D'abord essayer le cache local
                const cached = loadEventsFromCache();
                let events = cached?.events || [];

                // Si pas de cache ou cache vide, récupérer depuis l'API
                if (!events || events.length === 0) {
                    try {
                        const result = await fetchICSEvents();
                        if (result && result.events) {
                            events = result.events;
                        }
                    } catch (err) {
                        // Erreur silencieuse, on continue avec le cache vide
                        console.warn('[Navbar] Erreur lors de la récupération des examens:', err.message);
                    }
                }

                // Vérifier s'il y a des examens dans les 30 prochains jours
                const now = new Date();
                const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                const hasExams = events.some(event => {
                    const description = event.description || "";
                    const isExam = description.toUpperCase().includes("EXAMEN");
                    if (!isExam) return false;

                    const examDate = new Date(event.start);
                    return examDate > now && examDate <= oneMonthFromNow;
                });

                setHasUpcomingExams(hasExams);
            } catch (e) {
                // Erreur silencieuse
                setHasUpcomingExams(false);
            }
        };

        // Ne vérifier que si on n'est pas sur la page examens
        if (!isExamensPage) {
            checkUpcomingExams();
            // Vérifier toutes les heures
            const interval = setInterval(checkUpcomingExams, 60 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [isExamensPage]);

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

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isScrolled]);


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
                    colorPosition={colorPosition}
                    onColorPositionChange={onColorPositionChange}
                    colorBackgroundOpacity={colorBackgroundOpacity}
                    onColorBackgroundOpacityChange={onColorBackgroundOpacityChange}
                    timePassedOverlayIntensity={timePassedOverlayIntensity}
                    onTimePassedOverlayIntensityChange={onTimePassedOverlayIntensityChange}
                    userInfo={userInfo}
                    isLoadingUser={isLoadingUser}
                />

                {!isExamensPage && (
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
                                    aria-label={t('navbar.back')}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    {t('navbar.back')}
                                </button>
                            </div>
                        )}
                        <div className="navbar-actions-right">
                            <div className="dev-buttons-container">
                                <div className="view-filter-group">
                                    <Tooltip
                                        text={t('navbar.today')}
                                        show={showTooltip.today}
                                        enabled={showTooltips}
                                    >
                                        <button
                                            className="today-btn today-btn-mobile"
                                            onClick={(e) => {
                                                handleClick('today');
                                                onToday();
                                            }}
                                            aria-label={t('navbar.today')}
                                            onMouseEnter={() => setShowTooltip(prev => ({ ...prev, today: true }))}
                                            onMouseLeave={() => setShowTooltip(prev => ({ ...prev, today: false }))}
                                            onTouchStart={() => handleLongPressStart('today')}
                                            onTouchEnd={() => handleLongPressEnd('today')}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                                xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor"
                                                    strokeWidth="2" />
                                                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"
                                                    strokeLinecap="round" />
                                                <circle cx="12" cy="15" r="1" fill="currentColor" />
                                            </svg>
                                        </button>
                                    </Tooltip>
                                    <Tooltip
                                        text={t('navbar.notes')}
                                        show={showTooltip.notes}
                                        enabled={showTooltips}
                                    >
                                        <button
                                            className="view-filter-group-btn"
                                            onClick={(e) => {
                                                handleClick('notes');
                                                router.push('/galao');
                                            }}
                                            aria-label={t('navbar.notes')}
                                            onMouseEnter={() => setShowTooltip(prev => ({ ...prev, notes: true }))}
                                            onMouseLeave={() => setShowTooltip(prev => ({ ...prev, notes: false }))}
                                            onTouchStart={() => handleLongPressStart('notes')}
                                            onTouchEnd={() => handleLongPressEnd('notes')}
                                        >
                                            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🎓</span>
                                        </button>
                                    </Tooltip>
                                    {/* Bouton pour changer la vue (horizontal/vertical) */}
                                    {onViewModeChange && (
                                        <Tooltip
                                            text={viewMode === 'horizontal' ? t('navbar.verticalView') : t('navbar.horizontalView')}
                                            show={showTooltip.viewMode}
                                            enabled={showTooltips}
                                        >
                                            <button
                                                className="view-filter-group-btn"
                                                onClick={(e) => {
                                                    handleClick('viewMode');
                                                    onViewModeChange(viewMode === 'horizontal' ? 'vertical' : 'horizontal');
                                                }}
                                                aria-label={viewMode === 'horizontal' ? t('navbar.verticalView') : t('navbar.horizontalView')}
                                                onMouseEnter={() => setShowTooltip(prev => ({ ...prev, viewMode: true }))}
                                                onMouseLeave={() => setShowTooltip(prev => ({ ...prev, viewMode: false }))}
                                                onTouchStart={() => handleLongPressStart('viewMode')}
                                                onTouchEnd={() => handleLongPressEnd('viewMode')}
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                                    xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                    {viewMode === 'horizontal' ? (
                                                        // Icône pour passer en vue verticale - lignes verticales simples
                                                        <>
                                                            <line x1="7" y1="4" x2="7" y2="20" stroke="currentColor"
                                                                strokeWidth="2.5" strokeLinecap="round" />
                                                            <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor"
                                                                strokeWidth="2.5" strokeLinecap="round" />
                                                            <line x1="17" y1="4" x2="17" y2="20" stroke="currentColor"
                                                                strokeWidth="2.5" strokeLinecap="round" />
                                                        </>
                                                    ) : (
                                                        // Icône pour passer en vue horizontale - lignes horizontales simples
                                                        <>
                                                            <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor"
                                                                strokeWidth="2.5" strokeLinecap="round" />
                                                            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor"
                                                                strokeWidth="2.5" strokeLinecap="round" />
                                                            <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor"
                                                                strokeWidth="2.5" strokeLinecap="round" />
                                                        </>
                                                    )}
                                                </svg>
                                            </button>
                                        </Tooltip>
                                    )}
                                    {/* Bouton examens si des examens sont proches */}
                                    {hasUpcomingExams && (
                                        <Tooltip
                                            text={t('navbar.examens') || "Examens à venir"}
                                            show={showTooltip.examens}
                                            enabled={showTooltips}
                                        >
                                            <button
                                                className="view-filter-group-btn"
                                                onClick={(e) => {
                                                    handleClick('examens');
                                                    router.push('/examens');
                                                }}
                                                aria-label={t('navbar.examens') || "Voir les examens"}
                                                onMouseEnter={() => setShowTooltip(prev => ({ ...prev, examens: true }))}
                                                onMouseLeave={() => setShowTooltip(prev => ({ ...prev, examens: false }))}
                                                onTouchStart={() => handleLongPressStart('examens')}
                                                onTouchEnd={() => handleLongPressEnd('examens')}
                                            >
                                                <img
                                                    src="/examen-time.svg"
                                                    alt={t('navbar.examens') || "Examens"}
                                                    width="24"
                                                    height="24"
                                                    style={{ display: 'block' }}
                                                />
                                            </button>
                                        </Tooltip>
                                    )}
                                    {onToggleFullYear && (
                                        <Tooltip
                                            text={showFullYear ? t('navbar.fullYearOff') : t('navbar.fullYear')}
                                            show={showTooltip.fullYear}
                                            enabled={showTooltips}
                                        >
                                            <button
                                                className={`view-filter-group-btn ${showFullYear ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    handleClick('fullYear');
                                                    onToggleFullYear();
                                                }}
                                                aria-label={showFullYear ? t('navbar.fullYearOff') : t('navbar.fullYear')}
                                                onMouseEnter={() => setShowTooltip(prev => ({ ...prev, fullYear: true }))}
                                                onMouseLeave={() => setShowTooltip(prev => ({ ...prev, fullYear: false }))}
                                                onTouchStart={() => handleLongPressStart('fullYear')}
                                                onTouchEnd={() => handleLongPressEnd('fullYear')}
                                            >
                                                <img
                                                    src="/annee.svg"
                                                    alt={t('navbar.fullYear')}
                                                    width="24"
                                                    height="24"
                                                    style={{ display: 'block' }}
                                                />
                                            </button>
                                        </Tooltip>
                                    )}
                                    {showFilter && (
                                        <Tooltip
                                            text={t('navbar.filter')}
                                            show={showTooltip.filter}
                                            enabled={showTooltips}
                                        >
                                            <div
                                                onMouseEnter={() => setShowTooltip(prev => ({ ...prev, filter: true }))}
                                                onMouseLeave={() => setShowTooltip(prev => ({ ...prev, filter: false }))}
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
                                    {devMode ?
                                        <Tooltip
                                            text={t('navbar.history')}
                                            show={showTooltip.history}
                                            enabled={showTooltips}
                                        >
                                            <div style={{ position: "relative" }}>
                                                <button
                                                    className="history-btn"
                                                    onClick={(e) => {
                                                        handleClick('history');
                                                        handleShowHistory();
                                                    }}
                                                    aria-label={t('navbar.history')}
                                                    onMouseEnter={() => setShowTooltip(prev => ({ ...prev, history: true }))}
                                                    onMouseLeave={() => setShowTooltip(prev => ({ ...prev, history: false }))}
                                                    onTouchStart={() => handleLongPressStart('history')}
                                                    onTouchEnd={() => handleLongPressEnd('history')}
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 500 500" fill="none"
                                                        xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                        <g transform="translate(0,500) scale(0.1,-0.1)" fill="currentColor"
                                                            stroke="none">
                                                            <path
                                                                d="M2221 4564 c-409 -56 -784 -229 -1108 -511 l-73 -64 0 111 c0 124 -12 165 -62 217 -86 89 -242 75 -313 -27 -41 -59 -47 -134 -43 -537 l3 -368 28 -48 c35 -60 87 -94 157 -104 30 -4 226 -6 435 -3 361 5 382 6 420 26 62 32 98 91 103 168 5 75 -17 127 -74 175 -49 40 -107 51 -267 51 l-132 1 68 65 c329 315 812 484 1268 444 413 -36 754 -194 1045 -484 292 -293 449 -632 484 -1048 18 -213 -17 -485 -87 -683 -144 -405 -463 -761 -847 -945 -133 -63 -217 -93 -356 -124 -508 -113 -1027 9 -1426 335 -109 89 -248 242 -325 357 -172 257 -256 508 -283 847 -12 157 -15 168 -42 207 -43 62 -104 90 -181 86 -77 -5 -135 -41 -170 -107 -20 -38 -23 -59 -23 -147 0 -283 82 -616 219 -887 358 -707 1071 -1147 1861 -1147 331 0 631 70 920 213 716 357 1160 1071 1160 1867 0 1048 -774 1929 -1813 2065 -145 19 -404 18 -546 -1z" />
                                                            <path
                                                                d="M2430 3637 c-50 -16 -114 -84 -129 -137 -9 -34 -11 -194 -9 -655 l3 -610 25 -45 c16 -28 43 -55 74 -75 l49 -30 421 0 421 0 45 25 c118 66 145 217 57 317 -61 70 -78 73 -394 73 l-283 0 0 481 c0 352 -3 493 -12 523 -16 53 -81 118 -134 134 -49 14 -86 14 -134 -1z" />
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
                                </div>
                                {devMode && (
                                    <div>
                                        <button
                                            className="dev-clear-cache-btn"
                                            onClick={handleClearCache}
                                            title={t('navbar.clearCache')}
                                            aria-label={t('navbar.clearCache')}
                                        >
                                            DEV
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
