"use client";
import "./TimePassedOverlay.css";
import { useDevMode } from "@/utils/env";

export default function TimePassedOverlay({currentPos}) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650;
    const devMode = useDevMode();

    if (currentPos === null) return null;

    return (
        <>
            <div
                className="time-passed-overlay"
                style={isMobile ? {height: `${currentPos}%`} : {width: `${currentPos}%`}}
            />
            {devMode && (
                <div
                    className="time-passed-overlay-percentage"
                    style={isMobile ? {top: `${currentPos}%`} : {left: `${currentPos}%`}}
                >
                    {currentPos.toFixed(1)}%
                </div>
            )}
        </>
    );
}
