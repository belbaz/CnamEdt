"use client";
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
                    title="Semaine précédente"
                >
                    ←
                </button>

                <div className="week-display">
                    <span className="week-label">Semaine</span>
                    <span className="week-date">{currentWeekLabel}</span>
                </div>

                <button
                    className="week-nav"
                    onClick={handleNext}
                    disabled={!canGoNext}
                    title="Semaine suivante"
                >
                    →
                </button>
            </div>

            {showRefreshButton ? (
                <button className={`refresh-btn ${!isOnline ? 'is-disabled' : ''}`} onClick={onRefresh} title="Actualiser" disabled={!isOnline}>
                    ↻
                </button>
            ) : (
                <button
                    className="expand-all-btn"
                    onClick={onToggleAllDays}
                    title={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                    aria-label={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                >
                    {allDaysCollapsed ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                             aria-hidden="true">
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                                  strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                             aria-hidden="true">
                            <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                                  strokeLinejoin="round"/>
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
}
