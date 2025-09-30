"use client";
import {useState, useEffect} from "react";

export default function Home() {
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [error, setError] = useState(null);
    const [availableWeeks, setAvailableWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState(null);

    const fetchEvents = async () => {
        try {
            setError(null);
            const res = await fetch("/api/fetch-ics");
            if (!res.ok) throw new Error("Impossible de récupérer l'EDT");
            const data = await res.json();

            data.sort((a, b) => new Date(a.start) - new Date(b.start));
            setAllEvents(data);

            const weeks = extractAvailableWeeks(data);
            setAvailableWeeks(weeks);

            const currentWeek = getCurrentWeek();
            const weekToSelect = weeks.find(w => w.monday.getTime() === currentWeek.getTime()) || weeks[0];
            setSelectedWeek(weekToSelect?.monday);

            localStorage.setItem("events", JSON.stringify(data));
        } catch (err) {
            setError(err.message);
            const saved = localStorage.getItem("events");
            if (saved) {
                const data = JSON.parse(saved);
                setAllEvents(data);
                const weeks = extractAvailableWeeks(data);
                setAvailableWeeks(weeks);
                if (weeks.length > 0) setSelectedWeek(weeks[0].monday);
            }
        }
    };

    const extractAvailableWeeks = (data) => {
        const weeksMap = new Map();

        data.forEach(event => {
            const eventDate = new Date(event.start);
            const monday = getMonday(eventDate);
            const key = monday.toISOString();

            if (!weeksMap.has(key)) {
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                sunday.setHours(23, 59, 59, 999);

                weeksMap.set(key, {
                    monday,
                    sunday,
                    label: `${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                });
            }
        });

        return Array.from(weeksMap.values()).sort((a, b) => a.monday - b.monday);
    };

    const getMonday = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - ((day + 6) % 7);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    const getCurrentWeek = () => {
        return getMonday(new Date());
    };

    useEffect(() => {
        if (!selectedWeek || allEvents.length === 0) return;

        const now = new Date();
        const currentWeekMonday = getMonday(now);

        let startDate;
        if (selectedWeek.getTime() === currentWeekMonday.getTime()) {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(selectedWeek);
            startDate.setHours(0, 0, 0, 0);
        }

        let endDate = new Date(selectedWeek);
        endDate.setDate(selectedWeek.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        const filtered = allEvents.filter((e) => {
            const start = new Date(e.start);
            return start >= startDate && start <= endDate;
        });

        setEvents(filtered);
    }, [selectedWeek, allEvents]);

    useEffect(() => {
        fetchEvents();
    }, []);

    function getEventTitle(ev) {
        let matiere = ev.summary?.trim() || "";
        const description = ev.description || "";
        let prof = "";

        matiere = matiere.replace(/^(USS|UAS)[A-Z0-9]*\s*:\s*/i, "").trim();

        const match = description.match(/Professeur\s*:\s*-?\s*(.*)$/i);
        if (match) {
            prof = match[1].trim();
        }

        return {matiere, prof, description};
    }

    const groupByDay = events.reduce((acc, ev) => {
        const d = new Date(ev.start);
        const key = d.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
        });
        if (!acc[key]) acc[key] = [];
        acc[key].push(ev);
        return acc;
    }, {});

    const colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6A4C93", "#FFA69E"];

    const goToPreviousWeek = () => {
        const currentIndex = availableWeeks.findIndex(w => w.monday.getTime() === selectedWeek.getTime());
        if (currentIndex > 0) {
            setSelectedWeek(availableWeeks[currentIndex - 1].monday);
        }
    };

    const goToNextWeek = () => {
        const currentIndex = availableWeeks.findIndex(w => w.monday.getTime() === selectedWeek.getTime());
        if (currentIndex < availableWeeks.length - 1) {
            setSelectedWeek(availableWeeks[currentIndex + 1].monday);
        }
    };

    const goToCurrentWeek = () => {
        const currentWeek = getCurrentWeek();
        const weekToSelect = availableWeeks.find(w => w.monday.getTime() === currentWeek.getTime());
        if (weekToSelect) {
            setSelectedWeek(weekToSelect.monday);
        }
    };

    const currentIndex = availableWeeks.findIndex(w => w.monday.getTime() === selectedWeek?.getTime());
    const isFirstWeek = currentIndex === 0;
    const isLastWeek = currentIndex === availableWeeks.length - 1;
    const isCurrentWeek = selectedWeek?.getTime() === getCurrentWeek().getTime();

    return (
        <main className="container">
            <div className="controls">
                <button onClick={fetchEvents}>🔄</button>

                {availableWeeks.length > 0 && selectedWeek && (
                    <div className="week-picker">
                        <button
                            className="week-nav"
                            onClick={goToPreviousWeek}
                            disabled={isFirstWeek}
                        >
                            ◀
                        </button>

                        <div className="week-display">
                            <div className="week-label">Semaine du</div>
                            <div className="week-date">
                                {availableWeeks[currentIndex]?.label}
                            </div>
                        </div>

                        <button
                            className="week-nav"
                            onClick={goToNextWeek}
                            disabled={isLastWeek}
                        >
                            ▶
                        </button>

                        {!isCurrentWeek && (
                            <button
                                className="today-btn"
                                onClick={goToCurrentWeek}
                            >
                                Aujourd'hui
                            </button>
                        )}
                    </div>
                )}
            </div>

            {error && <p className="error">{error}</p>}
            {Object.keys(groupByDay).length === 0 && <p>Aucun événement trouvé.</p>}
            {Object.entries(groupByDay).map(([day, evs]) => (
                <div key={day} className="day-block">
                    <h2>{day}</h2>
                    <ul>
                        {evs.map((ev, idx) => {
                            const {matiere, prof, description} = getEventTitle(ev);
                            // Simplification du traitement de location
                            const location = ev.location?.replace(/^Salle\s*:\s*/, "").trim();

                            return (
                                <li
                                    key={idx}
                                    className="event-card"
                                    style={{borderLeft: `6px solid ${colors[idx % colors.length]}`}}
                                >
                                    <div className="event-time">
                                        {new Date(ev.start).toLocaleTimeString("fr-FR", {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })} → {new Date(ev.end).toLocaleTimeString("fr-FR", {
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })}
                                    </div>
                                    <div className="event-info">
                                        {matiere && matiere !== ":" ? (
                                            <strong>{matiere}</strong>
                                        ) : (
                                            description && <strong>{description}</strong>
                                        )}
                                        {prof && <span className="prof"> – {prof}</span>}
                                        {location && (
                                            <div className="location">Salle : {location}</div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </main>
    );
}