"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    noteEntries = [],
    fileCount: propsFileCount,
    isDistanciel = false,
    notePreviewItems = []
}) {
    const { matiere, prof, description, splitGroup } = getEventTitle(event);
    const location = event.location?.replace(/^Salle\s*:\s*/, "").trim();
    const cardRef = useRef(null);
    const badgeRef = useRef(null);
    const tooltipRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState({});
    const [isMounted, setIsMounted] = useState(false);
    const [internalFileCount, setInternalFileCount] = useState(0);
    const devMode = useDevMode();

    // Utiliser le prop fileCount s'il est fourni, sinon utiliser l'état interne
    const effectiveFileCount = typeof propsFileCount === 'number' ? propsFileCount : internalFileCount;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Charger le nombre de fichiers pour ce cours SEULEMENT si pas fourni en prop
    useEffect(() => {
        if (!event?.uid || typeof propsFileCount === 'number') {
            if (typeof propsFileCount !== 'number') {
                setInternalFileCount(0);
            }
            return;
        }

        const loadFileCount = async () => {
            try {
                const response = await fetch(`/api/files/list?course_uid=${encodeURIComponent(event.uid)}`);
                const data = await response.json();
                if (data.success) {
                    setInternalFileCount(data.files?.length || 0);
                }
            } catch (err) {
                console.error("[EventCard] Erreur chargement fichiers:", err);
                setInternalFileCount(0);
            }
        };

        loadFileCount();
    }, [event?.uid, propsFileCount]);

    const updateTooltipPosition = useCallback(() => {
        if (!badgeRef.current || !tooltipRef.current || !showTooltip) return;

        const badgeRect = badgeRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const margin = 8;

        // Si la tooltip n'a pas encore de dimensions, attendre
        if (tooltipRect.width === 0 || tooltipRect.height === 0) {
            requestAnimationFrame(updateTooltipPosition);
            return;
        }

        // Position verticale : sous le badge
        let top = badgeRect.bottom + margin;

        // Si ça dépasse en bas, mettre au-dessus
        if (top + tooltipRect.height > window.innerHeight - margin) {
            top = badgeRect.top - tooltipRect.height - margin;
            // Si ça dépasse toujours, coller en haut
            if (top < margin) {
                top = margin;
            }
        }

        // Position horizontale : aligner à droite du badge par défaut
        let left = badgeRect.right - tooltipRect.width;

        // Si ça dépasse à gauche, aligner à gauche du badge
        if (left < margin) {
            left = badgeRect.left;
        }

        // Si ça dépasse à droite, ajuster
        if (left + tooltipRect.width > window.innerWidth - margin) {
            left = window.innerWidth - tooltipRect.width - margin;
        }

        setTooltipStyle({ top: `${top}px`, left: `${left}px` });
    }, [showTooltip]);

    useEffect(() => {
        if (showTooltip) {
            // Attendre que la tooltip soit rendue pour calculer sa position
            requestAnimationFrame(() => {
                requestAnimationFrame(updateTooltipPosition);
            });
        }
    }, [showTooltip, updateTooltipPosition]);

    useEffect(() => {
        if (!showTooltip) return;

        const handleUpdate = () => updateTooltipPosition();
        window.addEventListener("scroll", handleUpdate, true);
        window.addEventListener("resize", handleUpdate);

        return () => {
            window.removeEventListener("scroll", handleUpdate, true);
            window.removeEventListener("resize", handleUpdate);
        };
    }, [showTooltip, updateTooltipPosition]);

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
    // Si la localisation contient "visio", on considère désormais que le cours est en distanciel
    const locationLabel = visioLocation ? 'Cours en distanciel' : (location || "?");
    const siteInfo = (!visioLocation && location) ? getCnamSite(location) : null;

    // Détecter si la description contient "EXAMEN"
    const isExam = description && description.toUpperCase().includes("EXAMEN");

    return (
        <li
            className={`event-card`}
            style={stylePos}
            data-index={getColorIndexForSubject(matiere || description, subjectColors)}
            ref={cardRef}
            onClick={(e) => {
                if (onOpenEventDetails && cardRef.current) {
                    const rect = cardRef.current.getBoundingClientRect();
                    const clickPosition = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        width: rect.width,
                        height: rect.height
                    };
                    onOpenEventDetails(event, clickPosition);
                }
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
                // On ne considère pour la tooltip / le badge que les entrées texte (notePreviewItems),
                // jamais les placeholders utilisés pour les notes "labels uniquement".
                const baseEntries = Array.isArray(notePreviewItems) ? notePreviewItems : [];
                const cleanedEntries = sanitizeNoteEntries(baseEntries);
                const noteCount = cleanedEntries.length;
                const totalCount = noteCount + effectiveFileCount;

                // Afficher le badge seulement s'il y a des notes texte OU des fichiers
                // -> si on a uniquement des labels, totalCount sera 0 et le badge ne sera pas affiché.
                if (totalCount === 0) {
                    return null;
                }

                const hasTooltipContent = noteCount > 0 || effectiveFileCount > 0;

                const previewEntries = cleanedEntries.slice(0, 3);
                const remaining = noteCount - previewEntries.length;
                return (
                    <>
                        <div
                            ref={badgeRef}
                            className="note-badge-card"
                            aria-label={`${noteCount} note${noteCount > 1 ? 's' : ''}${effectiveFileCount > 0 ? ` et ${effectiveFileCount} fichier${effectiveFileCount > 1 ? 's' : ''}` : ''} dans votre agenda`}
                            onMouseEnter={hasTooltipContent ? () => setShowTooltip(true) : undefined}
                            onMouseLeave={hasTooltipContent ? () => setShowTooltip(false) : undefined}
                            onFocus={hasTooltipContent ? () => setShowTooltip(true) : undefined}
                            onBlur={hasTooltipContent ? () => setShowTooltip(false) : undefined}
                        >
                            <span className="note-icon">📋</span>
                            <span className="note-count-badge">{totalCount}</span>
                        </div>
                        {/* Afficher la tooltip seulement s'il y a du contenu (texte ou fichiers) */}
                        {isMounted && showTooltip && hasTooltipContent && createPortal(
                            <div
                                ref={tooltipRef}
                                className="note-tooltip"
                                style={tooltipStyle}
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                            >
                                <strong>{noteCount > 1 ? `${noteCount} notes` : "note"}</strong>
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
                                {effectiveFileCount > 0 && (
                                    <div className="note-tooltip-files">
                                        <span className="note-tooltip-files-icon">📄</span>
                                        <span className="note-tooltip-files-text">
                                            {effectiveFileCount} fichier{effectiveFileCount > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>,
                            document.body
                        )}
                    </>
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
                            // Si le cours est marqué distanciel via un label, on n'affiche pas les sites physiques
                            if (isDistanciel && !visioLocation) {
                                return (
                                    <span
                                        className="site-badge-card distanciel-badge"
                                        title="Cours en distanciel"
                                    >
                                        DISTANCIEL
                                    </span>
                                );
                            }

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
                    <div className={`location ${visioLocation || isDistanciel ? 'visio-location' : ''}`}>
                        <span className="location-text">
                            {isDistanciel && !visioLocation ? 'Cours en distanciel' : locationLabel}
                        </span>
                        {visioLocation ? (
                            <span
                                className="site-badge-card visio-badge"
                                title="Cours en distanciel"
                            >
                                DISTANCIEL
                            </span>
                        ) : isDistanciel ? (
                            <span
                                className="site-badge-card distanciel-badge"
                                title="Cours en distanciel"
                            >
                                DISTANCIEL
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

