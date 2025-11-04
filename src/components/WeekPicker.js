"use client";
import { useState, useEffect, useRef } from "react";
import "./WeekPicker.css";

export default function WeekPicker({
                                        availableWeeks,
                                        selectedWeek,
                                        onWeekChange,
                                        onRefresh,
                                        onToday,
                                        showRefreshButton = true,
                                        isMobile = false,
                                        onToggleAllDays,
                                        allDaysCollapsed = false,
                                        isOnline = true
                                    }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDropdownActive, setIsDropdownActive] = useState(false);
    const dropdownRef = useRef(null);
    const weekDisplayRef = useRef(null);
    const selectedWeekRef = useRef(null);

    const currentWeekIndex = availableWeeks.findIndex(
        w => selectedWeek && w.monday.getTime() === selectedWeek.getTime()
    );

    const currentWeekLabel = currentWeekIndex >= 0
        ? availableWeeks[currentWeekIndex].label
        : "Aucune semaine";

    const canGoPrevious = currentWeekIndex > 0;
    const canGoNext = currentWeekIndex < availableWeeks.length - 1;

    const handlePrevious = () => {
        if (canGoPrevious) {
            onWeekChange(availableWeeks[currentWeekIndex - 1].monday);
        }
    };

    const handleNext = () => {
        if (canGoNext) {
            onWeekChange(availableWeeks[currentWeekIndex + 1].monday);
        }
    };

    const handleWeekClick = () => {
        if (!isDropdownOpen) {
            setIsDropdownOpen(true);
            // Délai minimal pour déclencher l'animation après le rendu
            setTimeout(() => {
                setIsDropdownActive(true);
                // Scroll vers la semaine sélectionnée après que le dropdown soit actif
                setTimeout(() => {
                    try {
                        if (selectedWeekRef.current && dropdownRef.current) {
                            const selectedElement = selectedWeekRef.current;
                            const dropdownContent = dropdownRef.current.querySelector('.week-dropdown-content');
                            
                            if (dropdownContent && selectedElement) {
                                // Calculer la position pour placer l'élément en haut
                                const elementOffsetTop = selectedElement.offsetTop;
                                dropdownContent.scrollTo({
                                    top: elementOffsetTop,
                                    behavior: 'smooth'
                                });
                            }
                        }
                    } catch (error) {
                        // Silencieusement ignorer les erreurs de scroll
                        console.log('Scroll error ignored:', error);
                    }
                }, 200);
            }, 10);
        } else {
            setIsDropdownActive(false);
            // Attendre la fin de l'animation avant de retirer du DOM
            setTimeout(() => {
                setIsDropdownOpen(false);
            }, 250);
        }
    };

    const handleWeekSelect = (weekMonday) => {
        onWeekChange(weekMonday);
        setIsDropdownActive(false);
        // Attendre la fin de l'animation avant de retirer du DOM
        setTimeout(() => {
            setIsDropdownOpen(false);
        }, 250);
    };

    // Fermer le dropdown quand on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                weekDisplayRef.current &&
                !weekDisplayRef.current.contains(event.target)
            ) {
                setIsDropdownActive(false);
                // Attendre la fin de l'animation avant de retirer du DOM
                setTimeout(() => {
                    setIsDropdownOpen(false);
                }, 250);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isDropdownOpen]);

    return (
        <div className={`controls ${isMobile ? 'mobile' : ''}`}>

            <button className="today-btn" onClick={onToday} title="Retour à la semaine actuelle"
                    aria-label="Aujourd'hui">
                📅
            </button>

            <div className="week-picker">
                <button
                    className="week-nav"
                    onClick={handlePrevious}
                    disabled={!canGoPrevious}
                    title="Semaine précédente (Ctrl + ←)"
                >
                    ←
                </button>

                <div 
                    className="week-display" 
                    ref={weekDisplayRef}
                    onClick={handleWeekClick}
                    style={{ cursor: 'pointer' }}
                >
                    <span className="week-label">Semaine</span>
                    <span className="week-date">{currentWeekLabel}</span>
                    <span className="week-arrow">{isDropdownOpen ? '▲' : '▼'}</span>
                </div>

                {/* Liste déroulante des semaines */}
                {isDropdownOpen && (
                    <div className={`week-dropdown ${isDropdownActive ? 'active' : ''}`} ref={dropdownRef}>
                        <div className="week-dropdown-content">
                            {availableWeeks.map((week, index) => {
                                const isSelected = selectedWeek && week.monday.getTime() === selectedWeek.getTime();
                                return (
                                    <div
                                        key={index}
                                        ref={isSelected ? selectedWeekRef : null}
                                        className={`week-dropdown-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleWeekSelect(week.monday)}
                                    >
                                        {week.label}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button
                    className="week-nav"
                    onClick={handleNext}
                    disabled={!canGoNext}
                    title="Semaine suivante (Ctrl + →)"
                >
                    →
                </button>
            </div>
        </div>
    );
}
