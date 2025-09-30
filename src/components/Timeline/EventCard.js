"use client";
import {getEventTitle, getColorIndexForSubject} from "@/utils/eventUtils";
import "./EventCard.css";

export default function EventCard({event, stylePos, subjectColors}) {
    const {matiere, prof, description} = getEventTitle(event);
    const location = event.location?.replace(/^Salle\s*:\s*/, "").trim();

    return (
        <li
            className="event-card"
            style={stylePos}
            data-index={getColorIndexForSubject(matiere || description, subjectColors)}
        >
            <div className="event-time">
                {new Date(event.start).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit"
                })}
                {" - "}
                {new Date(event.end).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit"
                })}
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
