"use client";
import {useState, useEffect} from "react";

export default function Home() {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);

    const fetchEvents = async () => {
        try {
            setError(null);
            const res = await fetch("/api/fetch-ics");
            if (!res.ok) throw new Error("Impossible de récupérer l’EDT");
            const data = await res.json();

            const now = new Date();
            const day = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - ((day + 6) % 7));
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const filtered = data.filter((e) => {
                const start = new Date(e.start);
                return start >= monday && start <= sunday;
            });

            filtered.sort((a, b) => new Date(a.start) - new Date(b.start));

            setEvents(filtered);
            localStorage.setItem("events", JSON.stringify(filtered));
        } catch (err) {
            setError(err.message);
            const saved = localStorage.getItem("events");
            if (saved) setEvents(JSON.parse(saved));
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    function getEventTitle(ev) {
        const desc = ev.description || ev.summary || "";
        const match = desc.match(/^(.*?)-?\s*Professeur\s*:\s*-?\s*(.*)$/i);
        if (match) {
            return {title: match[1].trim(), prof: match[2].trim()};
        }
        return {title: desc.trim(), prof: ""};
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

    return (
        <main className="container">
            <h1>📅 Edt EICNAM</h1>
            <button onClick={fetchEvents}>🔄 Mettre à jour</button>

            {error && <p className="error">{error}</p>}
            {Object.keys(groupByDay).length === 0 && <p>Aucun événement trouvé.</p>}

            {Object.entries(groupByDay).map(([day, evs]) => (
                <div key={day} className="day-block">
                    <h2>{day}</h2>
                    <ul>
                        {evs.map((ev, idx) => {
                            const {title, prof} = getEventTitle(ev);
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
                                        <strong>{title}</strong>
                                        {prof && <span className="prof"> - {prof}</span>}
                                        {ev.location && (
                                            <div className="location">
                                                {ev.location.replace(/^(Salle\s*:\s*)/, "").trim()}
                                            </div>
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
