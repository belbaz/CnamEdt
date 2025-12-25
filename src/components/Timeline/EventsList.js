"use client";
import { useEffect, useRef, useState } from "react";
import EventCard from "./EventCard";
import { getEventPosition, getEventPositionVertical } from "@/utils/timelineUtils";
import { getCompactModeValues } from "@/utils/compactModeUtils";
import { parseStoredNoteValue, HIDDEN_LABEL_PLACEHOLDER } from "@/utils/noteEntries";
import "./EventsList.css";

export default function EventsList({
    events,
    startMinutes,
    endMinutes,
    totalMinutes,
    subjectColors,
    onOpenEventDetails,
    compactMode = 5,
    hide15MinSpacing = false,
    courseNotes = null,
    colorPosition = 'background',
    colorBackgroundOpacity = 0.6
}) {
    const { dayHeightFactor, cardTopPadding, eventsContainerPadding } = getCompactModeValues(compactMode);
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650;
    const isTabletOrDesktop = typeof window !== 'undefined' && window.innerWidth > 650;
    const containerRef = useRef(null);
    const [calculatedHeight, setCalculatedHeight] = useState(80); // Valeur initiale par défaut
    const [isCalculating, setIsCalculating] = useState(true);

    useEffect(() => {
        // Calculer la hauteur uniquement pour desktop
        if (!isTabletOrDesktop || !containerRef.current) {
            setIsCalculating(false);
            return;
        }

        const calculateMaxCardHeight = () => {
            // Vérifier que containerRef.current existe toujours
            if (!containerRef.current) {
                setIsCalculating(false);
                return;
            }

            const cards = containerRef.current.querySelectorAll('.event-card');
            if (cards.length === 0) {
                setIsCalculating(false);
                return;
            }

            let maxHeight = 0;
            cards.forEach(card => {
                const height = card.offsetHeight;
                if (height > maxHeight) {
                    maxHeight = height;
                }
            });

            // Appliquer le facteur de hauteur et ajouter le padding
            const finalHeight = (maxHeight * dayHeightFactor) + cardTopPadding;
            setCalculatedHeight(finalHeight);
            setIsCalculating(false);
        };

        // Recalculer si la fenêtre est redimensionnée
        window.addEventListener('resize', calculateMaxCardHeight);

        // Différer légèrement le calcul pour laisser l'animation d'ouverture se terminer
        // Cela évite le lag lors de l'ouverture d'un jour
        let rafId = null;
        const timeoutId = setTimeout(() => {
            // Utiliser requestAnimationFrame pour calculer immédiatement après le rendu
            const rafCallback = () => {
                // Vérifier à nouveau que containerRef existe avant de calculer
                if (containerRef.current) {
                    calculateMaxCardHeight();
                }
            };
            rafId = requestAnimationFrame(rafCallback);
        }, 50); // Petit délai pour laisser l'animation commencer

        return () => {
            clearTimeout(timeoutId);
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            window.removeEventListener('resize', calculateMaxCardHeight);
        };
    }, [events, isTabletOrDesktop, dayHeightFactor, cardTopPadding, eventsContainerPadding]);

    // Charger les compteurs de fichiers en batch
    // Différer le chargement pour éviter le lag lors de l'ouverture d'un jour
    const [fileCounts, setFileCounts] = useState({});

    useEffect(() => {
        if (!events || events.length === 0) {
            setFileCounts({});
            return;
        }

        // Différer le chargement des compteurs de fichiers pour laisser l'animation se terminer
        // Cela évite le lag lors de l'ouverture d'un jour
        const timeoutId = setTimeout(() => {
            const fetchFileCounts = async () => {
                try {
                    // Récupérer les UIDs uniques
                    const uids = [...new Set(events.filter(e => e.uid).map(e => e.uid))];

                    if (uids.length === 0) return;

                    const response = await fetch('/api/files/batch-counts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ course_uids: uids })
                    });

                    const data = await response.json();
                    if (data.success) {
                        setFileCounts(data.counts || {});
                    }
                } catch (err) {
                    console.error("[EventsList] Erreur chargement compteurs fichiers:", err);
                }
            };

            fetchFileCounts();
        }, 350); // Attendre la fin de l'animation (300ms + 50ms de marge)

        return () => clearTimeout(timeoutId);
    }, [events]);

    const containerStyle = isMobile
        ? { height: `${totalMinutes}px` }
        : {
            minHeight: `${calculatedHeight}px`,
            padding: `${eventsContainerPadding}rem 0`,
            opacity: isCalculating ? 0 : 1,
            transition: 'opacity 0.15s ease-in-out'
        };

    const ulStyle = isMobile ? { height: '100%' } : {};

    return (
        <div
            ref={containerRef}
            className="events-container"
            style={containerStyle}
        >
            <ul style={ulStyle}>
                {(() => {
                    // Trier les événements une seule fois par heure de début
                    const sortedEvents = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
                    return sortedEvents.map((ev, idx) => {
                        // Trouver l'événement précédent et suivant (triés par heure de début)
                        const previousEvent = idx > 0 ? sortedEvents[idx - 1] : null;
                        const previousEventEnd = previousEvent ? (previousEvent.end_time || previousEvent.end) : null;
                        const nextEvent = idx < sortedEvents.length - 1 ? sortedEvents[idx + 1] : null;
                        const nextEventStart = nextEvent ? nextEvent.start : null;

                        let stylePos;
                        if (isMobile) {
                            const pos = getEventPositionVertical(ev.start, ev.end_time || ev.end, startMinutes, endMinutes, previousEventEnd, nextEventStart, hide15MinSpacing);
                            stylePos = {
                                top: pos.top,
                                height: pos.height,
                                left: "0",
                                width: "100%",
                                position: "absolute"
                            };
                        } else {
                            const pos = getEventPosition(ev.start, ev.end_time || ev.end, startMinutes, endMinutes, previousEventEnd, nextEventStart, hide15MinSpacing);
                            stylePos = { left: pos.left, width: pos.width };
                        }
                        const courseNote = courseNotes && ev.uid ? courseNotes.get(ev.uid) : null;
                        const noteEntries = courseNote
                            ? (Array.isArray(courseNote.entries)
                                ? courseNote.entries
                                : parseStoredNoteValue(courseNote.notes))
                            : [];

                        // Déterminer si ce cours est marqué comme distanciel via un label
                        const hasDistancielLabel = courseNote && courseNote.entry_labels
                            ? Object.values(courseNote.entry_labels).some((labelsArray) =>
                                Array.isArray(labelsArray) && labelsArray.includes("Distanciel")
                            )
                            : false;

                        // Extraire tous les labels non-Distanciel pour affichage dans le tooltip (dédupliqués)
                        const nonDistancielLabels = courseNote && courseNote.entry_labels
                            ? [...new Set(
                                Object.values(courseNote.entry_labels)
                                    .flat()
                                    .filter((label) => 
                                        typeof label === "string" && 
                                        label.trim() !== "" && 
                                        label !== "Distanciel"
                                    )
                            )]
                            : [];

                        // Construire les éléments de preview pour la tooltip (uniquement texte, pas les labels)
                        // On ignore explicitement le placeholder réservé aux notes "label uniquement"
                        const notePreviewItems = noteEntries.filter(
                            (entry) =>
                                typeof entry === "string" &&
                                entry !== HIDDEN_LABEL_PLACEHOLDER &&
                                entry.trim().length > 0
                        );
                        return (
                            <EventCard
                                key={idx}
                                event={ev}
                                stylePos={stylePos}
                                subjectColors={subjectColors}
                                onOpenEventDetails={onOpenEventDetails}
                                noteEntries={noteEntries}
                                fileCount={fileCounts[ev.uid] || 0}
                                isDistanciel={hasDistancielLabel}
                                notePreviewItems={notePreviewItems}
                                nonDistancielLabels={nonDistancielLabels}
                                colorPosition={colorPosition}
                                colorBackgroundOpacity={colorBackgroundOpacity}
                            />
                        );
                    });
                })()}
            </ul>
        </div>
    );
}
