"use client";
import "./WeekPicker.css";

export default function WeekPicker({
    availableWeeks,
    selectedWeek,
    onWeekChange,
    onRefresh,
    onToday,
    showRefreshButton = true,
    isMobile = false
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
            {showRefreshButton && (
                <button className="refresh-btn" onClick={onRefresh} title="Actualiser">
                    ↻
                </button>
            )}

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

            <button className="today-btn" onClick={onToday} title="Retour à la semaine actuelle">
                📅 {isMobile ? '' : 'Aujourd\'hui'}
            </button>
        </div>
    );
}
