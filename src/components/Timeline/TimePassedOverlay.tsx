// @ts-nocheck
"use client";
import "./TimePassedOverlay.css";
import { useDevMode } from "@/utils/env";

export default function TimePassedOverlay({currentPos, intensity = 0.5}) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650;
    const devMode = useDevMode();

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

