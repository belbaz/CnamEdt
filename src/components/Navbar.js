"use client";
import { useState, useEffect } from "react";
import PageHeader from "./PageHeader";
import WeekPicker from "./WeekPicker";
import "./Navbar.css";

export default function Navbar({
    darkMode,
    onToggleDarkMode,
    availableWeeks,
    selectedWeek,
    onWeekChange,
    onRefresh,
    onToday,
    autoScrollToday,
    onToggleAutoScroll,
    showRefreshButton = true,
    isMobile = false,
    onSettingsOpenChange,
    onToggleAllDays,
    allDaysCollapsed = false,
    testMode = false,
    onToggleTestMode
}) {
    const [isScrolled, setIsScrolled] = useState(false);

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

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isScrolled]);

    return (
        <div className={`navbar-container ${isScrolled ? 'scrolled' : ''}`}>
            <div className="navbar-content">
                <PageHeader
                    darkMode={darkMode}
                    onToggleDarkMode={onToggleDarkMode}
                    isMobile={isMobile}
                    autoScrollToday={autoScrollToday}
                    onToggleAutoScroll={onToggleAutoScroll}
                    onSettingsOpenChange={onSettingsOpenChange}
                />

                <div className="navbar-controls">
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

                    {isMobile ? null : (
                        <>
                            <div className="auto-scroll-toggle">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={autoScrollToday}
                                        onChange={(e) => onToggleAutoScroll(e.target.checked)}
                                    />
                                    <span>Défilement auto</span>
                                </label>
                            </div>
                            <button
                                className={`test-mode-btn ${testMode ? 'active' : ''}`}
                                onClick={onToggleTestMode}
                                title={testMode ? "Désactiver les cours de test" : "Ajouter des cours de test pour aujourd'hui"}
                                aria-label={testMode ? "Désactiver les cours de test" : "Ajouter des cours de test pour aujourd'hui"}
                            >
                                🧪 {testMode ? 'Cours Test' : 'Ajouter Cours'}
                            </button>
                            <button
                                className="expand-all-btn"
                                onClick={onToggleAllDays}
                                title={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                                aria-label={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                            >
                                {allDaysCollapsed ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
