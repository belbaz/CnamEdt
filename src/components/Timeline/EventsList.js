"use client";
import EventCard from "./EventCard";
import {getEventPosition, getEventPositionVertical} from "@/utils/timelineUtils";
import "./EventsList.css";

export default function EventsList({events, startMinutes, endMinutes, totalMinutes, subjectColors}) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650;

    return (
        <div
            className="events-container"
            style={isMobile ? {height: `${totalMinutes}px`} : {}}
        >
            <ul style={isMobile ? {height: '100%'} : {}}>
                {events.map((ev, idx) => {
                    let stylePos;
                    if (isMobile) {
                        const pos = getEventPositionVertical(ev.start, ev.end, startMinutes, endMinutes);
                        stylePos = {
                            top: pos.top,
                            height: pos.height,
                            left: "0",
                            right: "0",
                            position: "absolute"
                        };
                    } else {
                        const pos = getEventPosition(ev.start, ev.end, startMinutes, endMinutes);
                        stylePos = {left: pos.left, width: pos.width};
                    }
                    return (
                        <EventCard
                            key={idx}
                            event={ev}
                            stylePos={stylePos}
                            subjectColors={subjectColors}
                        />
                    );
                })}
            </ul>
        </div>
    );
}
