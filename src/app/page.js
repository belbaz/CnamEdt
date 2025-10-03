"use client";
import {useState, useEffect, useRef} from "react";
import {getMonday, getCurrentWeek, extractAvailableWeeks} from "@/utils/dateUtils";
import {createSubjectColorMapping, groupEventsByDay} from "@/utils/eventUtils";
import {fetchICSEvents, loadEventsFromCache, saveEventsToCache} from "@/services/icsService";
import {useCapacitor, useSplashScreen} from "@/hooks/useCapacitor";
import {usePullToRefresh} from "@/hooks/usePullToRefresh";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import DayBlock from "@/components/DayBlock";
import ScrollToTop from "@/components/ScrollToTop";
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
    const [autoScrollToday, setAutoScrollToday] = useState(true);
    const [collapsedDays, setCollapsedDays] = useState({});
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [showOfflineToast, setShowOfflineToast] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Hook Capacitor pour mobile
    const {isNative, capacitorReady, Capacitor, Http, SplashScreen} = useCapacitor();

    // Gérer le splash screen (cacher quand chargé)
    useSplashScreen(SplashScreen, !loading);

    // Pull-to-refresh sur mobile
    usePullToRefresh(isNative, () => fetchEvents());

    // Ref pour le jour actuel
    const todayRef = useRef(null);

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

            let data;
            try {
                // Utiliser le service ICS unifié
                data = await fetchICSEvents(isNative, Http);
            } catch (fetchError) {
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

    // Détecter un petit écran (smartphone) côté web pour adopter l'UI mobile
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const update = () => setIsSmallScreen(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    // Suivre l'état en ligne/hors-ligne et afficher un toast discret sur mobile
    useEffect(() => {
        const setOnline = () => setIsOnline(true);
        const setOffline = () => setIsOnline(false);
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
        window.addEventListener('online', setOnline);
        window.addEventListener('offline', setOffline);
        return () => {
            window.removeEventListener('online', setOnline);
            window.removeEventListener('offline', setOffline);
        };
    }, []);

    useEffect(() => {
        const isMobile = isNative || isSmallScreen;
        if (isMobile && !isOnline) {
            setShowOfflineToast(true);
            const t = setTimeout(() => setShowOfflineToast(false), 3000);
            return () => clearTimeout(t);
        }
    }, [isOnline, isNative, isSmallScreen]);

    useEffect(() => {
        const savedMode = localStorage.getItem("darkMode");
        if (savedMode) setDarkMode(savedMode === "true");

        const savedAutoScroll = localStorage.getItem("autoScrollToday");
        if (savedAutoScroll !== null) setAutoScrollToday(savedAutoScroll === "true");

        const savedCollapsedDays = localStorage.getItem("collapsedDays");
        if (savedCollapsedDays) {
            try {
                setCollapsedDays(JSON.parse(savedCollapsedDays));
            } catch (e) {
                console.error('Erreur chargement collapsed days:', e);
            }
        }
    }, []);

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add("dark-mode");
        else document.documentElement.classList.remove("dark-mode");
        localStorage.setItem("darkMode", darkMode.toString());
    }, [darkMode]);

    // Scroll vers aujourd'hui quand les événements sont chargés
    useEffect(() => {
        if (settingsOpen) return;
        if (!loading && autoScrollToday && events.length > 0) {
            // Attendre que le DOM soit rendu (un peu plus long pour l'animation)
            setTimeout(scrollToToday, 800);
        }
    }, [loading, autoScrollToday, events, settingsOpen]);

    // Quand on ferme les paramètres, si autoScrollToday est activé, déclencher un scroll
    useEffect(() => {
        if (!settingsOpen && autoScrollToday && events.length > 0) {
            setTimeout(scrollToToday, 300);
        }
    }, [settingsOpen]);

    // Fonction pour scroller vers le jour actuel avec animation
    const scrollToToday = () => {
        if (todayRef.current) {
            // Calculer la hauteur de la navbar
            const navbar = document.querySelector('.navbar-container');
            const navbarHeight = navbar ? navbar.offsetHeight : 0;

            // Position de l'élément
            const element = todayRef.current;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navbarHeight - 20;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            console.log('[Scroll] Navbar height:', navbarHeight);
            console.log('[Scroll] Element position:', elementPosition);
            console.log('[Scroll] Scrolling to:', offsetPosition);
        }
    };

    const handleRefresh = () => {
        fetchEvents();
    };

    const handleToday = () => {
        const currentWeek = getCurrentWeek();
        const weekToSelect = availableWeeks.find(w => w.monday.getTime() === currentWeek.getTime());
        if (weekToSelect) {
            setSelectedWeek(weekToSelect.monday);
            // Scroll après un délai pour laisser le temps au DOM de se mettre à jour
            setTimeout(scrollToToday, 400);
        }
    };

    const handleWeekChange = (newWeekMonday) => {
        setSelectedWeek(newWeekMonday);
    };

    const handleToggleAutoScroll = (enabled) => {
        setAutoScrollToday(enabled);
        localStorage.setItem('autoScrollToday', enabled.toString());
    };

    const handleToggleDay = (day) => {
        const newCollapsedDays = {
            ...collapsedDays,
            [day]: !collapsedDays[day]
        };
        setCollapsedDays(newCollapsedDays);
        localStorage.setItem('collapsedDays', JSON.stringify(newCollapsedDays));
    };

    const handleToggleAllDays = () => {
        const dayKeys = Object.keys(groupByDay);
        if (dayKeys.length === 0) return;
        const someExpanded = dayKeys.some(d => !collapsedDays[d]);
        const nextCollapsed = {};
        for (const d of dayKeys) {
            nextCollapsed[d] = someExpanded; // if any expanded -> collapse all; else expand all
        }
        setCollapsedDays(nextCollapsed);
        localStorage.setItem('collapsedDays', JSON.stringify(nextCollapsed));
    };

    const groupByDay = groupEventsByDay(events);

    return (
        <div>
            <Navbar
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                availableWeeks={availableWeeks}
                selectedWeek={selectedWeek}
                onWeekChange={handleWeekChange}
                onRefresh={handleRefresh}
                onToday={handleToday}
                autoScrollToday={autoScrollToday}
                onToggleAutoScroll={handleToggleAutoScroll}
                showRefreshButton={!(isNative || isSmallScreen)}
                isMobile={isNative || isSmallScreen}
                onSettingsOpenChange={setSettingsOpen}
                onToggleAllDays={handleToggleAllDays}
                allDaysCollapsed={Object.keys(groupByDay).length > 0 && Object.keys(groupByDay).every(d => collapsedDays[d])}
            />

            <main className={styles.container}>

                {error && !(isNative || isSmallScreen) && (
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
                                    <div>
                                        <strong>Mode:</strong> {debugInfo.isNativePlatform ? '📱 MOBILE (APK)' : '🌐 WEB'}
                                    </div>
                                    <div><strong>Capacitor
                                        disponible:</strong> {debugInfo.capacitorAvailable ? 'Oui ✅' : 'Non ❌'}</div>
                                    <div><strong>Plateforme
                                        native:</strong> {debugInfo.isNativePlatform ? 'Oui ✅' : 'Non ❌'}</div>
                                    <div><strong>Protocole:</strong> {debugInfo.protocol}</div>
                                    <div><strong>URL:</strong> {debugInfo.href}</div>
                                    {debugInfo.fetchError && (
                                        <>
                                            <hr style={{margin: '0.5rem 0'}}/>
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
                        ref={todayRef}
                        day={day}
                        events={evs}
                        subjectColors={subjectColors}
                        isCollapsed={collapsedDays[day] || false}
                        onToggle={() => handleToggleDay(day)}
                        onOpenEventDetails={(ev) => setSelectedEvent(ev)}
                    />
                ))}
            </main>

            <ScrollToTop/>

            {(isNative || isSmallScreen) && showOfflineToast && (
                <div style={{
                    position: 'fixed',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-lg)',
                    borderRadius: '999px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    zIndex: 10001
                }}>
                    Vous êtes hors connexion
                </div>
            )}

            {selectedEvent && (
                <div className="event-modal-layer" aria-modal="true" role="dialog">
                    <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}/>
                    <div className="event-modal">
                        <div className="event-modal-header">
                            <div className="event-modal-title">
                                {selectedEvent.summary || selectedEvent.description || 'Cours'}
                            </div>
                            <button className="event-modal-close" aria-label="Fermer"
                                    onClick={() => setSelectedEvent(null)}>✕
                            </button>
                        </div>
                        <div className="event-modal-content">
                            <div className="pop-row">
                                <span>⏰</span>{new Date(selectedEvent.start).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })} - {new Date(selectedEvent.end).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</div>
                            {selectedEvent.prof && <div className="pop-row"><span>👤</span>{selectedEvent.prof}</div>}
                            {selectedEvent.location &&
                                <div className="pop-row"><span>📍</span>{selectedEvent.location}</div>}
                            {selectedEvent.description && <div className="pop-desc">{selectedEvent.description}</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}