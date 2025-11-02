"use client";
import { useMemo, useEffect, useState, useRef } from "react";
import { getDayTimeRange, generateTimeMarkers, getCurrentTimePosition } from "@/utils/timelineUtils";
import { groupEventsByDay } from "@/utils/eventUtils";
import { isToday } from "@/utils/dateUtils";
import EventCard from "./Timeline/EventCard";
import "./VerticalSchedule.css";

export default function VerticalSchedule({
    events,
    subjectColors,
    onOpenEventDetails,
    compactMode = 5,
    showTimeLabels = true
}) {
    // Grouper les événements par jour
    const groupByDay = useMemo(() => groupEventsByDay(events), [events]);
    
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
    const globalTimeRange = useMemo(() => {
        if (events.length === 0) {
            return { startMinutes: 8 * 60 + 45, endMinutes: 18 * 60 + 45 };
        }
        let minTime = Infinity, maxTime = -Infinity;
        events.forEach(ev => {
            const start = new Date(ev.start);
            const end = new Date(ev.end);
            minTime = Math.min(minTime, start.getHours() * 60 + start.getMinutes());
            maxTime = Math.max(maxTime, end.getHours() * 60 + end.getMinutes());
        });
        return {
            startMinutes: Math.floor(minTime / 15) * 15,
            endMinutes: Math.ceil(maxTime / 15) * 15
        };
    }, [events]);

    const { startMinutes, endMinutes } = globalTimeRange;
    const totalMinutes = endMinutes - startMinutes;
    const timeMarkers = generateTimeMarkers(startMinutes, endMinutes);
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    
    // Détecter si on a besoin de scroll horizontal sur PC
    const [needsScroll, setNeedsScroll] = useState(false);
    const wrapperRef = useRef(null);
    const containerRef = useRef(null);
    
    // États pour la notification hors ligne
    const [isOnline, setIsOnline] = useState(true);
    const [showOfflineNotification, setShowOfflineNotification] = useState(false);
    const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null);

    // Détecter l'état en ligne/hors ligne
    useEffect(() => {
        const setOnline = () => setIsOnline(true);
        const setOffline = () => setIsOnline(false);
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
        window.addEventListener('online', setOnline);
        window.addEventListener('offline', setOffline);
        return () => {
            window.removeEventListener('online', setOnline);
            window.removeEventListener('offline', setOffline);
        };
    }, []);

    // Afficher la notification hors ligne sur mobile
    useEffect(() => {
        if (isMobile && !isOnline) {
            setShowOfflineNotification(true);
            const timeout = setTimeout(() => {
                setShowOfflineNotification(false);
            }, 3000);
            return () => clearTimeout(timeout);
        } else {
            setShowOfflineNotification(false);
        }
    }, [isOnline, isMobile]);

    // Charger le timestamp de dernière mise à jour
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const timestamp = localStorage.getItem('lastUpdateTimestamp');
            if (timestamp) {
                setLastUpdateTimestamp(timestamp);
            }
        }
    }, [events]); // Recharger quand les événements changent

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
            const timeColumnWidth = 60;
            const minColumnWidth = 180;
            const gapSize = 8; // 0.5rem = 8px
            const gaps = (days.length + 1) * gapSize; // gaps entre toutes les colonnes
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
    }, [days.length, isMobile]);

    // Fonction pour obtenir la position verticale d'un événement
    const getEventVerticalPosition = (startTime, endTime) => {
        const s = new Date(startTime);
        const e = new Date(endTime);
        const sMin = s.getHours() * 60 + s.getMinutes();
        const eMin = e.getHours() * 60 + e.getMinutes();
        const total = endMinutes - startMinutes;
        const startOffset = sMin - startMinutes;
        const dur = eMin - sMin;
        return {
            top: `${(startOffset / total * 100).toFixed(3)}%`,
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
        if (!timestamp) return null;
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return null;
        }
    };

    return (
        <>
            {/* Notification hors ligne mobile */}
            {isMobile && showOfflineNotification && lastUpdateTimestamp && (
                <div className="offline-notification-banner">
                    <span className="offline-icon">📡</span>
                    <span className="offline-text">
                        Mode hors ligne - Dernière mise à jour : {formatLastUpdate(lastUpdateTimestamp)}
                    </span>
                </div>
            )}
            
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
                    <div className="vertical-schedule-header">
                        <div className="vertical-time-column-header"></div>
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
                <div className="vertical-schedule-body">
                    {/* Colonne des heures */}
                    {showTimeLabels && (
                        <div className="vertical-time-column">
                            {timeMarkers.filter(m => m.isHour).map((marker, idx) => (
                                <div
                                    key={idx}
                                    className="vertical-time-label"
                                    style={{
                                        top: `${((marker.totalMinutes - startMinutes) / totalMinutes) * 100}%`
                                    }}
                                >
                                    {marker.label}
                                </div>
                            ))}
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
                                            style={{ top: `${currentPos}%` }}
                                        >
                                            <div className="vertical-current-time-line"></div>
                                            <div className="vertical-current-time-dot"></div>
                                        </div>
                                    )}

                                    {/* Ligne de temps passée */}
                                    {currentPos !== null && (
                                        <div
                                            className="vertical-time-passed-overlay"
                                            style={{ height: `${currentPos}%` }}
                                        />
                                    )}

                                    {/* Marqueurs de temps */}
                                    <div 
                                        className="vertical-time-markers"
                                        style={{ height: `${totalMinutes}px` }}
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
                                        style={{ height: `${totalMinutes}px` }}
                                    >
                                        {dayEvents.map((ev, evIdx) => {
                                            const pos = getEventVerticalPosition(ev.start, ev.end);
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
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                    })}
                </div>
            </div>
            </div>
            
            {/* Affichage de la date et heure de dernière sauvegarde */}
            {lastUpdateTimestamp && (
                <div className="last-update-info">
                    <span>Dernière sauvegarde : {formatLastUpdate(lastUpdateTimestamp)}</span>
                </div>
            )}
        </>
    );
}
