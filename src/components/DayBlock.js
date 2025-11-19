"use client";
import {forwardRef} from "react";
import {isToday} from "@/utils/dateUtils";
import {getDayTimeRange, generateTimeMarkers, getCurrentTimePosition} from "@/utils/timelineUtils";
import {getCompactModeValues} from "@/utils/compactModeUtils";
import TimelineWrapper from "./Timeline/TimelineWrapper";
import "./DayBlock.css";

const DayBlock = forwardRef(({
    day, 
    events, 
    subjectColors, 
    isCollapsed, 
    onToggle, 
    onOpenEventDetails,
    compactMode = 5,
    showTimeLabels = true,
    hide15MinSpacing = false,
    courseNotes = null
}, ref) => {
    const dayDate = events[0] ? new Date(events[0].start) : new Date();
    const todayCheck = isToday(dayDate);
    const {startMinutes, endMinutes} = getDayTimeRange(events);
    const timeMarkers = generateTimeMarkers(startMinutes, endMinutes);
    const currentPos = todayCheck ? getCurrentTimePosition(dayDate, startMinutes, endMinutes) : null;
    const totalMinutes = endMinutes - startMinutes;

    return (
        <div className={`day-block ${todayCheck ? 'today' : ''} ${isCollapsed ? 'collapsed' : ''}`}
             ref={todayCheck ? ref : null}>
            <div 
                className="day-header" 
                onClick={onToggle}
            >
                <h2>{todayCheck ? `${day}📍` : day}</h2>
                <button className="collapse-toggle" aria-label={isCollapsed ? 'Ouvrir' : 'Fermer'}>
                    {isCollapsed ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                             aria-hidden="true">
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                  strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                             aria-hidden="true">
                            <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                  strokeLinejoin="round"/>
                        </svg>
                    )}
                </button>
            </div>
            {!isCollapsed && (
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
                />
            )}
        </div>
    );
});

DayBlock.displayName = 'DayBlock';

export default DayBlock;
