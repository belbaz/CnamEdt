// @ts-nocheck
"use client";
import "./TimeMarkers.css";

export default function TimeMarkers({markers, startMinutes, endMinutes, totalMinutes, showTimeLabels = true}) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650;

    // Utiliser les mêmes valeurs que pour les événements (non arrondies)
    const total = endMinutes - startMinutes;

    return (
        <>
            {/* Conteneur pour les traits (sous les cours) */}
            <div
                className="time-markers"
                style={isMobile ? {height: `${totalMinutes}px`} : {}}
            >
                {markers.map((marker, idx) => {
                    const markerPos = ((marker.totalMinutes - startMinutes) / total) * 100;
                    return (
                        <div
                            key={idx}
                            className={`time-marker ${marker.isHour ? 'hour-marker' : ''}`}
                            style={isMobile ? {top: `${markerPos}%`} : {left: `${markerPos}%`}}
                        />
                    );
                })}
            </div>

            {/* Conteneur pour les labels (au-dessus des cours) */}
            {showTimeLabels && (
                <div
                    className="time-labels-container"
                    style={isMobile ? {height: `${totalMinutes}px`} : {}}
                >
                    {markers.map((marker, idx) => {
                        if (!marker.isHour) return null;
                        const markerPos = ((marker.totalMinutes - startMinutes) / total) * 100;
                        return (
                            <div
                                key={idx}
                                className="time-label-wrapper"
                                style={isMobile ? {top: `${markerPos}%`} : {left: `${markerPos}%`}}
                            >
                                <span className="time-label">{marker.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}

