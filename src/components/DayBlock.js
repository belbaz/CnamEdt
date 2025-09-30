"use client";
import {isToday} from "@/utils/dateUtils";
import {getDayTimeRange, generateTimeMarkers, getCurrentTimePosition} from "@/utils/timelineUtils";
import TimelineWrapper from "./Timeline/TimelineWrapper";
import "./DayBlock.css";

export default function DayBlock({day, events, subjectColors}) {
    const dayDate = events[0] ? new Date(events[0].start) : new Date();
    const todayCheck = isToday(dayDate);
    const {startMinutes, endMinutes} = getDayTimeRange(events);
    const timeMarkers = generateTimeMarkers(startMinutes, endMinutes);
    const currentPos = todayCheck ? getCurrentTimePosition(dayDate, startMinutes, endMinutes) : null;
    const totalMinutes = endMinutes - startMinutes;

    return (
        <div className="day-block">
            <h2>{day}</h2>
            <TimelineWrapper
                timeMarkers={timeMarkers}
                startMinutes={startMinutes}
                endMinutes={endMinutes}
                totalMinutes={totalMinutes}
                currentPos={currentPos}
                events={events}
                subjectColors={subjectColors}
            />
        </div>
    );
}
