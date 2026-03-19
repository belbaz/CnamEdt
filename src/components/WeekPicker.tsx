// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import Tooltip from "./Tooltip";
import {useI18n} from "@/i18n/I18nContext";
import { getCurrentWeek } from "@/utils/dateUtils";
import "./WeekPicker.css";

// Hook pour gérer le long press sur mobile
const useLongPress = (onLongPress, onLongPressEnd, ms = 500) => {
    const timerRef = useRef(null);

    const start = () => {
        timerRef.current = setTimeout(() => {
            onLongPress();
        }, ms);
    };

    const stop = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        // Fermer le tooltip après un délai
        if (onLongPressEnd) {
            setTimeout(() => {
                onLongPressEnd();
            }, 1500);
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return {
        onTouchStart: start,
        onTouchEnd: stop,
        onTouchCancel: stop,
    };
};

export default function WeekPicker({
                                        availableWeeks,
                                        selectedWeek,
                                        onWeekChange,
                                        onRefresh,
                                        onToday,
                                        showRefreshButton = true,
                                        showTooltips = true,
                                        isMobile = false,
                                        onToggleAllDays,
                                        allDaysCollapsed = false,
                                        isOnline = true
                                    }) {
    const { t } = useI18n();
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
        : t('loading.loadingWeek');

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

    const [showTooltip, setShowTooltip] = useState({ today: false, previous: false, next: false, weekDisplay: false });
    const longPressTimersRef = useRef({});
    
    const longPressEventsToday = useLongPress(
        () => setShowTooltip(prev => ({ ...prev, today: true })),
        () => setShowTooltip(prev => ({ ...prev, today: false })),
        500
    );
    const longPressEventsPrevious = useLongPress(
        () => setShowTooltip(prev => ({ ...prev, previous: true })),
        () => setShowTooltip(prev => ({ ...prev, previous: false })),
        500
    );
    const longPressEventsNext = useLongPress(
        () => setShowTooltip(prev => ({ ...prev, next: true })),
        () => setShowTooltip(prev => ({ ...prev, next: false })),
        500
    );
    const longPressEventsWeekDisplay = useLongPress(
        () => setShowTooltip(prev => ({ ...prev, weekDisplay: true })),
        () => setShowTooltip(prev => ({ ...prev, weekDisplay: false })),
        500
    );

    // Masquer le tooltip lors d'un clic
    const handleClick = (buttonId) => {
        setShowTooltip(prev => ({ ...prev, [buttonId]: false }));
    };

    return (
        <div className={`controls ${isMobile ? 'mobile' : ''}`}>

            <Tooltip 
                text={t('weekPicker.today')}
                show={showTooltip.today}
                enabled={showTooltips}
            >
                <button 
                    className="today-btn today-btn-desktop" 
                    onClick={(e) => {
                        handleClick('today');
                        onToday();
                    }} 
                    aria-label={t('weekPicker.today')}
                    onMouseEnter={() => setShowTooltip(prev => ({ ...prev, today: true }))}
                    onMouseLeave={() => setShowTooltip(prev => ({ ...prev, today: false }))}
                    {...longPressEventsToday}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M8 14h8M8 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>
            </Tooltip>

            <div className="week-picker">
                <Tooltip 
                    text={t('weekPicker.previousWeek')}
                    show={showTooltip.previous && canGoPrevious}
                    enabled={showTooltips}
                >
                    <button
                        className="week-nav"
                        onClick={(e) => {
                            handleClick('previous');
                            handlePrevious();
                        }}
                        disabled={!canGoPrevious}
                        aria-label={t('weekPicker.previousWeek')}
                        onMouseEnter={() => canGoPrevious && setShowTooltip(prev => ({ ...prev, previous: true }))}
                        onMouseLeave={() => setShowTooltip(prev => ({ ...prev, previous: false }))}
                        {...longPressEventsPrevious}
                    >
                        ←
                    </button>
                </Tooltip>

                <Tooltip 
                    text={t('weekPicker.showWeeks')}
                    show={showTooltip.weekDisplay}
                    enabled={showTooltips}
                >
                    <div 
                        className="week-display" 
                        ref={weekDisplayRef}
                        onClick={(e) => {
                            handleClick('weekDisplay');
                            handleWeekClick();
                        }}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setShowTooltip(prev => ({ ...prev, weekDisplay: true }))}
                        onMouseLeave={() => setShowTooltip(prev => ({ ...prev, weekDisplay: false }))}
                        {...longPressEventsWeekDisplay}
                        role="button"
                        aria-label={t('weekPicker.showWeeks')}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleClick('weekDisplay');
                                handleWeekClick();
                            }
                        }}
                    >
                        <span className="week-label">{t('weekPicker.week')}</span>
                        <span className="week-date">{currentWeekLabel}</span>
                        <span className="week-arrow">{isDropdownOpen ? '▲' : '▼'}</span>
                    </div>
                </Tooltip>

                {/* Liste déroulante des semaines */}
                {isDropdownOpen && (
                    <div className={`week-dropdown ${isDropdownActive ? 'active' : ''}`} ref={dropdownRef}>
                        <div className="week-dropdown-content">
                            {availableWeeks.map((week, index) => {
                                const isSelected = selectedWeek && week.monday.getTime() === selectedWeek.getTime();
                                const isCurrentWeek = week.monday.getTime() === getCurrentWeek().getTime();
                                return (
                                    <div
                                        key={index}
                                        ref={isSelected ? selectedWeekRef : null}
                                        className={`week-dropdown-item ${isSelected ? 'selected' : ''} ${isCurrentWeek ? 'today-week' : ''}`}
                                        onClick={() => handleWeekSelect(week.monday)}
                                    >
                                        {week.label}
                                        {isCurrentWeek && !isSelected && (
                                            <span className="week-today-badge" aria-hidden="true">●</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <Tooltip 
                    text={t('weekPicker.nextWeek')}
                    show={showTooltip.next && canGoNext}
                    enabled={showTooltips}
                >
                    <button
                        className="week-nav"
                        onClick={(e) => {
                            handleClick('next');
                            handleNext();
                        }}
                        disabled={!canGoNext}
                        aria-label={t('weekPicker.nextWeek')}
                        onMouseEnter={() => canGoNext && setShowTooltip(prev => ({ ...prev, next: true }))}
                        onMouseLeave={() => setShowTooltip(prev => ({ ...prev, next: false }))}
                        {...longPressEventsNext}
                    >
                        →
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}

