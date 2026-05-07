// @ts-nocheck
"use client";
import { useMemo, useEffect, useState, useRef } from "react";
import { getDayTimeRange, generateTimeMarkers } from "@/utils/timelineUtils";
import AnimatedCourseProgressLabel from "@/components/Timeline/AnimatedCourseProgressLabel";
import { groupEventsByDay } from "@/utils/eventUtils";
import { isToday, getLocale } from "@/utils/dateUtils";
import { useI18n } from "@/i18n/I18nContext";
import EventCard from "./Timeline/EventCard";
import Tooltip from "./Tooltip";
import "./VerticalSchedule.css";
import { parseStoredNoteValue, HIDDEN_LABEL_PLACEHOLDER, agendaRowHasPersonalEntries } from "@/utils/noteEntries";
import { useFileCounts } from "@/hooks/useFileCounts";

export default function VerticalSchedule({
    events,
    subjectColors,
    onOpenEventDetails,
    compactMode = 5,
    showTimeLabels = true,
    hide15MinSpacing = false,
    showCurrentTimeIndicator = true,
    isPWAInstalled = false,
    monthFormat = 'long',
    courseNotes = null,
    colorPosition = 'background',
    colorBackgroundOpacity = 0.6,
    timePassedOverlayIntensity = 0.5,
    showCourseProgressPercent = false,
    courseProgressPercentDecimals = 2,
    entranceAnimationActive = false,
    showTooltips = true
}) {
    const { language, t } = useI18n();
    const locale = getLocale(language);
    // Grouper les événements par jour
    const groupByDay = useMemo(() => groupEventsByDay(events, monthFormat, language), [events, monthFormat, language]);

    // Obtenir tous les jours de la semaine
    const days = useMemo(() => {
        const sortedDays = Object.keys(groupByDay).sort((a, b) => {
            const dateA = groupByDay[a][0] ? new Date(groupByDay[a][0].start) : new Date();
            const dateB = groupByDay[b][0] ? new Date(groupByDay[b][0].start) : new Date();
            return dateA - dateB;
        });
        return sortedDays;
    }, [groupByDay]);

    // État pour gérer les jours réduits/développés avec restauration depuis le cache
    const [collapsedDays, setCollapsedDays] = useState(() => {
        if (typeof window === 'undefined') return {};
        try {
            const saved = localStorage.getItem('verticalCollapsedDays');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.warn('[VerticalSchedule] Erreur lors du chargement des jours réduits:', e);
            return {};
        }
    });

    // État pour le toast d'avertissement
    const [showWarningToast, setShowWarningToast] = useState(false);

    const [verticalHeaderTooltipDay, setVerticalHeaderTooltipDay] = useState(null);
    const [verticalCollapsedTooltipDay, setVerticalCollapsedTooltipDay] = useState(null);

    // Fonction pour basculer un jour
    const toggleDay = (day) => {
        setCollapsedDays(prev => {
            // Vérifier si on essaie de fermer le dernier jour ouvert
            const willBeCollapsed = !prev[day];
            if (willBeCollapsed) {
                // Compter combien de jours sont actuellement ouverts
                const openDaysCount = days.filter(d => !prev[d]).length;
                
                // Si c'est le dernier jour ouvert, ne pas le fermer
                if (openDaysCount <= 1) {
                    //console.log('[VerticalSchedule] Impossible de fermer le dernier jour ouvert');
                    // Afficher le toast d'avertissement
                    setShowWarningToast(true);
                    // Masquer automatiquement après 3 secondes
                    setTimeout(() => setShowWarningToast(false), 3000);
                    return prev; // Ne rien changer
                }
            }
            
            const newState = {
                ...prev,
                [day]: willBeCollapsed
            };
            
            // Sauvegarder dans le localStorage
            try {
                localStorage.setItem('verticalCollapsedDays', JSON.stringify(newState));
            } catch (e) {
                console.warn('[VerticalSchedule] Erreur lors de la sauvegarde des jours réduits:', e);
            }
            return newState;
        });
    };

    // Calculer la plage horaire globale pour tous les jours
    // Affiche toujours au minimum de 9h à 18h, mais s'étend si des cours sont en dehors de cette plage
    const globalTimeRange = useMemo(() => {
        const MIN_START = 9 * 60; // 9h00
        const MIN_END = 18 * 60; // 18h00

        if (events.length === 0) {
            return { startMinutes: MIN_START, endMinutes: MIN_END };
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

        return { startMinutes, endMinutes };
    }, [events]);

    const { startMinutes, endMinutes } = globalTimeRange;
    const totalMinutes = endMinutes - startMinutes;
    const timeMarkers = generateTimeMarkers(startMinutes, endMinutes);

    // Détecter si on a besoin de scroll horizontal sur PC
    const [needsScroll, setNeedsScroll] = useState(false);
    const wrapperRef = useRef(null);
    const containerRef = useRef(null);

    // État de chargement (affiche un "Chargement..." centré le temps que le
    // planning soit rendu, pour éviter le flash de cartes qui "sautent").
    // NB : on ne déclenche qu'au montage. Si on se basait sur [events], la classe
    // .event-card--home-entrance serait retirée puis réappliquée à chaque refresh
    // (cache puis sync ICS en arrière-plan) → l'animation d'entrée repartirait
    // à zéro et on verrait l'EDT s'afficher deux fois.
    const [isCalculating, setIsCalculating] = useState(true);
    useEffect(() => {
        let rafId = null;
        const timeoutId = setTimeout(() => {
            rafId = requestAnimationFrame(() => setIsCalculating(false));
        }, 50);
        return () => {
            clearTimeout(timeoutId);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, []);

    const [isMobile, setIsMobile] = useState(false);
    const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null);
    // Détecter un petit écran (mobile) OU app native
    useEffect(() => {
        if (typeof window === 'undefined') return;
        // Si c'est une app native, considérer comme mobile
        if (isPWAInstalled) {
            setIsMobile(true);
            return;
        }
        const mq = window.matchMedia('(max-width: 768px)');
        const update = () => setIsMobile(mq.matches);
        update(); // Appeler immédiatement pour définir la valeur initiale
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, [isPWAInstalled]);

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

    // Charger les compteurs de fichiers en batch avec cache optimisé.
    // Délai de 1000ms : on attend que l'animation d'entrée des cartes soit
    // terminée avant de fetcher (sinon la data arrive en plein milieu de
    // l'animation → re-render des EventCard → frame drop visible).
    const uids = useMemo(() => {
        if (!events || events.length === 0) return [];
        return [...new Set(events.filter(e => e.uid).map(e => e.uid))];
    }, [events]);

    const { fileCounts } = useFileCounts(uids, 1000);

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
            const needsScrollValue = minRequiredWidth > containerWidth;
            setNeedsScroll(needsScrollValue);
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

    // État pour la position actuelle qui se met à jour automatiquement
    const [currentTimePercent, setCurrentTimePercent] = useState(() => {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        return nowMinutes >= startMinutes && nowMinutes <= endMinutes
            ? ((nowMinutes - startMinutes) / totalMinutes) * 100
            : null;
    });

    // Mettre à jour la position régulièrement et quand l'onglet redevient actif
    useEffect(() => {
        // Fonction pour mettre à jour la position
        const updatePosition = () => {
            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const percent = nowMinutes >= startMinutes && nowMinutes <= endMinutes
                ? ((nowMinutes - startMinutes) / totalMinutes) * 100
                : null;
            setCurrentTimePercent(percent);
        };

        // Mise à jour initiale
        updatePosition();

        // Mise à jour toutes les minutes
        const interval = setInterval(updatePosition, 60000);

        // Mise à jour immédiate quand l'onglet redevient actif
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                updatePosition();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [startMinutes, endMinutes, totalMinutes]);

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
            return date.toLocaleString(locale, {
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
            {/* Toast d'avertissement */}
            {showWarningToast && (
                <div className="vertical-warning-toast">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>
                        {language === 'fr' 
                            ? 'Impossible de fermer tous les jours' 
                            : 'Cannot close all days'}
                    </span>
                </div>
            )}
            <div className="vertical-schedule-shell">
                <div
                    ref={containerRef}
                    className="vertical-schedule-container"
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
                        <div 
                            className={`vertical-schedule-header ${!showTimeLabels ? 'no-time-column' : ''}`}
                            style={{
                                gridTemplateColumns: `${showTimeLabels ? '35px' : ''} ${days.map(day => 
                                    collapsedDays[day] ? '50px' : 'minmax(180px, 1fr)'
                                ).join(' ')}`
                            }}
                        >
                            {showTimeLabels && <div className="vertical-time-column-header"></div>}
                            {days.map((day, idx) => {
                                const dayEvents = groupByDay[day];
                                const dayDate = dayEvents[0] ? new Date(dayEvents[0].start) : new Date();
                                const isTodayDay = isToday(dayDate);
                                const isCollapsed = collapsedDays[day] || false;
                                
                                // Extraire les informations du jour pour l'affichage réduit
                                const dayParts = day.split(' '); // Ex: ["Lundi", "30", "mars"]
                                const shortDayName = dayParts[0].slice(0, 3); // "Lun"
                                const dayNumber = dayParts[1] || ''; // "30"
                                const monthName = dayParts[2] ? dayParts[2].slice(0, 3) : ''; // "mar"
                                
                                return (
                                    <div key={idx} className="vertical-schedule-header-tooltip-wrap">
                                        <Tooltip
                                            text={isCollapsed ? t('navbar.clickToExpandDay') : t('navbar.clickToCollapseDay')}
                                            show={showTooltips && verticalHeaderTooltipDay === day}
                                            enabled={showTooltips}
                                            scrollContainerRef={containerRef}
                                        >
                                            <div
                                                className={`vertical-day-header ${isTodayDay ? 'today' : ''} ${isCollapsed ? 'collapsed' : ''}`}
                                                onClick={() => {
                                                    setVerticalHeaderTooltipDay(null);
                                                    toggleDay(day);
                                                }}
                                                onMouseEnter={() => setVerticalHeaderTooltipDay(day)}
                                                onMouseLeave={() => setVerticalHeaderTooltipDay(null)}
                                                style={{ cursor: 'pointer' }}
                                                aria-label={isCollapsed ? t('navbar.clickToExpandDay') : t('navbar.clickToCollapseDay')}
                                            >
                                                {isCollapsed ? (
                                                    <div className="vertical-day-header-collapsed-content">
                                                        <span className="vertical-day-header-short">{shortDayName}</span>
                                                        <span className="vertical-day-header-date">{dayNumber}</span>
                                                        <span className="vertical-day-header-month">{monthName}</span>
                                                    </div>
                                                ) : (
                                                    <h3>{isTodayDay ? `${day}📍` : day}</h3>
                                                )}
                                                {!isCollapsed && (
                                                    <button
                                                        type="button"
                                                        className="vertical-day-collapse-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setVerticalHeaderTooltipDay(null);
                                                            toggleDay(day);
                                                        }}
                                                        aria-label={t('navbar.clickToCollapseDay')}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </Tooltip>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Corps du planning */}
                    <div
                        className={`vertical-schedule-body ${!showTimeLabels ? 'no-time-column' : ''} ${isCalculating ? 'is-loading' : ''}`}
                        style={{
                            gridTemplateColumns: `${showTimeLabels ? '35px' : ''} ${days.map(day =>
                                collapsedDays[day] ? '50px' : 'minmax(180px, 1fr)'
                            ).join(' ')}`
                        }}
                    >
                        {isCalculating && (
                            <div className="vertical-schedule-loading" aria-live="polite">
                                {t('loading.default')}
                            </div>
                        )}
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
                            const isCollapsed = collapsedDays[day] || false;
                            const dayNotesCount = isCollapsed
                                ? (() => {
                                    if (!courseNotes || !Array.isArray(dayEvents) || dayEvents.length === 0) return 0;

                                    let totalNotesForDay = 0;

                                    dayEvents.forEach((ev) => {
                                        if (!ev || !ev.uid) return;

                                        const courseNote = courseNotes.get(ev.uid);
                                        if (!courseNote) return;

                                        const noteEntries = Array.isArray(courseNote.entries)
                                            ? courseNote.entries
                                            : parseStoredNoteValue(courseNote.notes);

                                        // Compter les "notes texte" (on ignore le placeholder invisible)
                                        const notePreviewItems = noteEntries.filter(
                                            (entry) =>
                                                typeof entry === "string" &&
                                                entry !== HIDDEN_LABEL_PLACEHOLDER &&
                                                entry.trim().length > 0
                                        );

                                        // Détecter si le seul contenu est "Distanciel"
                                        const hasDistancielLabel = courseNote && courseNote.entry_labels
                                            ? Object.values(courseNote.entry_labels).some((labelsArray) =>
                                                Array.isArray(labelsArray) && labelsArray.includes("Distanciel")
                                            )
                                            : false;

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

                                        const hasOnlyDistanciel = hasDistancielLabel && notePreviewItems.length === 0 && nonDistancielLabels.length === 0;
                                        if (hasOnlyDistanciel) return;

                                        const totalNoteCountForCourse = notePreviewItems.length > 0
                                            ? notePreviewItems.length
                                            : nonDistancielLabels.length;

                                        totalNotesForDay += totalNoteCountForCourse;
                                    });

                                    return totalNotesForDay;
                                })()
                                : 0;

                            const currentPos = isTodayDay && currentTimePercent !== null
                                ? currentTimePercent
                                : null;

                            let todayCoursesOutlineStyle = null;
                            if (isTodayDay && !isCollapsed && dayEvents.length > 0) {
                                const sortedOutline = [...dayEvents].sort(
                                    (a, b) => new Date(a.start) - new Date(b.start)
                                );
                                let minTop = Infinity;
                                let maxBottom = -Infinity;
                                sortedOutline.forEach((ev, evIdx) => {
                                    const previousEvent = evIdx > 0 ? sortedOutline[evIdx - 1] : null;
                                    const nextEvent =
                                        evIdx < sortedOutline.length - 1 ? sortedOutline[evIdx + 1] : null;
                                    const pos = getEventVerticalPosition(
                                        ev.start,
                                        ev.end_time || ev.end,
                                        previousEvent ? previousEvent.end_time || previousEvent.end : null,
                                        nextEvent ? nextEvent.start : null
                                    );
                                    const topNum = parseFloat(String(pos.top).replace('%', ''), 10);
                                    const hNum = parseFloat(String(pos.height).replace('%', ''), 10);
                                    if (!Number.isFinite(topNum) || !Number.isFinite(hNum)) return;
                                    minTop = Math.min(minTop, topNum);
                                    maxBottom = Math.max(maxBottom, topNum + hNum);
                                });
                                if (Number.isFinite(minTop) && Number.isFinite(maxBottom)) {
                                    const span = Math.max(0.35, maxBottom - minTop);
                                    todayCoursesOutlineStyle = {
                                        top: `${minTop}%`,
                                        height: `${span}%`
                                    };
                                }
                            }

                            return (
                                <div
                                    key={dayIdx}
                                    className={`vertical-day-column ${isTodayDay ? 'today' : ''} ${isCollapsed ? 'collapsed' : ''}`}
                                    style={{ cursor: isCollapsed ? 'pointer' : 'default' }}
                                    aria-label={isCollapsed ? t('navbar.clickToExpandDay') : undefined}
                                >
                                    {!isCollapsed ? (
                                        <>
                                            {/* Indicateur de temps actuel */}
                                            {showCurrentTimeIndicator && currentPos !== null && (
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
                                                <>
                                                    <div
                                                        className="vertical-time-passed-overlay"
                                                        style={{ height: `${currentPos}%`, opacity: timePassedOverlayIntensity }}
                                                    />
                                                    {showCourseProgressPercent && (
                                                        <div
                                                            className="vertical-time-passed-overlay-percentage"
                                                            style={{ top: `${currentPos}%` }}
                                                        >
                                                            <AnimatedCourseProgressLabel
                                                                events={dayEvents}
                                                                fallbackPercent={currentPos}
                                                                decimals={courseProgressPercentDecimals}
                                                            />
                                                        </div>
                                                    )}
                                                </>
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
                                                {todayCoursesOutlineStyle && (
                                                    <div
                                                        className="vertical-today-courses-outline"
                                                        style={todayCoursesOutlineStyle}
                                                        aria-hidden
                                                    />
                                                )}
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
                                                        const notePreviewItems = noteEntries.filter(
                                                            (entry) =>
                                                                typeof entry === "string" &&
                                                                entry !== HIDDEN_LABEL_PLACEHOLDER &&
                                                                entry.trim().length > 0
                                                        );
                                                        const noteHasPersonalEntries =
                                                            agendaRowHasPersonalEntries(courseNote);
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
                                                                fileCount={fileCounts[ev.uid] || 0}
                                                                notePreviewItems={notePreviewItems}
                                                                isDistanciel={hasDistancielLabel}
                                                                nonDistancielLabels={nonDistancielLabels}
                                                                colorPosition={colorPosition}
                                                                colorBackgroundOpacity={colorBackgroundOpacity}
                                                                entranceAnimationActive={entranceAnimationActive && !isCalculating}
                                                                noteHasPersonalEntries={noteHasPersonalEntries}
                                                            />
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </>
                                    ) : (
                                        <Tooltip
                                            text={t('navbar.clickToExpandDay')}
                                            show={showTooltips && verticalCollapsedTooltipDay === day}
                                            enabled={showTooltips}
                                            scrollContainerRef={containerRef}
                                        >
                                            <div
                                                className="vertical-day-collapsed-indicator"
                                                onClick={() => {
                                                    setVerticalCollapsedTooltipDay(null);
                                                    toggleDay(day);
                                                }}
                                                onMouseEnter={() => setVerticalCollapsedTooltipDay(day)}
                                                onMouseLeave={() => setVerticalCollapsedTooltipDay(null)}
                                            >
                                                <div className="vertical-day-collapsed-content">
                                                    <span className="vertical-day-collapsed-text">
                                                        {day.split(' ')[0].slice(0, 3)}
                                                    </span>
                                                    <span className="vertical-day-collapsed-count">
                                                        {dayEvents.length} {dayEvents.length > 1 ? 'cours' : 'cours'}
                                                    </span>
                                                    {dayNotesCount > 0 && (
                                                        <span className="vertical-day-collapsed-notes-count">
                                                            {dayNotesCount} {dayNotesCount > 1 ? t('agenda.tabNotes') : t('agenda.note')}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="vertical-day-collapsed-expand-btn"
                                                        aria-label={t('navbar.clickToExpandDay')}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setVerticalCollapsedTooltipDay(null);
                                                            toggleDay(day);
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(90 12 12)"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </Tooltip>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}



