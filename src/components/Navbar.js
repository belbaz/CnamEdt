"use client";
import {useState, useEffect} from "react";
import PageHeader from "./PageHeader";
import WeekPicker from "./WeekPicker";
import "./Navbar.css";
import {isDevMode} from "../utils/env";

export default function Navbar({
                                   darkMode,
                                   onToggleDarkMode,
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
                                   subjects = [],
                                   selectedSubjects = [],
                                   onSubjectsChange = null,
                                   showFilter = false
                               }) {
    const [isScrolled, setIsScrolled] = useState(false);

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
                    onToggleDarkMode={onToggleDarkMode}
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
                    subjects={subjects}
                    selectedSubjects={selectedSubjects}
                    onSubjectsChange={onSubjectsChange}
                    showFilter={showFilter}
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
                    {isDevMode() && (
                        <button
                            className="dev-clear-cache-btn"
                            onClick={handleClearCache}
                            title="Vider le cache et les cookies (localhost uniquement)"
                            aria-label="Vider le cache et les cookies"
                        >
                            DEV
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
