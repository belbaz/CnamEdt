"use client";
import {useState, useEffect} from "react";
import {getMonday, getCurrentWeek, extractAvailableWeeks} from "@/utils/dateUtils";
import {createSubjectColorMapping, groupEventsByDay} from "@/utils/eventUtils";
import {fetchICSEvents, loadEventsFromCache, saveEventsToCache} from "@/services/icsService";
import {useCapacitor, useSplashScreen} from "@/hooks/useCapacitor";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import WeekPicker from "@/components/WeekPicker";
import DayBlock from "@/components/DayBlock";
import styles from "./page.module.css";

export default function Home() {
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [availableWeeks, setAvailableWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [subjectColors, setSubjectColors] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Hook Capacitor pour mobile
    const {isNative, capacitorReady, Capacitor, Http, SplashScreen} = useCapacitor();
    
    // Gérer le splash screen (cacher quand chargé)
    useSplashScreen(SplashScreen, !loading);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError(null);
            setDebugInfo(null);
            
            const debug = {
                capacitorAvailable: !!Capacitor,
                isNativePlatform: isNative,
                protocol: window.location.protocol,
                href: window.location.href,
                userAgent: window.navigator.userAgent.substring(0, 100)
            };
            
            console.log('[EDT] Fetching events - Native:', isNative);
            
            let data;
            try {
                // Utiliser le service ICS unifié
                data = await fetchICSEvents(isNative, Http);
            } catch (fetchError) {
                console.error('[EDT] Fetch exception:', fetchError);
                debug.fetchError = fetchError.message;
                debug.fetchStack = fetchError.stack;
                setDebugInfo(debug);
                throw fetchError;
            }

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

            // Sauvegarder dans le cache
            saveEventsToCache(data, colorMapping);
        } catch (err) {
            console.error('[EDT] Error:', err);
            setError(err.message);
            if (!debugInfo) {
                setDebugInfo({
                    error: err.message,
                    stack: err.stack,
                    capacitorAvailable: !!Capacitor,
                    isNativePlatform: Capacitor && Capacitor.isNativePlatform(),
                    protocol: window.location.protocol,
                    href: window.location.href
                });
            }
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
        // Attendre que Capacitor soit prêt avant de charger
        if (!capacitorReady) return;
        
        // Charger immédiatement depuis le cache si disponible
        const cached = loadEventsFromCache();
        if (cached) {
            console.log('[EDT] Cache chargé, affichage immédiat');
            setAllEvents(cached.events);
            setSubjectColors(cached.colors);
            
            const weeks = extractAvailableWeeks(cached.events);
            setAvailableWeeks(weeks);
            
            const currentWeek = getCurrentWeek();
            const weekToSelect = weeks.find(w => w.monday.getTime() === currentWeek.getTime()) || weeks[0];
            setSelectedWeek(weekToSelect?.monday);
            
            setLoading(false);
        }
        
        // Puis refresh en arrière-plan
        fetchEvents();
    }, [capacitorReady]);

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

            {error && (
                <div style={{
                    padding: '1rem',
                    margin: '1rem 0',
                    background: '#fee',
                    border: '2px solid #c00',
                    borderRadius: '8px',
                    color: '#000',
                    maxHeight: '400px',
                    overflow: 'auto'
                }}>
                    <h3 style={{color: '#c00', margin: '0 0 1rem 0'}}>❌ Erreur</h3>
                    <div style={{marginBottom: '1rem', fontSize: '14px'}}>
                        <strong>Message:</strong> {error}
                    </div>
                    
                    {debugInfo && (
                        <details style={{marginTop: '1rem', fontSize: '12px', fontFamily: 'monospace'}}>
                            <summary style={{cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem'}}>
                                🔍 Informations de débogage (cliquer pour voir)
                            </summary>
                            <div style={{
                                background: '#fff',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                marginTop: '0.5rem'
                            }}>
                                <div><strong>Mode:</strong> {debugInfo.isNativePlatform ? '📱 MOBILE (APK)' : '🌐 WEB'}</div>
                                <div><strong>Capacitor disponible:</strong> {debugInfo.capacitorAvailable ? 'Oui ✅' : 'Non ❌'}</div>
                                <div><strong>Plateforme native:</strong> {debugInfo.isNativePlatform ? 'Oui ✅' : 'Non ❌'}</div>
                                <div><strong>Protocole:</strong> {debugInfo.protocol}</div>
                                <div><strong>URL:</strong> {debugInfo.href}</div>
                                {debugInfo.fetchError && (
                                    <>
                                        <hr style={{margin: '0.5rem 0'}} />
                                        <div><strong>Erreur Fetch:</strong> {debugInfo.fetchError}</div>
                                    </>
                                )}
                                {debugInfo.userAgent && (
                                    <div style={{marginTop: '0.5rem', fontSize: '10px', color: '#666'}}>
                                        <strong>User Agent:</strong> {debugInfo.userAgent}
                                    </div>
                                )}
                            </div>
                        </details>
                    )}
                </div>
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