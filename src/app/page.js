"use client";
import {useState, useEffect, useRef} from "react";
import {getMonday, getCurrentWeek, extractAvailableWeeks, selectBestWeek} from "@/utils/dateUtils";
import {createSubjectColorMapping, groupEventsByDay} from "@/utils/eventUtils";
import {fetchICSEvents, loadEventsFromCache, saveEventsToCache} from "@/services/icsService";
import {addTestCoursesForToday, isTestModeEnabled, setTestMode} from "@/services/testDataService";
import {useCapacitor, useSplashScreen} from "@/hooks/useCapacitor";
import {usePullToRefresh} from "@/hooks/usePullToRefresh";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import DayBlock from "@/components/DayBlock";
import VerticalSchedule from "@/components/VerticalSchedule";
import ScrollToTop from "@/components/ScrollToTop";
import ApkDownloadPopup from "@/components/ApkDownloadPopup";
import UpdateChecker from "@/components/UpdateChecker";
import Footer from "@/components/Footer";
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
    const [testMode, setTestModeState] = useState(false);
    const [todaySpacing, setTodaySpacing] = useState(0);
    const [shouldScrollToToday, setShouldScrollToToday] = useState(false);
    const compactMode = 5; // Fixe à 5 (Normal) - Modifier cette valeur pour changer la compacité
    const [viewMode, setViewMode] = useState('horizontal'); // 'horizontal' or 'vertical'
    const [showTimeLabels, setShowTimeLabels] = useState(true); // Afficher les labels d'heures

    // Hook Capacitor pour mobile
    const {isNative, capacitorReady, Capacitor, Http, SplashScreen} = useCapacitor();

    // Gérer le splash screen (cacher quand chargé)
    useSplashScreen(SplashScreen, !loading);

    // Pull-to-refresh sur mobile
    usePullToRefresh(isNative, () => fetchEvents());

    // Ref pour le jour actuel
    const todayRef = useRef(null);
    
    // Ref pour le UpdateChecker
    const updateCheckerRef = useRef(null);

    const fetchEvents = async () => {
        try {
            // Ne pas remettre loading à true si on a déjà des données à afficher
            if (allEvents.length === 0) {
                setLoading(true);
            }
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
                // Récupérer les données normales
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

            const weekToSelect = selectBestWeek(weeks);
            setSelectedWeek(weekToSelect?.monday);

            // Sauvegarder dans le cache
            saveEventsToCache(data, colorMapping);
            // Mettre à jour le timestamp dans l'état
            setLastUpdateTimestamp(new Date().toISOString());
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
                
                if (weeks.length > 0) {
                    const weekToSelect = selectBestWeek(weeks);
                    setSelectedWeek(weekToSelect?.monday);
                }

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

        // Initialiser le mode test
        setTestModeState(isTestModeEnabled());

        // Charger immédiatement depuis le cache si disponible
        const cached = loadEventsFromCache();
        if (cached) {
            setAllEvents(cached.events);
            setSubjectColors(cached.colors);

            const weeks = extractAvailableWeeks(cached.events);
            setAvailableWeeks(weeks);

            const weekToSelect = selectBestWeek(weeks);
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

    // Fermer la modale d'événement avec la touche Échap
    useEffect(() => {
        if (!selectedEvent) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSelectedEvent(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedEvent]);

    // Navigation au clavier : Ctrl + Flèche droite/gauche pour changer de semaine
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Vérifier si Ctrl est pressé et si c'est une flèche gauche ou droite
            if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                
                if (availableWeeks.length === 0 || !selectedWeek) return;
                
                const currentWeekIndex = availableWeeks.findIndex(
                    w => selectedWeek && w.monday.getTime() === selectedWeek.getTime()
                );
                
                if (currentWeekIndex === -1) return;
                
                if (e.key === 'ArrowLeft' && currentWeekIndex > 0) {
                    // Semaine précédente
                    setSelectedWeek(availableWeeks[currentWeekIndex - 1].monday);
                } else if (e.key === 'ArrowRight' && currentWeekIndex < availableWeeks.length - 1) {
                    // Semaine suivante
                    setSelectedWeek(availableWeeks[currentWeekIndex + 1].monday);
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [availableWeeks, selectedWeek]);

    // Détecter un petit écran (smartphone) côté web pour adopter l'UI mobile
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const update = () => setIsSmallScreen(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    // Recalculer l'espacement quand la fenêtre est redimensionnée
    useEffect(() => {
        const handleResize = () => {
            if (todaySpacing > 0) {
                // Recalculer l'espacement après redimensionnement
                setTimeout(() => {
                    if (todayRef.current) {
                        const navbar = document.querySelector('.navbar-container');
                        const isNavbarVisible = navbar && !navbar.classList.contains('scrolled');
                        const navbarHeight = isNavbarVisible ? navbar.offsetHeight : 0;
                        const viewportHeight = window.innerHeight;
                        const dayHeight = todayRef.current.offsetHeight;
                        const newSpacing = Math.max(0, viewportHeight - navbarHeight - dayHeight - 20);
                        setTodaySpacing(newSpacing);
                    }
                }, 100);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [todaySpacing]);

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

    // État pour le timestamp de dernière mise à jour
    const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null);

    // Charger le timestamp au montage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const timestamp = localStorage.getItem('lastUpdateTimestamp');
            if (timestamp) {
                setLastUpdateTimestamp(timestamp);
            }
        }
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
                // Erreur silencieuse lors du chargement des jours repliés
            }
        }

        // Compacité fixe, plus de sauvegarde dans localStorage

        const savedViewMode = localStorage.getItem("viewMode");
        if (savedViewMode) setViewMode(savedViewMode);

        const savedShowTimeLabels = localStorage.getItem("showTimeLabels");
        if (savedShowTimeLabels !== null) setShowTimeLabels(savedShowTimeLabels === "true");
    }, []);

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add("dark-mode");
        else document.documentElement.classList.remove("dark-mode");
        localStorage.setItem("darkMode", darkMode.toString());
        try {
            document.cookie = `darkMode=${darkMode ? 'true' : 'false'}; path=/; SameSite=Lax`;
        } catch (e) {}
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

    // Gérer l'ouverture du jour d'aujourd'hui après avoir changé de semaine via le bouton "Aujourd'hui"
    useEffect(() => {
        if (!shouldScrollToToday || events.length === 0) return;

        // Attendre que groupByDay soit mis à jour
        setTimeout(() => {
            const today = new Date();
            const todayDateString = today.toDateString();
            const newCollapsedDays = { ...collapsedDays };
            let todayDayKey = null;

            // Fermer tous les jours de la semaine actuelle
            Object.keys(groupByDay).forEach(dayKey => {
                newCollapsedDays[dayKey] = true;

                // Vérifier si ce jour correspond à aujourd'hui
                const dayEvents = groupByDay[dayKey];
                if (dayEvents && dayEvents.length > 0) {
                    const firstEventDate = new Date(dayEvents[0].start);
                    if (firstEventDate.toDateString() === todayDateString) {
                        todayDayKey = dayKey;
                    }
                }
            });

            // Ouvrir seulement le jour d'aujourd'hui s'il existe dans cette semaine
            if (todayDayKey) {
                newCollapsedDays[todayDayKey] = false;
            } else {
                // Si aujourd'hui n'existe pas dans cette semaine, ouvrir tous les jours
                Object.keys(groupByDay).forEach(dayKey => {
                    newCollapsedDays[dayKey] = false;
                });
            }

            setCollapsedDays(newCollapsedDays);
            localStorage.setItem('collapsedDays', JSON.stringify(newCollapsedDays));

            // Scroll vers le jour
            setTimeout(() => {
                scrollToToday();
            }, 200);

            // Réinitialiser le flag
            setShouldScrollToToday(false);
        }, 100);
    }, [shouldScrollToToday, events]);

    // Fonction pour scroller vers le jour actuel avec animation
    const scrollToToday = () => {
        if (todayRef.current) {
            // Vérifier si la navbar est visible (pas en mode scrolled)
            const navbar = document.querySelector('.navbar-container');
            const isNavbarVisible = navbar && !navbar.classList.contains('scrolled');
            const navbarHeight = isNavbarVisible ? navbar.offsetHeight : 0;

            // Position de l'élément
            const element = todayRef.current;
            const elementPosition = element.getBoundingClientRect().top;
            
            // Calculer l'espacement nécessaire pour positionner le jour juste sous la navbar
            const viewportHeight = window.innerHeight;
            const dayHeight = element.offsetHeight;
            const spacingNeeded = Math.max(0, viewportHeight - navbarHeight - dayHeight - 20); // 20px de marge réduite
            
            // Définir l'espacement pour le jour d'aujourd'hui
            setTodaySpacing(spacingNeeded);
            
            // Position finale : juste sous la navbar (ou en haut si navbar cachée)
            const offsetPosition = elementPosition + window.pageYOffset - (isNavbarVisible ? navbarHeight + 10 : 10);

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    const handleRefresh = () => {
        fetchEvents();
    };

    const handleToday = () => {
        // Utiliser la sélection intelligente de semaine
        const weekToSelect = selectBestWeek(availableWeeks);
        
        if (weekToSelect) {
            setSelectedWeek(weekToSelect.monday);
            // Indiquer qu'on doit ouvrir le jour d'aujourd'hui après le changement de semaine
            setShouldScrollToToday(true);
        }
    };

    const handleWeekChange = (newWeekMonday) => {
        setSelectedWeek(newWeekMonday);
    };

    const handleToggleAutoScroll = (enabled) => {
        setAutoScrollToday(enabled);
        localStorage.setItem('autoScrollToday', enabled.toString());
    };

    // Compacité fixe, plus de fonction de changement

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem('viewMode', mode);
    };

    const handleToggleTimeLabels = (enabled) => {
        setShowTimeLabels(enabled);
        localStorage.setItem('showTimeLabels', enabled.toString());
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

    const handleToggleTestMode = () => {
        if (!testMode) {
            // Activer le mode test : ajouter des cours pour aujourd'hui si nécessaire
            
            // Vérifier si aujourd'hui a déjà des cours (version simplifiée)
            const today = new Date();
            const todayString = today.toDateString();
            const hasCoursesToday = allEvents.some(event => {
                if (!event.start) return false;
                const eventDate = new Date(event.start);
                return eventDate.toDateString() === todayString;
            });
            
            if (hasCoursesToday) {
                alert('Aujourd\'hui a déjà des cours ! Le bouton n\'ajoute des cours de test que si la journée est vide.');
                return;
            }
            
            // Créer des cours de test pour aujourd'hui
            const testEvents = [];
            const courses = [
                { subject: 'Mathématiques Appliquées', prof: 'M. Dupont', location: 'Salle A101' },
                { subject: 'Informatique', prof: 'Mme Martin', location: 'Labo Informatique' },
                { subject: 'Économie', prof: 'M. Bernard', location: 'Salle B205' },
                { subject: 'Gestion de Projet', prof: 'Mme Dubois', location: 'Salle C301' }
            ];
            
            for (let i = 0; i < 4; i++) {
                const startHour = 9 + i * 2; // 9h, 11h, 13h, 15h
                const course = courses[i];
                
                const startTime = new Date(today);
                startTime.setHours(startHour, 0, 0, 0);
                
                const endTime = new Date(today);
                endTime.setHours(startHour + 2, 0, 0, 0);
                
                testEvents.push({
                    summary: course.subject,
                    start: startTime,
                    end: endTime,
                    location: course.location,
                    description: `Professeur : ${course.prof}\nMatière : ${course.subject}\n\n[Cours de test généré automatiquement]`
                });
            }
            
            const eventsWithTest = [...allEvents, ...testEvents];
            
            setAllEvents(eventsWithTest);
            
            // Mettre à jour les couleurs et semaines
            const colorMapping = createSubjectColorMapping(eventsWithTest);
            setSubjectColors(colorMapping);
            
            const weeks = extractAvailableWeeks(eventsWithTest);
            setAvailableWeeks(weeks);
            
            // S'assurer que la semaine actuelle est sélectionnée
            const currentWeek = getCurrentWeek();
            const weekToSelect = weeks.find(w => w.monday.getTime() === currentWeek.getTime());
            if (weekToSelect) {
                setSelectedWeek(weekToSelect.monday);
            }
            
            // Sauvegarder dans le cache
            saveEventsToCache(eventsWithTest, colorMapping);
            
            setTestModeState(true);
            setTestMode(true);
        } else {
            // Désactiver le mode test : recharger les données normales
            setTestModeState(false);
            setTestMode(false);
            fetchEvents();
        }
    };

    const handleCheckUpdates = () => {
        if (updateCheckerRef.current) {
            updateCheckerRef.current.checkForUpdates();
        }
    };

    const groupByDay = groupEventsByDay(events);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
            {/* Popup de téléchargement APK pour Android (web uniquement) */}
            <ApkDownloadPopup />
            
            {/* Vérification des mises à jour (app native uniquement) */}
            <UpdateChecker 
                ref={updateCheckerRef}
                currentVersion="2.0.10" 
                isNative={isNative} 
            />

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
                testMode={testMode}
                onToggleTestMode={handleToggleTestMode}
                compactMode={compactMode}
                isNative={isNative}
                currentVersion="2.0.10"
                onCheckUpdates={handleCheckUpdates}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                showTimeLabels={showTimeLabels}
                onToggleTimeLabels={handleToggleTimeLabels}
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

                {loading && events.length === 0 && <LoadingSpinner/>}

                {(!loading || events.length > 0) && viewMode === 'vertical' ? (
                    <VerticalSchedule
                        events={events}
                        subjectColors={subjectColors}
                        onOpenEventDetails={(ev) => setSelectedEvent(ev)}
                        compactMode={compactMode}
                        showTimeLabels={showTimeLabels}
                    />
                ) : (
                    Object.entries(groupByDay).map(([day, evs], index) => {
                        const dayDate = evs[0] ? new Date(evs[0].start) : new Date();
                        const isToday = dayDate.toDateString() === new Date().toDateString();
                        
                        return (
                            <div key={day}>
                                <DayBlock
                                    ref={isToday ? todayRef : null}
                                    day={day}
                                    events={evs}
                                    subjectColors={subjectColors}
                                    isCollapsed={collapsedDays[day] || false}
                                    onToggle={() => handleToggleDay(day)}
                                    onOpenEventDetails={(ev) => setSelectedEvent(ev)}
                                    compactMode={compactMode}
                                    showTimeLabels={showTimeLabels}
                                />
                                {isToday && todaySpacing > 0 && (
                                    <div 
                                        style={{
                                            height: `${todaySpacing}px`,
                                            width: '100%',
                                            background: 'transparent'
                                        }}
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
                        );
                    })
                )}
            </main>

            <Footer onCheckUpdates={handleCheckUpdates} />

            <ScrollToTop/>

            {(isNative || isSmallScreen) && showOfflineToast && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#10b981',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    padding: '0.6rem 1rem',
                    fontSize: '0.85rem',
                    zIndex: 10001,
                    maxWidth: 'calc(100% - 2rem)',
                    textAlign: 'center'
                }}>
                    {lastUpdateTimestamp 
                        ? `Dernière mise à jour : ${new Date(lastUpdateTimestamp).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}`
                        : 'Mode hors connexion'
                    }
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