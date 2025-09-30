"use client";
import {useState, useEffect} from "react";
import {getMonday, getCurrentWeek, extractAvailableWeeks} from "@/utils/dateUtils";
import {createSubjectColorMapping, groupEventsByDay} from "@/utils/eventUtils";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import WeekPicker from "@/components/WeekPicker";
import DayBlock from "@/components/DayBlock";
import styles from "./page.module.css";

export default function Home() {
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [availableWeeks, setAvailableWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [subjectColors, setSubjectColors] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());

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

    useEffect(() => {
        if (!selectedWeek || allEvents.length === 0) return;

        // Toujours afficher toute la semaine (du lundi au dimanche)
        const startDate = new Date(selectedWeek);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(selectedWeek);
        endDate.setDate(selectedWeek.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        const filtered = allEvents.filter((e) => {
            const start = new Date(e.start);
            return start >= startDate && start <= endDate;
        });

        setEvents(filtered);
    }, [selectedWeek, allEvents]);

    useEffect(() => {
        const savedColors = localStorage.getItem("subjectColors");
        if (savedColors) {
            setSubjectColors(JSON.parse(savedColors));
        }
        fetchEvents();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const savedMode = localStorage.getItem("darkMode");
        if (savedMode) setDarkMode(savedMode === "true");
    }, []);

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add("dark-mode");
        else document.documentElement.classList.remove("dark-mode");
        localStorage.setItem("darkMode", darkMode.toString());
    }, [darkMode]);

    const handleRefresh = () => {
        fetchEvents();
    };

    const handleToday = () => {
        const currentWeek = getCurrentWeek();
        const weekToSelect = availableWeeks.find(w => w.monday.getTime() === currentWeek.getTime());
        if (weekToSelect) {
            setSelectedWeek(weekToSelect.monday);
        }
    };

    const handleWeekChange = (newWeekMonday) => {
        setSelectedWeek(newWeekMonday);
    };

    const groupByDay = groupEventsByDay(events);

    return (
        <main className={styles.container}>
            <PageHeader darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)}/>

            {!loading && availableWeeks.length > 0 && (
                <WeekPicker
                    availableWeeks={availableWeeks}
                    selectedWeek={selectedWeek}
                    onWeekChange={handleWeekChange}
                    onRefresh={handleRefresh}
                    onToday={handleToday}
                />
            )}

            {loading && <LoadingSpinner/>}

            {!loading && Object.entries(groupByDay).map(([day, evs]) => (
                <DayBlock
                    key={day}
                    day={day}
                    events={evs}
                    subjectColors={subjectColors}
                />
            ))}
        </main>
    );
}