"use client";
import "./TimeMarkers.css";

export default function TimeMarkers({markers, startMinutes, endMinutes, totalMinutes}) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650;

    return (
        <>
            {/* Conteneur pour les traits (sous les cours) */}
            <div
                className="time-markers"
                style={isMobile ? {height: `${totalMinutes}px`} : {}}
            >
                {markers.map((marker, idx) => {
                    const total = endMinutes - startMinutes;
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
            <div
                className="time-labels-container"
                style={isMobile ? {height: `${totalMinutes}px`} : {}}
            >
                {markers.map((marker, idx) => {
                    if (!marker.isHour) return null;
                    const total = endMinutes - startMinutes;
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
        </>
    );
}
