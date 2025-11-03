"use client";
import "./TimePassedOverlay.css";

export default function TimePassedOverlay({currentPos}) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650;

    if (currentPos === null) return null;

    return (
        <div
            className="time-passed-overlay"
            style={isMobile ? {height: `${currentPos}%`} : {width: `${currentPos}%`}}
        />
    );
}
