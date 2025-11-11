"use client";
import {useEffect, useRef, useState} from "react";
import {getEventTitle, getColorIndexForSubject} from "@/utils/eventUtils";
import "./EventCard.css";
import {useDevMode} from "../../utils/env";

export default function EventCard({event, stylePos, subjectColors, onOpenEventDetails}) {
    const {matiere, prof, description} = getEventTitle(event);
    const location = event.location?.replace(/^Salle\s*:\s*/, "").trim();
    const cardRef = useRef(null);
    const devMode = useDevMode();

    const formatTime = (d) => new Date(d).toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"});
    const formatDurationHours = (start, end) => {
        if (!start || !end) return null;
        const s = new Date(start);
        const e = new Date(end);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
        const ms = e.getTime() - s.getTime();
        if (ms <= 0) return null;
        const totalMinutes = Math.round(ms / (1000 * 60));
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h > 0 && m === 0) return `${h}h`;
        if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
        return `${m}min`;
    };
    const hoursLabel = formatDurationHours(event.start, event.end_time || event.end);

    // Détecter le site CNAM (Conté ou Saint-Martin)
    const getCnamSite = (location) => {
        if (!location || typeof location !== 'string') return null;
        
        const cleaned = location.trim();
        const match = cleaned.match(/^(\d+)(bis)?[\.\-\s]/i);
        if (!match) return null;
        
        const streetNumber = match[1];
        const isBis = !!match[2];
        
        const conteNumbers = ['30', '31', '33', '34', '35', '37', '39'];
        const saintMartinNumbers = ['1', '2', '3', '4', '5', '6', '7', '9', '10', '11', '12', '13', '14', '15', '16', '17', '21', '23', '27'];
        
        if (conteNumbers.includes(streetNumber)) {
            return { site: 'Conté', fullName: 'Conté', color: '#10b981' };
        }
        
        if (saintMartinNumbers.includes(streetNumber) || (streetNumber === '9' && isBis)) {
            return { site: 'St-Martin', fullName: 'Saint-Martin', color: '#f59e0b' };
        }
        
        return null;
    };

    const siteInfo = location ? getCnamSite(location) : null;

    return (
        <li
            className={`event-card`}
            style={stylePos}
            data-index={getColorIndexForSubject(matiere || description, subjectColors)}
            ref={cardRef}
            onClick={() => {
                onOpenEventDetails && onOpenEventDetails(event);
            }}
        >
            {devMode && hoursLabel && (
                <div className="event-hours-debug" aria-label="Durée du cours">{hoursLabel}</div>
            )}
            <div className="event-time">
                {formatTime(event.start)}{" - "}{formatTime(event.end)}
            </div>
            <div className="event-info">
                {matiere && matiere !== ":" ? (
                    <strong>{matiere}</strong>
                ) : (
                    description && <strong>{description}</strong>
                )}
                {prof && <span className="prof">{prof}</span>}
                <div className="location">
                    <span className="location-text">{location || "?"}</span>
                    {siteInfo && (
                        <span 
                            className="site-badge-card" 
                            style={{ backgroundColor: siteInfo.color }}
                            title={siteInfo.fullName}
                        >
                            {siteInfo.site}
                        </span>
                    )}
                </div>
            </div>
        </li>
    );
}
