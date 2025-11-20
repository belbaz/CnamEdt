"use client";
import {useMemo, useEffect, useState, useRef} from "react";
import {getDayTimeRange, generateTimeMarkers, getCurrentTimePosition} from "@/utils/timelineUtils";
import {groupEventsByDay} from "@/utils/eventUtils";
import {isToday} from "@/utils/dateUtils";
import EventCard from "./Timeline/EventCard";
import "./VerticalSchedule.css";
import { parseStoredNoteValue } from "@/utils/noteEntries";

export default function VerticalSchedule({
                                             events,
                                             subjectColors,
                                             onOpenEventDetails,
                                             compactMode = 5,
                                             showTimeLabels = true,
                                             hide15MinSpacing = false,
                                             isNative = false,
                                             monthFormat = 'long',
                                             courseNotes = null
                                         }) {
    // Grouper les événements par jour
    const groupByDay = useMemo(() => groupEventsByDay(events, monthFormat), [events, monthFormat]);

    // Obtenir tous les jours de la semaine
    const days = useMemo(() => {
        const sortedDays = Object.keys(groupByDay).sort((a, b) => {
            const dateA = groupByDay[a][0] ? new Date(groupByDay[a][0].start) : new Date();
            const dateB = groupByDay[b][0] ? new Date(groupByDay[b][0].start) : new Date();
            return dateA - dateB;
        });
        return sortedDays;
    }, [groupByDay]);

    // Calculer la plage horaire globale pour tous les jours
    // Affiche toujours au minimum de 9h à 18h, mais s'étend si des cours sont en dehors de cette plage
    const globalTimeRange = useMemo(() => {
        const MIN_START = 9 * 60; // 9h00
        const MIN_END = 18 * 60; // 18h00

        if (events.length === 0) {
            return {startMinutes: MIN_START, endMinutes: MIN_END};
        }

        let minTime = Infinity, maxTime = -Infinity;
        events.forEach(ev => {
            const start = new Date(ev.start);
            const end = new Date(ev.end);
            minTime = Math.min(minTime, start.getHours() * 60 + start.getMinutes());
            maxTime = Math.max(maxTime, end.getHours() * 60 + end.getMinutes());
        });

        // Arrondir aux 15 minutes
        let startMinutes = Math.floor(minTime / 15) * 15;
        let endMinutes = Math.ceil(maxTime / 15) * 15;

        // Garantir un minimum de 9h à 18h, mais s'étendre si nécessaire
        startMinutes = Math.min(startMinutes, MIN_START);
        endMinutes = Math.max(endMinutes, MIN_END);

        return {startMinutes, endMinutes};
    }, [events]);

    const {startMinutes, endMinutes} = globalTimeRange;
    const totalMinutes = endMinutes - startMinutes;
    const timeMarkers = generateTimeMarkers(startMinutes, endMinutes);

    // Détecter si on a besoin de scroll horizontal sur PC
    const [needsScroll, setNeedsScroll] = useState(false);
    const wrapperRef = useRef(null);
    const containerRef = useRef(null);

    const [isMobile, setIsMobile] = useState(false);
    const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null);

    // Détecter un petit écran (mobile) OU app native
    useEffect(() => {
        if (typeof window === 'undefined') return;
        // Si c'est une app native, considérer comme mobile
        if (isNative) {
            setIsMobile(true);
            return;
        }
        const mq = window.matchMedia('(max-width: 768px)');
        const update = () => setIsMobile(mq.matches);
        update(); // Appeler immédiatement pour définir la valeur initiale
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, [isNative]);

    // Charger le timestamp de dernière mise à jour au montage et quand les événements changent
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const loadTimestamp = () => {
                const timestamp = localStorage.getItem('lastUpdateTimestamp');
                if (timestamp) {
                    setLastUpdateTimestamp(timestamp);
                }
            };
            loadTimestamp();
            // Écouter les changements dans localStorage
            window.addEventListener('storage', loadTimestamp);
            // Vérifier périodiquement (au cas où le storage change dans le même onglet)
            const interval = setInterval(loadTimestamp, 2000);
            return () => {
                window.removeEventListener('storage', loadTimestamp);
                clearInterval(interval);
            };
        }
    }, []); // Charger au montage

    // Recharger aussi quand les événements changent
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const timestamp = localStorage.getItem('lastUpdateTimestamp');
            if (timestamp) {
                setLastUpdateTimestamp(timestamp);
            }
        }
    }, [events]);

    useEffect(() => {
        if (isMobile || days.length === 0) {
            setNeedsScroll(false);
            return;
        }

        const checkIfNeedsScroll = () => {
            if (!containerRef.current) return;

            const containerWidth = containerRef.current.clientWidth;

            // Calculer la largeur minimale nécessaire avec des colonnes fixes de 180px
            // Colonne temps : 60px (header) ou 35px (body), on prend le max
            // Mais seulement si showTimeLabels est true
            const timeColumnWidth = showTimeLabels ? 60 : 0;
            const minColumnWidth = 180;
            const gapSize = 8; // 0.5rem = 8px
            const gaps = (days.length + (showTimeLabels ? 1 : 0)) * gapSize; // gaps entre toutes les colonnes
            const minRequiredWidth = timeColumnWidth + (days.length * minColumnWidth) + gaps;

            // Si la largeur minimale nécessaire dépasse la largeur disponible, activer le scroll
            setNeedsScroll(minRequiredWidth > containerWidth);
        };

        // Attendre que le DOM soit complètement rendu
        const timeoutId = setTimeout(() => {
            checkIfNeedsScroll();
        }, 0);

        // Réécouter le redimensionnement de la fenêtre
        const handleResize = () => {
            // Utiliser requestAnimationFrame pour attendre le reflow
            requestAnimationFrame(() => {
                checkIfNeedsScroll();
            });
        };

        window.addEventListener('resize', handleResize);

        // Utiliser ResizeObserver pour détecter les changements de taille du conteneur
        const resizeObserver = new ResizeObserver(() => {
            checkIfNeedsScroll();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [days.length, isMobile, showTimeLabels]);

    // Fonction pour obtenir la position verticale d'un événement
    const getEventVerticalPosition = (startTime, endTime, previousEventEnd = null, nextEventStart = null) => {
        const s = new Date(startTime);
        const e = new Date(endTime);
        const sMin = s.getHours() * 60 + s.getMinutes();
        const eMin = e.getHours() * 60 + e.getMinutes();
        const total = endMinutes - startMinutes;
        // Si hide15MinSpacing est activé et qu'il y a un événement précédent
        let adjustedStartOffset = sMin - startMinutes;
        let hasGapFromPrev = false;
        if (hide15MinSpacing && previousEventEnd !== null) {
            const prevEnd = new Date(previousEventEnd);
            const prevEndMin = prevEnd.getHours() * 60 + prevEnd.getMinutes();
            const gapMinutes = sMin - prevEndMin;

            // Si l'écart est exactement de 15 minutes, partager équitablement : chaque cours prend 7.5 minutes
            if (gapMinutes === 15) {
                // Le cours suivant commence 7.5 minutes après la fin réelle du cours précédent
                adjustedStartOffset = prevEndMin - startMinutes + 7.5;
                hasGapFromPrev = true;
            }
        }
        // Calculer la durée de base
        let dur = eMin - sMin;

        // Si le cours commence plus tôt (ajustement du début), augmenter la durée pour compenser
        if (hasGapFromPrev) {
            dur += 7.5; // Compenser le début plus tôt en augmentant la durée
        }

        // Si hide15MinSpacing est activé et qu'il y a un événement suivant avec un écart de 15 minutes
        // Le cours actuel s'étend de 7.5 minutes (la moitié des 15 minutes)
        if (hide15MinSpacing && nextEventStart !== null) {
            const nextStart = new Date(nextEventStart);
            const nextStartMin = nextStart.getHours() * 60 + nextStart.getMinutes();
            const gapToNext = nextStartMin - eMin;

            // Si l'écart avec le cours suivant est exactement de 15 minutes, augmenter la hauteur de 7.5 minutes
            if (gapToNext === 15) {
                dur += 7.5; // Ajouter 7.5 minutes (la moitié des 15 minutes)
                // Réduire légèrement la durée pour laisser un petit espace entre les cours
                // On utilise une valeur fixe de 0.125% (moitié de 0.25%) qui représente environ 0.75-1px sur une timeline typique
                dur -= (total * 0.00125); // 0.125% de la durée totale en minutes
            }
        }

        // Si hide15MinSpacing est activé et qu'il n'y a PAS d'événement suivant mais qu'il y a un écart de 15 minutes avec le précédent
        // Le dernier cours ne doit PAS ajouter de durée supplémentaire car on a déjà compensé le début plus tôt
        // Le startOffset a déjà été ajusté dans le premier bloc, et la durée a déjà été augmentée pour compenser le début plus tôt
        // Donc pas besoin d'ajouter encore de la durée, sinon le cours dépasserait son heure de fin réelle
        return {
            top: `${(adjustedStartOffset / total * 100).toFixed(3)}%`,
            height: `${Math.max(3, (dur / total * 100)).toFixed(3)}%`
        };
    };

    // Obtenir l'heure actuelle pour l'indicateur
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const currentTimePercent = nowMinutes >= startMinutes && nowMinutes <= endMinutes
        ? ((nowMinutes - startMinutes) / totalMinutes) * 100
        : null;

    if (days.length === 0 || events.length === 0) {
        return (
            <div className="vertical-schedule-empty">
                <p>Aucun cours cette semaine</p>
            </div>
        );
    }

    // Formater le timestamp pour l'affichage
    const formatLastUpdate = (timestamp) => {
        if (!timestamp) return 'Non disponible';
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Non disponible';
            return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Non disponible';
        }
    };

    return (
        <div>
            <div
                ref={containerRef}
                className={`vertical-schedule-container ${needsScroll ? 'has-scroll' : ''}`}
                style={{
                    '--days-count': days.length
                }}
            >
                <div
                    ref={wrapperRef}
                    className="vertical-schedule-wrapper"
                    data-needs-scroll={needsScroll ? "true" : "false"}
                >
                    {/* En-tête avec les jours */}
                    {days.length > 0 && (
                        <div className={`vertical-schedule-header ${!showTimeLabels ? 'no-time-column' : ''}`}>
                            {showTimeLabels && <div className="vertical-time-column-header"></div>}
                            {days.map((day, idx) => {
                                const dayEvents = groupByDay[day];
                                const dayDate = dayEvents[0] ? new Date(dayEvents[0].start) : new Date();
                                const isTodayDay = isToday(dayDate);
                                return (
                                    <div
                                        key={idx}
                                        className={`vertical-day-header ${isTodayDay ? 'today' : ''}`}
                                    >
                                        <h3>{isTodayDay ? `${day}📍` : day}</h3>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Corps du planning */}
                    <div className={`vertical-schedule-body ${!showTimeLabels ? 'no-time-column' : ''}`}>
                        {/* Colonne des heures */}
                        {showTimeLabels && (
                            <div className="vertical-time-column">
                                {timeMarkers.filter(m => m.isHour).map((marker, idx, array) => {
                                    // On vérifie si c'est le dernier élément du tableau filtré
                                    const isLast = idx === array.length - 1;

                                    // Calcul du pourcentage standard
                                    const percent = ((marker.totalMinutes - startMinutes) / totalMinutes) * 100;

                                    return (
                                        <div
                                            key={idx}
                                            className="vertical-time-label"
                                            style={{
                                                // Si c'est le dernier, on le place à 100% moins la taille de la police (.75rem)
                                                // Sinon, on utilise le pourcentage calculé normalement
                                                top: isLast
                                                    ? 'calc(100% - 0.75rem)'
                                                    : `${percent}%`
                                            }}
                                        >
                                            {marker.label}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Colonnes des jours */}
                        {days.length > 0 && days.map((day, dayIdx) => {
                            const dayEvents = groupByDay[day];
                            const dayDate = dayEvents[0] ? new Date(dayEvents[0].start) : new Date();
                            const isTodayDay = isToday(dayDate);
                            const currentPos = isTodayDay && currentTimePercent !== null
                                ? currentTimePercent
                                : null;

                            return (
                                <div
                                    key={dayIdx}
                                    className={`vertical-day-column ${isTodayDay ? 'today' : ''}`}
                                >
                                    {/* Indicateur de temps actuel */}
                                    {currentPos !== null && (
                                        <div
                                            className="vertical-current-time-indicator"
                                            style={{top: `${currentPos}%`}}
                                        >
                                            <div className="vertical-current-time-line"></div>
                                            <div className="vertical-current-time-dot"></div>
                                        </div>
                                    )}

                                    {/* Ligne de temps passée */}
                                    {currentPos !== null && (
                                        <div
                                            className="vertical-time-passed-overlay"
                                            style={{height: `${currentPos}%`}}
                                        />
                                    )}

                                    {/* Marqueurs de temps */}
                                    <div
                                        className="vertical-time-markers"
                                        style={{height: `${totalMinutes}px`}}
                                    >
                                        {timeMarkers.map((marker, idx) => (
                                            <div
                                                key={idx}
                                                className={`vertical-time-marker ${marker.isHour ? 'hour' : ''}`}
                                                style={{
                                                    top: `${((marker.totalMinutes - startMinutes) / totalMinutes) * 100}%`
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Événements */}
                                    <div
                                        className="vertical-events-container"
                                        style={{height: `${totalMinutes}px`}}
                                    >
                                        {(() => {
                                            // Trier les événements une seule fois par heure de début
                                            const sortedEvents = [...dayEvents].sort((a, b) => new Date(a.start) - new Date(b.start));
                                            return sortedEvents.map((ev, evIdx) => {
                                                // Trouver l'événement précédent (trié par heure de début)
                                                const previousEvent = evIdx > 0 ? sortedEvents[evIdx - 1] : null;
                                                const previousEventEnd = previousEvent ? (previousEvent.end_time || previousEvent.end) : null;

                                                // Trouver l'événement suivant (trié par heure de début)
                                                const nextEvent = evIdx < sortedEvents.length - 1 ? sortedEvents[evIdx + 1] : null;
                                                const nextEventStart = nextEvent ? nextEvent.start : null;

                                                const pos = getEventVerticalPosition(ev.start, ev.end_time || ev.end, previousEventEnd, nextEventStart);
                                                const courseNote = courseNotes && ev.uid ? courseNotes.get(ev.uid) : null;
                                                const noteEntries = courseNote
                                                    ? (Array.isArray(courseNote.entries)
                                                        ? courseNote.entries
                                                        : parseStoredNoteValue(courseNote.notes))
                                                    : [];
                                                return (
                                                    <EventCard
                                                        key={evIdx}
                                                        event={ev}
                                                        stylePos={{
                                                            ...pos,
                                                            position: 'absolute',
                                                            left: '0',
                                                            right: '0',
                                                            width: '100%'
                                                        }}
                                                        subjectColors={subjectColors}
                                                        onOpenEventDetails={onOpenEventDetails}
                                                        noteEntries={noteEntries}
                                                    />
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
