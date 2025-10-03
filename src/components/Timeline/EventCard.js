"use client";
import {useEffect, useRef, useState} from "react";
import {getEventTitle, getColorIndexForSubject} from "@/utils/eventUtils";
import "./EventCard.css";

export default function EventCard({event, stylePos, subjectColors, onOpenEventDetails}) {
    const {matiere, prof, description} = getEventTitle(event);
    const location = event.location?.replace(/^Salle\s*:\s*/, "").trim();
    const cardRef = useRef(null);

    const formatTime = (d) => new Date(d).toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"});

    return (
        <li
            className={`event-card`}
            style={stylePos}
            data-index={getColorIndexForSubject(matiere || description, subjectColors)}
            ref={cardRef}
            onClick={() => { onOpenEventDetails && onOpenEventDetails(event); }}
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
                {location && <div className="location">{location}</div>}
            </div>
        </li>
    );
}
