"use client";
import { useState, useEffect } from "react";
import PageHeader from "./PageHeader";
import WeekPicker from "./WeekPicker";
import SettingsMenu from "./SettingsMenu";
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
    isMobile = false
}) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        let ticking = false;
        
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    
                    // Hystérésis : deux seuils différents pour éviter le clignotement
                    if (scrollY > 200 && !isScrolled) {
                        setIsScrolled(true);
                    } else if (scrollY < 100 && isScrolled) {
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
                <PageHeader darkMode={darkMode} onToggleDarkMode={onToggleDarkMode}/>
                
                <div className="navbar-controls">
                    <WeekPicker
                        availableWeeks={availableWeeks}
                        selectedWeek={selectedWeek}
                        onWeekChange={onWeekChange}
                        onRefresh={onRefresh}
                        onToday={onToday}
                        showRefreshButton={showRefreshButton}
                        isMobile={isMobile}
                    />
                    
                    {isMobile ? (
                        <SettingsMenu
                            autoScrollToday={autoScrollToday}
                            onToggleAutoScroll={onToggleAutoScroll}
                        />
                    ) : (
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
                    )}
                </div>
            </div>
        </div>
    );
}
