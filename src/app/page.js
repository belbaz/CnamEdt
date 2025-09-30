"use client";
import {useState, useEffect} from "react";

export default function Home() {
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [availableWeeks, setAvailableWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [subjectColors, setSubjectColors] = useState({});

    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/fetch-ics");
            if (!res.ok) throw new Error("Impossible de récupérer l'emploi du temps");
            const data = await res.json();

            if (!data || data.length === 0) {
                throw new Error("Aucun emploi du temps trouvé");
            }

            data.sort((a, b) => new Date(a.start) - new Date(b.start));
            setAllEvents(data);

            // Créer le mapping des couleurs par matière
            const colorMapping = createSubjectColorMapping(data);
            setSubjectColors(colorMapping);

            const weeks = extractAvailableWeeks(data);
            setAvailableWeeks(weeks);

            const currentWeek = getCurrentWeek();
            const weekToSelect = weeks.find(w => w.monday.getTime() === currentWeek.getTime()) || weeks[0];
            setSelectedWeek(weekToSelect?.monday);

            localStorage.setItem("events", JSON.stringify(data));
            localStorage.setItem("subjectColors", JSON.stringify(colorMapping));
        } catch (err) {
            setError(err.message);
            const saved = localStorage.getItem("events");
            const savedColors = localStorage.getItem("subjectColors");
            if (saved) {
                const data = JSON.parse(saved);
                setAllEvents(data);
                const weeks = extractAvailableWeeks(data);
                setAvailableWeeks(weeks);
                if (weeks.length > 0) setSelectedWeek(weeks[0].monday);
                
                if (savedColors) {
                    setSubjectColors(JSON.parse(savedColors));
                } else {
                    setSubjectColors(createSubjectColorMapping(data));
                }
            }
        } finally {
            setLoading(false);
        }
    };

    // Créer un mapping des matières vers les couleurs
    const createSubjectColorMapping = (data) => {
        const subjectsSet = new Set();
        
        // Extraire toutes les matières uniques
        data.forEach(event => {
            let matiere = event.summary?.trim() || "";
            matiere = matiere.replace(/^(USS|UAS)[A-Z0-9]*\s*:\s*/i, "").trim();
            
            if (matiere && matiere !== ":") {
                subjectsSet.add(matiere);
            }
        });

        // Convertir en tableau et trier alphabétiquement pour cohérence
        const subjects = Array.from(subjectsSet).sort();
        
        // Assigner une couleur fixe à chaque matière
        const mapping = {};
        subjects.forEach((subject, index) => {
            mapping[subject] = index % 5; // 5 couleurs disponibles
        });

        return mapping;
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
        // Charger les couleurs sauvegardées au démarrage
        const savedColors = localStorage.getItem("subjectColors");
        if (savedColors) {
            setSubjectColors(JSON.parse(savedColors));
        }
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

    // Obtenir l'index de couleur pour une matière
    function getColorIndexForSubject(matiere) {
        if (!matiere) return 0;
        // Utiliser le mapping prédéfini
        return subjectColors[matiere] ?? 0;
    }

    // Toggle dark mode
    useEffect(() => {
        const savedMode = localStorage.getItem("darkMode");
        if (savedMode) {
            setDarkMode(savedMode === "true");
        }
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark-mode");
        } else {
            document.documentElement.classList.remove("dark-mode");
        }
        localStorage.setItem("darkMode", darkMode.toString());
    }, [darkMode]);

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
            <div className="page-header">
                <div className="header-content">
                    <div>
                        <h1 className="page-title">Mon Emploi du Temps</h1>
                        <p className="page-subtitle">Consultez votre planning de la semaine</p>
                    </div>
                    <button 
                        className="theme-toggle" 
                        onClick={() => setDarkMode(!darkMode)}
                        title={darkMode ? "Mode clair" : "Mode sombre"}
                    >
                        {darkMode ? "☀️" : "🌙"}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Chargement de votre emploi du temps...</p>
                </div>
            )}

            {!loading && (
                <>
                    <div className="controls">
                        <button className="refresh-btn" onClick={fetchEvents} title="Actualiser">🔄</button>

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

                    {error && <div className="error">{error}</div>}
                    {Object.keys(groupByDay).length === 0 && !error && (
                        <div className="no-events">
                            Aucun événement trouvé pour cette période
                        </div>
                    )}
                    {Object.entries(groupByDay).map(([day, evs]) => (
                        <div key={day} className="day-block">
                            <h2>{day}</h2>
                            <div className="events-container">
                                <ul>
                                    {evs.map((ev, idx) => {
                                        const {matiere, prof, description} = getEventTitle(ev);
                                        const location = ev.location?.replace(/^Salle\s*:\s*/, "").trim();
                                        const colorIndex = getColorIndexForSubject(matiere || description);

                                        return (
                                            <li
                                                key={idx}
                                                className="event-card"
                                                data-index={colorIndex}
                                            >
                                                <div className="event-time">
                                                    {new Date(ev.start).toLocaleTimeString("fr-FR", {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })} - {new Date(ev.end).toLocaleTimeString("fr-FR", {
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
                                                    {prof && <span className="prof">{prof}</span>}
                                                    {location && (
                                                        <div className="location">{location}</div>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </main>
    );
}