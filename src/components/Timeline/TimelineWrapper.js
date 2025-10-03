"use client";
import TimeMarkers from "./TimeMarkers";
import TimePassedOverlay from "./TimePassedOverlay";
import CurrentTimeIndicator from "./CurrentTimeIndicator";
import EventsList from "./EventsList";
import "./TimelineWrapper.css";

export default function TimelineWrapper({
    timeMarkers,
    startMinutes,
    endMinutes,
    totalMinutes,
    currentPos,
    events,
    subjectColors,
    onOpenEventDetails
}) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650;

    return (
        <div
            className="timeline-wrapper"
            style={isMobile ? {height: `${totalMinutes}px`} : {}}
        >
            <TimeMarkers
                markers={timeMarkers}
                startMinutes={startMinutes}
                endMinutes={endMinutes}
                totalMinutes={totalMinutes}
            />

            <TimePassedOverlay currentPos={currentPos}/>

            <CurrentTimeIndicator currentPos={currentPos}/>

            <EventsList
                events={events}
                startMinutes={startMinutes}
                endMinutes={endMinutes}
                totalMinutes={totalMinutes}
                subjectColors={subjectColors}
                onOpenEventDetails={onOpenEventDetails}
            />
        </div>
    );
}
