"use client";
import {useState, useEffect} from "react";
import PageHeader from "./PageHeader";
import WeekPicker from "./WeekPicker";
import FilterPanel from "./FilterPanel";
import "./Navbar.css";
import {useDevMode} from "../utils/env";

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
                                   subjects = [],
                                   selectedSubjects = [],
                                   onSubjectsChange = null,
                                   showOnlyExams = false,
                                   onShowOnlyExamsChange = null,
                                   showFilter = false,
                                   userInfo = null
                               }) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [newHistoryCount, setNewHistoryCount] = useState(0);
    const devMode = useDevMode();

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
                    if (scrollY > 80 && !isScrolled) {
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
                    isNative={isNative}
                    currentVersion={currentVersion}
                    onCheckUpdates={onCheckUpdates}
                    viewMode={viewMode}
                    onViewModeChange={onViewModeChange}
                    showTimeLabels={showTimeLabels}
                    onToggleTimeLabels={onToggleTimeLabels}
                    hide15MinSpacing={hide15MinSpacing}
                    onToggle15MinSpacing={onToggle15MinSpacing}
                        showTimeRemaining={showTimeRemaining}
                        onToggleTimeRemaining={onToggleTimeRemaining}
                    userInfo={userInfo}
                    historyCount={newHistoryCount}
                    onShowHistory={handleShowHistory}
                />

                <div className="navbar-controls">
                    <div className="week-picker-container">
                        <WeekPicker
                            availableWeeks={availableWeeks}
                            selectedWeek={selectedWeek}
                            onWeekChange={onWeekChange}
                            onRefresh={onRefresh}
                            onToday={onToday}
                            showRefreshButton={showRefreshButton}
                            isMobile={isMobile}
                            onToggleAllDays={onToggleAllDays}
                            allDaysCollapsed={allDaysCollapsed}
                            isOnline={typeof navigator !== 'undefined' ? navigator.onLine : true}
                        />
                    </div>
                    <div className="navbar-actions-right">
                        <div className="dev-buttons-container">
                            <div className="view-filter-group">
                                {showFilter && (
                                    <FilterPanel
                                        subjects={subjects}
                                        selectedSubjects={selectedSubjects}
                                        onSubjectsChange={onSubjectsChange || (() => {})}
                                        showOnlyExams={showOnlyExams}
                                        onShowOnlyExamsChange={onShowOnlyExamsChange}
                                        isVisible={showFilter}
                                    />
                                )}
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
                                {viewMode === 'horizontal' && (
                                    <button
                                        className="expand-all-btn expand-all-btn-mobile"
                                        onClick={onToggleAllDays}
                                        title={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                                        aria-label={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                                    >
                                        {allDaysCollapsed ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                                 xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2"
                                                      strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                                 xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.2"
                                                      strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                    </button>
                                )}
                            </div>
                            {devMode && (
                                <>
                                    <button
                                        className="dev-clear-cache-btn"
                                        onClick={handleClearCache}
                                        title="Vider le cache et les cookies (localhost uniquement)"
                                        aria-label="Vider le cache et les cookies"
                                    >
                                        DEV
                                    </button>
                                    <button
                                        className="dev-room-mapper-btn"
                                        onClick={() => window.location.href = '/admin/room-mapper'}
                                        title="Mapper les salles sur le plan SVG"
                                        aria-label="Room Mapper"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>
                        {viewMode === 'horizontal' && (
                            <button
                                className="expand-all-btn expand-all-btn-desktop"
                                onClick={onToggleAllDays}
                                title={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                                aria-label={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                            >
                                {allDaysCollapsed ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2"
                                              strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.2"
                                              strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
