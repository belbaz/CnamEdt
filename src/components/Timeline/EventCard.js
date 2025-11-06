"use client";
import {useEffect, useRef, useState} from "react";
import {getEventTitle, getColorIndexForSubject} from "@/utils/eventUtils";
import "./EventCard.css";

export default function EventCard({event, stylePos, subjectColors, onOpenEventDetails}) {
    const {matiere, prof, description} = getEventTitle(event);
    const location = event.location?.replace(/^Salle\s*:\s*/, "").trim();
    const cardRef = useRef(null);

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
    const isDevMode = process.env.NEXT_PUBLIC_ENV === "DEV";

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
                {(
                    <div className="location">
                        {location && <span className="location-text">{location}</span>}
                        {isDevMode && hoursLabel && (
                            <span className="event-hours" aria-label="Durée du cours">{hoursLabel}</span>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
}
