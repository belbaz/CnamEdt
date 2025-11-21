"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getEventTitle, getColorIndexForSubject } from "@/utils/eventUtils";
import "./EventCard.css";
import { useDevMode } from "../../utils/env";
import { sanitizeNoteEntries } from "@/utils/noteEntries";

const isVisioLocation = (location) => {
    if (!location || typeof location !== 'string') return false;
    return /visio/i.test(location);
};

export default function EventCard({
    event,
    stylePos,
    subjectColors,
    onOpenEventDetails,
    noteEntries = []
}) {
    const { matiere, prof, description, splitGroup } = getEventTitle(event);
    const location = event.location?.replace(/^Salle\s*:\s*/, "").trim();
    const cardRef = useRef(null);
    const noteTooltipRef = useRef(null);
    const [tooltipAlign, setTooltipAlign] = useState("align-left");
    const devMode = useDevMode();

    const adjustTooltipOrientation = useCallback(() => {
        const tooltipEl = noteTooltipRef.current;
        const badgeEl = tooltipEl?.parentElement;
        if (!tooltipEl || !badgeEl || typeof window === "undefined") return;

        const margin = 16;
        const tooltipWidth = tooltipEl.offsetWidth || 0;
        const badgeRect = badgeEl.getBoundingClientRect();
        const windowWidth = window.innerWidth;

        // Position si la tooltip est alignée à gauche (valeur par défaut : s'étend vers la gauche)
        const leftAlignedLeftEdge = badgeRect.right - tooltipWidth;
        const canAlignLeft = leftAlignedLeftEdge >= margin;

        // Position si elle est alignée à droite (s'étend vers la droite)
        const rightAlignedRightEdge = badgeRect.left + tooltipWidth;
        const canAlignRight = rightAlignedRightEdge <= (windowWidth - margin);

        let orientation = "align-left";

        if (!canAlignLeft && canAlignRight) {
            orientation = "align-right";
        } else if (!canAlignLeft && !canAlignRight) {
            // Choisir le côté qui offre le plus d'espace disponible
            const spaceLeft = badgeRect.left;
            const spaceRight = windowWidth - badgeRect.right;
            orientation = spaceRight > spaceLeft ? "align-right" : "align-left";
        }

        setTooltipAlign((prev) => (prev === orientation ? prev : orientation));
    }, []);

    useEffect(() => {
        adjustTooltipOrientation();
    }, [adjustTooltipOrientation, stylePos?.left, noteEntries]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleResize = () => {
            adjustTooltipOrientation();
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustTooltipOrientation]);

    const formatTime = (d) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
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

    const visioLocation = isVisioLocation(location);
    const locationLabel = visioLocation ? 'Cours en visio' : (location || "?");
    const siteInfo = (!visioLocation && location) ? getCnamSite(location) : null;

    // Détecter si la description contient "EXAMEN"
    const isExam = description && description.toUpperCase().includes("EXAMEN");

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
            {isExam && (
                <div className="exam-badge-card" title="Examen">
                    EXAMEN
                </div>
            )}
            {(() => {
                const cleanedEntries = sanitizeNoteEntries(noteEntries);
                const noteCount = cleanedEntries.length;
                if (noteCount === 0) {
                    return null;
                }
                const previewEntries = cleanedEntries.slice(0, 3);
                const remaining = noteCount - previewEntries.length;
                return (
                    <div
                        className="note-badge-card"
                        aria-label={`${noteCount} note${noteCount > 1 ? 's' : ''} dans votre agenda`}
                        onMouseEnter={adjustTooltipOrientation}
                        onFocus={adjustTooltipOrientation}
                    >
                        <span className="note-icon">📝</span>
                        <span className="note-count-badge">{noteCount}</span>
                        <div
                            ref={noteTooltipRef}
                            className={`note-tooltip ${tooltipAlign}`}
                        >
                            <strong>{noteCount > 1 ? `${noteCount} notes` : "Note"}</strong>
                            <ul className="note-tooltip-list">
                                {previewEntries.map((entry, idx) => (
                                    <li key={idx}>{entry}</li>
                                ))}
                                {remaining > 0 && (
                                    <li className="note-tooltip-more">
                                        +{remaining} autre{remaining > 1 ? "s" : ""}
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                );
            })()}
            <div className="event-time">
                {formatTime(event.start)}{" - "}{formatTime(event.end)}
            </div>
            <div className="event-info">
                {matiere && matiere !== ":" ? (
                    <strong>{matiere}</strong>
                ) : (
                    description && <strong>{description}</strong>
                )}
                <span className="prof">{prof || "?"}</span>
                {splitGroup ? (
                    // Affichage demi-groupe: salles multiples
                    <div className="location split-group-location">
                        <span className="location-text">{splitGroup.rooms.join(" / ")}</span>
                        {(() => {
                            // Détecter le site pour chaque salle
                            const sites = splitGroup.rooms.map(room => getCnamSite(room)).filter(Boolean);

                            // Si toutes les salles sont sur le même site, afficher un seul badge
                            if (sites.length > 0 && sites.every(s => s.site === sites[0].site)) {
                                return (
                                    <span
                                        className="site-badge-card"
                                        style={{ backgroundColor: sites[0].color }}
                                        title={sites[0].fullName}
                                    >
                                        {sites[0].site}
                                    </span>
                                );
                            }

                            // Sinon, afficher un badge par site unique
                            const uniqueSites = Array.from(new Map(sites.map(s => [s.site, s])).values());
                            return uniqueSites.map((siteInfo, idx) => (
                                <span
                                    key={idx}
                                    className="site-badge-card"
                                    style={{ backgroundColor: siteInfo.color }}
                                    title={siteInfo.fullName}
                                >
                                    {siteInfo.site}
                                </span>
                            ));
                        })()}
                    </div>
                ) : (
                    // Affichage normal: salle unique
                    <div className={`location ${visioLocation ? 'visio-location' : ''}`}>
                        <span className="location-text">{locationLabel}</span>
                        {visioLocation ? (
                            <span
                                className="site-badge-card visio-badge"
                                title="Cours en visio"
                            >
                                VISIO
                            </span>
                        ) : siteInfo && (
                            <span
                                className="site-badge-card"
                                style={{ backgroundColor: siteInfo.color }}
                                title={siteInfo.fullName}
                            >
                                {siteInfo.site}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
}

