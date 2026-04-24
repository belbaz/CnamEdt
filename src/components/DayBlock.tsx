"use client";
import {forwardRef, useMemo, useState, useEffect} from "react";
import {isToday} from "@/utils/dateUtils";
import {getDayTimeRange, generateTimeMarkers, getCurrentTimePosition} from "@/utils/timelineUtils";
import {getCompactModeValues} from "@/utils/compactModeUtils";
import {useI18n} from "@/i18n/I18nContext";
import TimelineWrapper from "./Timeline/TimelineWrapper";
import "./DayBlock.css";

const DayBlock = forwardRef<HTMLDivElement, any>(({
    day,
    events,
    subjectColors,
    isCollapsed,
    onToggle,
    onOpenEventDetails,
    compactMode = 5,
    showTimeLabels = true,
    hide15MinSpacing = false,
    courseNotes = null,
    showCurrentTimeIndicator = true,
    colorPosition = 'background',
    colorBackgroundOpacity = 0.6,
    timePassedOverlayIntensity = 0.5,
    showCourseProgressPercent = false,
    courseProgressPercentDecimals = 2,
    entranceAnimationActive = false
}, ref) => {
    const { t } = useI18n();
    // Mémoriser les calculs pour éviter de les refaire à chaque rendu
    const dayDate = useMemo(() => events[0] ? new Date(events[0].start) : new Date(), [events]);
    const todayCheck = useMemo(() => isToday(dayDate), [dayDate]);

    // On calcule toujours la timeline : le contenu reste monté pour permettre
    // une animation de repli/déploiement fluide (via grid-template-rows)
    const timeRange = useMemo(() => getDayTimeRange(events), [events]);
    const {startMinutes, endMinutes} = timeRange;

    const timeMarkers = useMemo(
        () => generateTimeMarkers(startMinutes, endMinutes),
        [startMinutes, endMinutes]
    );

    // État pour la position actuelle qui se met à jour automatiquement
    const [currentPos, setCurrentPos] = useState<number | null>(() => {
        if (!todayCheck) return null;
        return getCurrentTimePosition(dayDate, startMinutes, endMinutes) as number | null;
    });

    // Mettre à jour la position régulièrement et quand l'onglet redevient actif
    useEffect(() => {
        if (!todayCheck) {
            setCurrentPos(null);
            return;
        }

        // Fonction pour mettre à jour la position
        const updatePosition = () => {
            const pos = getCurrentTimePosition(dayDate, startMinutes, endMinutes) as number | null;
            setCurrentPos(pos);
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
    }, [todayCheck, dayDate, startMinutes, endMinutes]);

    const totalMinutes = useMemo(() => endMinutes - startMinutes, [startMinutes, endMinutes]);

    return (
        <div className={`day-block ${todayCheck ? 'today' : ''} ${isCollapsed ? 'collapsed' : ''}`}
             ref={todayCheck ? ref : null}
             title={isCollapsed ? t('navbar.clickToExpandDay') : ''}
        >
            <div
                className="day-header"
                onClick={onToggle}
                title={isCollapsed ? t('navbar.clickToExpandDay') : t('navbar.clickToCollapseDay')}
            >
                <h2>{todayCheck ? `${day}📍` : day}</h2>
                <button
                    className="collapse-toggle"
                    aria-label={isCollapsed ? t('navbar.clickToExpandDay') : t('navbar.clickToCollapseDay')}
                    title={isCollapsed ? t('navbar.clickToExpandDay') : t('navbar.clickToCollapseDay')}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                         aria-hidden="true">
                        <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                              strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>
            <div className="day-content" aria-hidden={isCollapsed}>
                <div className="day-content-inner">
                    <TimelineWrapper
                        timeMarkers={timeMarkers}
                        startMinutes={startMinutes}
                        endMinutes={endMinutes}
                        totalMinutes={totalMinutes}
                        currentPos={currentPos}
                        events={events}
                        subjectColors={subjectColors}
                        onOpenEventDetails={onOpenEventDetails}
                        compactMode={compactMode}
                        showTimeLabels={showTimeLabels}
                        hide15MinSpacing={hide15MinSpacing}
                        courseNotes={courseNotes}
                        showCurrentTimeIndicator={showCurrentTimeIndicator}
                        colorPosition={colorPosition}
                        colorBackgroundOpacity={colorBackgroundOpacity}
                        timePassedOverlayIntensity={timePassedOverlayIntensity}
                        showCourseProgressPercent={showCourseProgressPercent}
                        courseProgressPercentDecimals={courseProgressPercentDecimals}
                        entranceAnimationActive={entranceAnimationActive}
                    />
                </div>
            </div>
        </div>
    );
});

DayBlock.displayName = 'DayBlock';

export default DayBlock;

