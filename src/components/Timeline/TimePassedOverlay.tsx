// @ts-nocheck
"use client";
import "./TimePassedOverlay.css";
import AnimatedCourseProgressLabel from "./AnimatedCourseProgressLabel";

export default function TimePassedOverlay({
    currentPos,
    intensity = 0.5,
    events = null,
    showCourseProgressPercent = false,
    courseProgressPercentDecimals = 2,
}) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650;

    if (currentPos === null) return null;

    // Calculer l'opacité en fonction de l'intensité (0 à 1)
    const opacity = intensity;

    return (
        <>
            <div
                className="time-passed-overlay"
                style={
                    isMobile 
                        ? {height: `${currentPos}%`, opacity: opacity}
                        : {width: `${currentPos}%`, opacity: opacity}
                }
            />
            {showCourseProgressPercent && (
                <div
                    className="time-passed-overlay-percentage"
                    style={isMobile ? {top: `${currentPos}%`} : {left: `${currentPos}%`}}
                >
                    <AnimatedCourseProgressLabel
                        events={events}
                        fallbackPercent={currentPos}
                        decimals={courseProgressPercentDecimals}
                    />
                </div>
            )}
        </>
    );
}

