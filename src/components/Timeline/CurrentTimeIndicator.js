"use client";
import "./CurrentTimeIndicator.css";

export default function CurrentTimeIndicator({currentPos}) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650;

    if (currentPos === null) return null;

    return (
        <>
        </>
        // <div
        //     className="current-time-indicator"
        //     style={isMobile ? {top: `${currentPos}%`} : {left: `${currentPos}%`}}
        // >
        //     <div className="current-time-line"></div>
        //     <div className="current-time-dot"></div>
        // </div>
    );
}
