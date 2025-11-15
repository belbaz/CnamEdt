"use client";
import {useEffect, useRef, useState} from "react";
import EventCard from "./EventCard";
import {getEventPosition, getEventPositionVertical} from "@/utils/timelineUtils";
import {getCompactModeValues} from "@/utils/compactModeUtils";
import "./EventsList.css";

export default function EventsList({
    events, 
    startMinutes, 
    endMinutes, 
    totalMinutes, 
    subjectColors, 
    onOpenEventDetails,
    compactMode = 5,
    hide15MinSpacing = false
}) {
    const {dayHeightFactor, cardTopPadding, eventsContainerPadding} = getCompactModeValues(compactMode);
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

        // Utiliser requestAnimationFrame pour calculer immédiatement après le rendu
        let rafId = null;
        const rafCallback = () => {
            // Vérifier à nouveau que containerRef existe avant de calculer
            if (containerRef.current) {
                calculateMaxCardHeight();
            }
        };
        rafId = requestAnimationFrame(rafCallback);

        // Recalculer si la fenêtre est redimensionnée
        window.addEventListener('resize', calculateMaxCardHeight);

        return () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            window.removeEventListener('resize', calculateMaxCardHeight);
        };
    }, [events, isTabletOrDesktop, dayHeightFactor, cardTopPadding, eventsContainerPadding]);

    const containerStyle = isMobile 
        ? {height: `${totalMinutes}px`}
        : {
            minHeight: `${calculatedHeight}px`,
            padding: `${eventsContainerPadding}rem 0`,
            opacity: isCalculating ? 0 : 1,
            transition: 'opacity 0.15s ease-in-out'
        };

    const ulStyle = isMobile ? {height: '100%'} : {};

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
                            stylePos = {left: pos.left, width: pos.width};
                        }
                        return (
                            <EventCard
                                key={idx}
                                event={ev}
                                stylePos={stylePos}
                                subjectColors={subjectColors}
                                onOpenEventDetails={onOpenEventDetails}
                            />
                        );
                    });
                })()}
            </ul>
        </div>
    );
}
