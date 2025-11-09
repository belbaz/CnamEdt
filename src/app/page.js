"use client";
import {useState, useEffect, useRef, useMemo, Suspense} from "react";
import MapViewer from "@/components/MapViewer/MapViewer";
import {useSearchParams} from "next/navigation";
import {getMonday, getCurrentWeek, extractAvailableWeeks, selectBestWeek} from "@/utils/dateUtils";
import {createSubjectColorMapping, groupEventsByDay, getEventTitle} from "@/utils/eventUtils";
import {useDevMode} from "@/utils/env";
import {fetchICSEvents, loadEventsFromCache, saveEventsToCache} from "@/services/icsService";
import {addTestCoursesForToday, isTestModeEnabled, setTestMode, generateTestWeek, isTestWeekEnabled, setTestWeekMode} from "@/services/testDataService";
import {useCapacitor, useSplashScreen} from "@/hooks/useCapacitor";
import {useNetworkStatus} from "@/hooks/useNetworkStatus";
import {usePullToRefresh} from "@/hooks/usePullToRefresh";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import DayBlock from "@/components/DayBlock";
import VerticalSchedule from "@/components/VerticalSchedule";
import ScrollToTop from "@/components/ScrollToTop";
import ApkDownloadPopup from "@/components/ApkDownloadPopup";
import UpdateChecker from "@/components/UpdateChecker";
import Footer from "@/components/Footer";
import OfflineNotification from "@/components/OfflineNotification";
import PermissionRequest from "@/components/PermissionRequest";
import SubjectHoursInfo from "@/components/SubjectHoursInfo";
import DevNotification from "@/components/DevNotification";
import styles from "./page.module.css";
import "@/components/VerticalSchedule.css";
import {saveSnapshotIfChanged} from "@/utils/historyService";

// Fonction pour générer l'event_key (identique à celle dans fetch-ics/route.js)
function generateEventKey(ev) {
    const s = new Date(ev.start).toISOString();
    const sum = (ev.summary || '').trim();
    const loc = (ev.location || '').trim();
    return `${s}|${sum}|${loc}`;
}

function HomeContent({searchParams}) {
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [availableWeeks, setAvailableWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [oledMode, setOledMode] = useState(false);
    const [subjectColors, setSubjectColors] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());
    const [autoScrollToday, setAutoScrollToday] = useState(true);
    const [collapsedDays, setCollapsedDays] = useState({});
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showMap, setShowMap] = useState(false);
    const [hasNetworkError, setHasNetworkError] = useState(false);
    const [testMode, setTestModeState] = useState(false);
    const [testWeekMode, setTestWeekModeState] = useState(false);
    const [todaySpacing, setTodaySpacing] = useState(0);
    const [shouldScrollToToday, setShouldScrollToToday] = useState(false);
    const compactMode = 5; // Fixe à 5 (Normal) - Modifier cette valeur pour changer la compacité
    const [viewMode, setViewMode] = useState('horizontal'); // 'horizontal' or 'vertical'
    const [showTimeLabels, setShowTimeLabels] = useState(true); // Afficher les labels d'heures
    // Animation de transition de semaine: 'next' | 'prev' | null
    const [weekTransitionDirection, setWeekTransitionDirection] = useState(null);
    const previousWeekIndexRef = useRef(null);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    // Notification de debug pour le mode dev
    const [devNotification, setDevNotification] = useState(null);
    const [showDevNotification, setShowDevNotification] = useState(false);
    
    // Présence d'un deep-link vers un cours précis
    const eventKeyParam = searchParams?.get('eventKey');

    const formatDurationHM = (start, end) => {
        if (!start || !end) return null;
        const s = new Date(start);
        const e = new Date(end);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
        const ms = e.getTime() - s.getTime();
        if (ms <= 0) return null;
        const totalMinutes = Math.round(ms / (1000 * 60));
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h > 0 && m === 0) return `${h}h`;
        if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
        return `${m}min`;
    };

    // Calculer les heures totales et effectuées pour une matière donnée
    const getSubjectHoursStats = (subjectName, referenceEvent = null) => {
        if (!subjectName || subjectName === ':') return null;

        const now = new Date();
        const referenceDateInput = referenceEvent
            ? (referenceEvent.end_time || referenceEvent.end || referenceEvent.start || null)
            : null;
        const referenceDate = (() => {
            if (!referenceDateInput) return now;
            const parsed = new Date(referenceDateInput);
            return isNaN(parsed.getTime()) ? now : parsed;
        })();
        const referenceTimestamp = referenceDate.getTime();
        const msPerHour = 1000 * 60 * 60;

        let totalHours = 0;
        let completedHours = 0;

        allEvents.forEach(event => {
            const {matiere} = getEventTitle(event);
            if (matiere !== subjectName) return;

            const start = new Date(event.start);
            const endDate = event.end_time || event.end;
            if (!endDate) return;

            const end = new Date(endDate);

            // Vérifier que les dates sont valides
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

            const durationMs = end.getTime() - start.getTime();
            if (durationMs <= 0) return;

            const durationHours = durationMs / msPerHour;
            totalHours += durationHours;

            const startMs = start.getTime();
            const endMs = end.getTime();

            if (endMs <= referenceTimestamp) {
                completedHours += durationHours;
                return;
            }

            if (referenceTimestamp > startMs && referenceTimestamp < endMs) {
                const partialMs = referenceTimestamp - startMs;
                if (partialMs > 0) {
                    completedHours += partialMs / msPerHour;
                }
            }
        });

        const remainingHours = Math.max(totalHours - completedHours, 0);

        return {
            total: totalHours,
            completed: completedHours,
            remaining: remainingHours,
            percentage: totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0
        };
    };

    // Formater les heures décimales en format lisible
    const formatHoursDecimal = (decimalHours) => {
        if (decimalHours == null || isNaN(decimalHours) || decimalHours === 0) return "0h";
        const totalMinutes = Math.round(decimalHours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h > 0 && m === 0) return `${h}h`;
        if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
        return `${m}min`;
    };

    // Extraire l'identifiant de la matière depuis le summary (ex: USSI0D)
    const extractCourseIdFromSummary = (summary) => {
        if (!summary || typeof summary !== 'string') return null;
        // Tente: SUMMARY:USSI0D : ... ou USSI0D : ...
        const m = summary.match(/^\s*(?:SUMMARY:)?\s*([A-Z]{3,}[A-Z0-9]*)\s*:/i);
        return m ? m[1].toUpperCase() : null;
    };

    // Détecter le type de cours (Cours / TD / TP / ED) depuis summary/description
    const extractCourseType = (ev) => {
        const text = `${ev?.summary || ''} ${ev?.description || ''}`.toLowerCase();
        if (!text.trim()) return null;
        if (/(\bexercices?\s*dirigés?\b|\bed\b)/i.test(text)) return 'Exercices dirigés';
        if (/\btd\b/i.test(text)) return 'Travaux dirigés';
        if (/\btp\b/i.test(text)) return 'Travaux pratiques';
        if (/\bcours\b/i.test(text)) return 'Cours';
        return null;
    };

    // Détecter le site CNAM (Conté ou Saint-Martin) depuis la localisation
    const getCnamSite = (location) => {
        if (!location || typeof location !== 'string') return null;
        
        // Extraire le numéro de rue depuis la localisation
        // Format attendu: "Salle : 30.2.12" ou "30.2.12" ou "Salle 30-2-12"
        const cleaned = location.replace(/^Salle\s*:\s*/i, '').trim();
        
        // Extraire le premier nombre (numéro de rue)
        const match = cleaned.match(/^(\d+)(bis)?[\.\-\s]/i);
        if (!match) return null;
        
        const streetNumber = match[1];
        const isBis = !!match[2];
        
        // Site Conté : 30, 31, 33, 34, 35, 37, 39
        const conteNumbers = ['30', '31', '33', '34', '35', '37', '39'];
        
        // Site Saint-Martin : 1, 2, 3, 4, 5, 6, 7, 9, 9bis, 10, 11, 12, 13, 14, 15, 16, 17, 21, 23, 27
        const saintMartinNumbers = ['1', '2', '3', '4', '5', '6', '7', '9', '10', '11', '12', '13', '14', '15', '16', '17', '21', '23', '27'];
        
        if (conteNumbers.includes(streetNumber)) {
            return { site: 'Conté', color: '#10b981' }; // Vert émeraude
        }
        
        if (saintMartinNumbers.includes(streetNumber) || (streetNumber === '9' && isBis)) {
            return { site: 'St-Martin', color: '#f59e0b' }; // Orange ambre
        }
        
        return null;
    };

    // Retourne l'année scolaire sous forme [yyyyStart, yyyyEnd] en se basant sur la date du cours
    // Règle: année scolaire commence en septembre (mois >= 8)
    const getAcademicYearParts = (dateLike) => {
        const d = new Date(dateLike || Date.now());
        if (isNaN(d.getTime())) {
            const now = new Date();
            const y = now.getFullYear();
            const start = now.getMonth() >= 8 ? y : y - 1;
            return [start, start + 1];
        }
        const y = d.getFullYear();
        const start = d.getMonth() >= 8 ? y : y - 1;
        return [start, start + 1];
    };

    // Hook Capacitor pour mobile
    const {isNative, capacitorReady, Capacitor, Http, SplashScreen} = useCapacitor();
    const {isOnline} = useNetworkStatus();
    const devMode = useDevMode();

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

            // Vérifier si on est en ligne avant d'essayer de fetch
            if (!isOnline) {
                // En mode hors ligne, utiliser le cache si disponible
                const cached = loadEventsFromCache();
                if (cached) {
                    console.log('[Page] Mode hors ligne - Utilisation du cache');
            setAllEvents(cached.events);
                    setSubjectColors(cached.colors);
                    const weeks = extractAvailableWeeks(cached.events);
                    setAvailableWeeks(weeks);
            if (!eventKeyParam && weeks.length > 0) {
                const weekToSelect = selectBestWeek(weeks);
                setSelectedWeek(weekToSelect?.monday);
            }
                    setLoading(false);
                    return; // Sortir sans erreur
                } else {
                    throw new Error('Mode hors connexion - Aucune donnée en cache disponible');
                }
            }

            const debug = {
                capacitorAvailable: !!Capacitor,
                isNativePlatform: isNative,
                protocol: window.location.protocol,
                href: window.location.href,
                userAgent: window.navigator.userAgent.substring(0, 100)
            };

            let response;
            try {
                // Récupérer les données normales
                response = await fetchICSEvents(isNative, Http);
            } catch (fetchError) {
                // Si l'erreur est due à la connexion, essayer le cache
                const isNetworkError = !isOnline ||
                    fetchError.message.includes('Failed to fetch') ||
                    fetchError.message.includes('réseau') ||
                    fetchError.message.includes('network') ||
                    fetchError.message.includes('fetch failed');

                if (isNetworkError) {
                    setHasNetworkError(true); // Déclencher la notification hors ligne
                    const cached = loadEventsFromCache();
                    if (cached) {
                        console.log('[Page] Erreur réseau - Utilisation du cache');
                        setAllEvents(cached.events);
                        setSubjectColors(cached.colors);
                        const weeks = extractAvailableWeeks(cached.events);
                        setAvailableWeeks(weeks);
                        if (!eventKeyParam && weeks.length > 0) {
                            const weekToSelect = selectBestWeek(weeks);
                            setSelectedWeek(weekToSelect?.monday);
                        }
                        setLoading(false);
                        // Ne pas afficher l'erreur si on a réussi à charger depuis le cache
                        setError(null);
                        setDebugInfo(null);
                        return; // Sortir sans erreur
                    }
                }

                // Si on arrive ici, on n'a pas de cache ou ce n'est pas une erreur réseau
                debug.fetchError = fetchError.message;
                debug.fetchStack = fetchError.stack;
                setDebugInfo(debug);
                throw fetchError;
            }

            const eventsData = Array.isArray(response?.events)
                ? response.events
                : Array.isArray(response)
                    ? response
                    : [];

            const meta = response?.meta || {};
            const diff = response?.diff || { added: [], updated: [], removed: [] };
            const shouldSkipHistory = typeof meta.changed === 'number' ? meta.changed === 0 : false;

            if (!eventsData || eventsData.length === 0) {
                throw new Error("Aucun emploi du temps trouvé");
            }

            eventsData.sort((a, b) => new Date(a.start) - new Date(b.start));
            setAllEvents(eventsData);

            const colorMapping = createSubjectColorMapping(eventsData);
            setSubjectColors(colorMapping);

            const weeks = extractAvailableWeeks(eventsData);
            setAvailableWeeks(weeks);
            if (!eventKeyParam) {
                const weekToSelect = selectBestWeek(weeks);
                setSelectedWeek(weekToSelect?.monday);
            }

            // Sauvegarder dans le cache
            saveEventsToCache(eventsData, colorMapping);

            // Historiser les matières détectées si elles ont changé
            await saveSnapshotIfChanged(eventsData, {skip: shouldSkipHistory});
            // Mettre à jour le timestamp dans l'état
            setLastUpdateTimestamp(new Date().toISOString());
            // Réinitialiser l'erreur réseau si on a réussi à charger
            setHasNetworkError(false);
            
            // Afficher une notification de debug en mode dev
            if (devMode) {
                const totalChanges = diff.added.length + diff.updated.length + diff.removed.length;
                
                // Compter les champs modifiés
                const fieldChanges = {};
                if (diff.updated && Array.isArray(diff.updated)) {
                    diff.updated.forEach(update => {
                        if (update.changedFields && Array.isArray(update.changedFields)) {
                            update.changedFields.forEach(change => {
                                const fieldName = change.split(':')[0].trim();
                                fieldChanges[fieldName] = (fieldChanges[fieldName] || 0) + 1;
                            });
                        }
                    });
                }
                
                // Créer le message avec les champs modifiés
                let notificationMsg = `📊 Events: ${eventsData.length} | Changes: ${totalChanges}`;
                if (diff.added.length > 0) notificationMsg += ` | +${diff.added.length} added`;
                if (diff.updated.length > 0) {
                    notificationMsg += ` | ~${diff.updated.length} updated`;
                    const fieldsList = Object.entries(fieldChanges)
                        .map(([field, count]) => `${field}(${count})`)
                        .join(', ');
                    if (fieldsList) {
                        notificationMsg += ` [${fieldsList}]`;
                    }
                }
                if (diff.removed.length > 0) notificationMsg += ` | -${diff.removed.length} removed`;
                
                setDevNotification(notificationMsg);
                setShowDevNotification(true);
                
                // Logger aussi dans la console
                console.log('[DEV] Sync summary:', notificationMsg);
                if (Object.keys(fieldChanges).length > 0) {
                    console.log('[DEV] Modified fields breakdown:', fieldChanges);
                }
            }
        } catch (err) {
            // Vérifier si c'est une erreur réseau et si on a du cache
            const isNetworkError = err.message.includes('Failed to fetch') ||
                err.message.includes('réseau') ||
                err.message.includes('network') ||
                err.message.includes('fetch failed');

            const saved = loadEventsFromCache();
            if (isNetworkError && saved) {
                setHasNetworkError(true); // Déclencher la notification hors ligne
                // Si c'est une erreur réseau et qu'on a du cache, utiliser le cache sans afficher l'erreur
                console.log('[Page] Erreur réseau - Utilisation du cache (fallback)');
                setAllEvents(saved.events);
                setSubjectColors(saved.colors);
                const weeks = extractAvailableWeeks(saved.events);
                setAvailableWeeks(weeks);
                if (!eventKeyParam && weeks.length > 0) {
                    const weekToSelect = selectBestWeek(weeks);
                    setSelectedWeek(weekToSelect?.monday);
                }
                setError(null);
                setDebugInfo(null);
            } else {
                // Afficher l'erreur seulement si on n'a pas de cache ou si ce n'est pas une erreur réseau
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

                // Essayer quand même le cache comme dernier recours
                if (saved) {
                    const data = saved.events;
                    setAllEvents(data);
                    const weeks = extractAvailableWeeks(data);
                    setAvailableWeeks(weeks);

                    if (!eventKeyParam && weeks.length > 0) {
                        const weekToSelect = selectBestWeek(weeks);
                        setSelectedWeek(weekToSelect?.monday);
                    }

                    if (saved.colors) {
                        setSubjectColors(saved.colors);
                    } else {
                        setSubjectColors(createSubjectColorMapping(data));
                    }
                }
            }
        } finally {
            setLoading(false);
        }
    };

    // Extraire la liste des matières depuis allEvents
    const subjects = useMemo(() => {
        return Array.from(new Set(
            allEvents
                .map(event => {
                    const {matiere} = getEventTitle(event);
                    return matiere && matiere !== ":" ? matiere : null;
                })
                .filter(Boolean)
        )).sort();
    }, [allEvents]);

    // Nettoyer les matières sélectionnées qui ne sont plus disponibles
    useEffect(() => {
        setSelectedSubjects(prev => {
            if (subjects.length > 0 && prev.length > 0) {
                const validSubjects = prev.filter(subject => subjects.includes(subject));
                if (validSubjects.length !== prev.length) {
                    return validSubjects;
                }
            } else if (subjects.length === 0 && prev.length > 0) {
                return [];
            }
            return prev;
        });
    }, [subjects]);

    useEffect(() => {
        if (!selectedWeek || allEvents.length === 0) return;

        // Toujours afficher toute la semaine (du lundi au dimanche)
        const startDate = new Date(selectedWeek);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(selectedWeek);
        endDate.setDate(selectedWeek.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        let filtered = allEvents.filter((e) => {
            const start = new Date(e.start);
            return start >= startDate && start <= endDate;
        });

        // Filtrer par matières sélectionnées si des filtres sont actifs
        if (selectedSubjects.length > 0) {
            filtered = filtered.filter((e) => {
                const {matiere} = getEventTitle(e);
                return matiere && selectedSubjects.includes(matiere);
            });
        }

        // Si un eventKey est présent dans l'URL, filtrer pour n'afficher que ce cours
        const eventKeyParam = searchParams?.get('eventKey');
        if (eventKeyParam) {
            const decodedKey = decodeURIComponent(eventKeyParam);
            filtered = filtered.filter((e) => {
                const key = generateEventKey(e);
                return key === decodedKey;
            });
        }

        setEvents(filtered);
    }, [selectedWeek, allEvents, searchParams, selectedSubjects]);

    // Si un eventKey est présent dans l'URL, naviguer vers la semaine du cours
    useEffect(() => {
        const eventKeyParam = searchParams?.get('eventKey');
        if (!eventKeyParam || allEvents.length === 0) return;

        const decodedKey = decodeURIComponent(eventKeyParam);
        // Trouver l'événement correspondant
        const matchingEvent = allEvents.find((e) => {
            const key = generateEventKey(e);
            return key === decodedKey;
        });

        if (matchingEvent) {
            // Trouver le lundi de la semaine contenant cet événement
            const eventDate = new Date(matchingEvent.start);
            const monday = getMonday(eventDate);

            // Vérifier si cette semaine est disponible
            const weeks = extractAvailableWeeks(allEvents);
            const weekExists = weeks.some(w => w.monday.getTime() === monday.getTime());

            if (weekExists && (!selectedWeek || selectedWeek.getTime() !== monday.getTime())) {
                setSelectedWeek(monday);
            }
        }
    }, [searchParams, allEvents, selectedWeek]);

    // Déterminer la direction de transition lorsque la semaine change
    useEffect(() => {
        if (!selectedWeek || availableWeeks.length === 0) return;
        const currentIndex = availableWeeks.findIndex(w => w.monday.getTime() === selectedWeek.getTime());
        const previousIndex = previousWeekIndexRef.current;
        if (previousIndex !== null && previousIndex !== undefined && currentIndex !== -1) {
            if (currentIndex > previousIndex) setWeekTransitionDirection('next');
            else if (currentIndex < previousIndex) setWeekTransitionDirection('prev');
        }
        if (currentIndex !== -1) previousWeekIndexRef.current = currentIndex;
    }, [selectedWeek, availableWeeks]);

    useEffect(() => {
        // Attendre que Capacitor soit prêt avant de charger
        if (!capacitorReady) return;

        // Initialiser le mode test
        setTestModeState(isTestModeEnabled());
        setTestWeekModeState(isTestWeekEnabled());

        // L'état réseau vient du hook cross-plateforme

        // Charger immédiatement depuis le cache si disponible
        const cached = loadEventsFromCache();
        if (cached) {
            console.log('[Page] Chargement depuis le cache');
            setAllEvents(cached.events);
            setSubjectColors(cached.colors);

            const weeks = extractAvailableWeeks(cached.events);
            setAvailableWeeks(weeks);
            if (!eventKeyParam) {
                const weekToSelect = selectBestWeek(weeks);
                setSelectedWeek(weekToSelect?.monday);
            }

            setLoading(false);
        }

        // Si on est en ligne, faire un refresh en arrière-plan pour mettre à jour
        // Si on est hors ligne, on utilise seulement le cache (déjà chargé)
        if (isOnline) {
            fetchEvents();
        } else {
            console.log('[Page] Mode hors ligne - Utilisation du cache uniquement');
            // Si on est hors ligne, déclencher la notification une seule fois
            setHasNetworkError(true);
        }
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

    // Navigation par swipe horizontal pour changer de semaine (mobile uniquement)
    useEffect(() => {
        // Ne s'activer que sur mobile
        if (!isNative && !isSmallScreen) return;

        let touchStartX = null;
        let touchStartY = null;
        let touchStartTime = null;
        const minSwipeDistance = 50; // Distance minimale pour considérer un swipe
        const maxSwipeTime = 500; // Temps maximum pour un swipe (ms)
        const maxVerticalDistance = 100; // Distance verticale maximale pour considérer un swipe horizontal

        const handleTouchStart = (e) => {
            const touch = e.touches[0];
            const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);

            // Vérifier que le touch ne part pas de la zone VerticalSchedule (EDT)
            const verticalScheduleContainer = document.querySelector('.vertical-schedule-container');
            if (verticalScheduleContainer && verticalScheduleContainer.contains(targetElement)) {
                return; // Ne pas gérer le swipe si on est dans la zone EDT
            }

            // Autoriser le swipe partout ailleurs, y compris sur le WeekPicker
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        };

        const handleTouchEnd = (e) => {
            if (touchStartX === null || touchStartY === null || touchStartTime === null) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();

            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const deltaTime = touchEndTime - touchStartTime;

            // Réinitialiser les valeurs
            touchStartX = null;
            touchStartY = null;
            touchStartTime = null;

            // Vérifier que c'est un swipe horizontal (plus horizontal que vertical)
            if (Math.abs(deltaY) > Math.abs(deltaX) || Math.abs(deltaY) > maxVerticalDistance) {
                return; // C'est un swipe vertical, on l'ignore
            }

            // Vérifier la distance et le temps
            if (Math.abs(deltaX) < minSwipeDistance || deltaTime > maxSwipeTime) {
                return; // Trop court ou trop lent
            }

            // Vérifier qu'on a des semaines disponibles
            if (availableWeeks.length === 0 || !selectedWeek) return;

            const currentWeekIndex = availableWeeks.findIndex(
                w => selectedWeek && w.monday.getTime() === selectedWeek.getTime()
            );

            if (currentWeekIndex === -1) return;

            // Swipe gauche = semaine suivante, swipe droite = semaine précédente
            if (deltaX < 0 && currentWeekIndex < availableWeeks.length - 1) {
                // Swipe vers la gauche = semaine suivante
                setSelectedWeek(availableWeeks[currentWeekIndex + 1].monday);
            } else if (deltaX > 0 && currentWeekIndex > 0) {
                // Swipe vers la droite = semaine précédente
                setSelectedWeek(availableWeeks[currentWeekIndex - 1].monday);
            }
        };

        // Ajouter les listeners sur le document
        document.addEventListener('touchstart', handleTouchStart, {passive: true});
        document.addEventListener('touchend', handleTouchEnd, {passive: true});

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isNative, isSmallScreen, availableWeeks, selectedWeek]);

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
                        // Conserver l'espacement uniquement sur desktop et en vue horizontale
                        if (!(isNative || isSmallScreen) && viewMode === 'horizontal') {
                            setTodaySpacing(newSpacing);
                        } else {
                            setTodaySpacing(0);
                        }
                    }
                }, 100);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [todaySpacing, isNative, isSmallScreen, viewMode]);

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
        const savedMode = localStorage.getItem("darkMode");
        if (savedMode) setDarkMode(savedMode === "true");

        const savedOledMode = localStorage.getItem("oledMode");
        if (savedOledMode) setOledMode(savedOledMode === "true");

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
        else {
            document.documentElement.classList.remove("dark-mode");
            // Désactiver OLED si on sort du dark mode
            setOledMode(false);
        }
        localStorage.setItem("darkMode", darkMode.toString());
        try {
            document.cookie = `darkMode=${darkMode ? 'true' : 'false'}; path=/; SameSite=Lax`;
        } catch (e) {
        }
    }, [darkMode]);

    useEffect(() => {
        if (oledMode && darkMode) {
            document.documentElement.classList.add("oled-mode");
        } else {
            document.documentElement.classList.remove("oled-mode");
        }
        if (oledMode) {
            localStorage.setItem("oledMode", "true");
        } else {
            localStorage.removeItem("oledMode");
        }
    }, [oledMode, darkMode]);

    // Auto-scroll désactivé
    useEffect(() => {
        // Intentionnellement vide : auto-scroll supprimé
    }, [loading, autoScrollToday, events, settingsOpen, selectedWeek]);

    // Auto-scroll désactivé à la fermeture des paramètres
    useEffect(() => {
        // Intentionnellement vide : auto-scroll supprimé
    }, [settingsOpen, autoScrollToday, events, selectedWeek]);

    // Gérer l'ouverture du jour d'aujourd'hui après avoir changé de semaine via le bouton "Aujourd'hui"
    useEffect(() => {
        if (!shouldScrollToToday || events.length === 0) return;

        // Attendre que groupByDay soit mis à jour
        setTimeout(() => {
            const today = new Date();
            const todayDateString = today.toDateString();
            const newCollapsedDays = {...collapsedDays};
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

            // Définir l'espacement uniquement sur desktop et en vue horizontale
            if (!(isNative || isSmallScreen) && viewMode === 'horizontal') {
                setTodaySpacing(spacingNeeded);
            } else {
                setTodaySpacing(0);
            }

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
        // Utiliser la sélection intelligente de semaine sans déclencher de scroll
        const weekToSelect = selectBestWeek(availableWeeks);
        if (weekToSelect) {
            setSelectedWeek(weekToSelect.monday);
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
                {subject: 'Mathématiques Appliquées', prof: 'M. Dupont', location: 'Salle A101'},
                {subject: 'Informatique', prof: 'Mme Martin', location: 'Labo Informatique'},
                {subject: 'Économie', prof: 'M. Bernard', location: 'Salle B205'},
                {subject: 'Gestion de Projet', prof: 'Mme Dubois', location: 'Salle C301'}
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

            // Ne pas enregistrer d'historique en mode test

            setTestModeState(true);
            setTestMode(true);
        } else {
            // Désactiver le mode test : recharger les données normales
            setTestModeState(false);
            setTestMode(false);
            fetchEvents();
        }
    };

    const handleToggleTestWeek = () => {
        if (!testWeekMode) {
            // Activer le mode "Test Semaine" : remplacer tous les événements par une semaine de test
            console.log('[Test Week] Activation du mode Test Semaine');
            
            // Générer une semaine complète de test (dimanche à dimanche)
            const testWeekEvents = generateTestWeek();
            
            // Remplacer tous les événements par la semaine de test
            setAllEvents(testWeekEvents);
            
            // Mettre à jour les couleurs et semaines
            const colorMapping = createSubjectColorMapping(testWeekEvents);
            setSubjectColors(colorMapping);
            
            const weeks = extractAvailableWeeks(testWeekEvents);
            setAvailableWeeks(weeks);
            
            // Sélectionner la semaine de test (normalement il n'y en aura qu'une)
            if (weeks.length > 0) {
                setSelectedWeek(weeks[0].monday);
            }
            
            // Sauvegarder dans le cache
            saveEventsToCache(testWeekEvents, colorMapping);
            
            // Activer le mode
            setTestWeekModeState(true);
            setTestWeekMode(true);
            
            console.log('[Test Week] Mode Test Semaine activé avec', testWeekEvents.length, 'cours');
        } else {
            // Désactiver le mode "Test Semaine" : recharger les données normales
            console.log('[Test Week] Désactivation du mode Test Semaine');
            setTestWeekModeState(false);
            setTestWeekMode(false);
            fetchEvents();
        }
    };

    const handleCheckUpdates = () => {
        if (updateCheckerRef.current) {
            updateCheckerRef.current.checkForUpdates();
        }
    };

    const groupByDay = groupEventsByDay(events, viewMode === 'horizontal' ? 'long' : 'short');

    // Formater le timestamp pour l'affichage
    const formatLastUpdate = (timestamp) => {
        if (!timestamp) return 'Non disponible';
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Non disponible';
            return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Non disponible';
        }
    };

    return (
        <div style={{display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%'}}>
            {/* Demande de permissions au démarrage (app native uniquement) */}
            <PermissionRequest isNative={isNative}/>

            {/* Popup de téléchargement APK pour Android (web uniquement) */}
            <ApkDownloadPopup/>

            {/* Vérification des mises à jour (app native uniquement) */}
            <UpdateChecker
                ref={updateCheckerRef}
                currentVersion={process.env.NEXT_PUBLIC_APP_VERSION}
                isNative={isNative}
            />

            <Navbar
                darkMode={darkMode}
                oledMode={oledMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                onToggleOledMode={() => setOledMode(!oledMode)}
                availableWeeks={availableWeeks}
                selectedWeek={selectedWeek}
                onWeekChange={handleWeekChange}
                onRefresh={handleRefresh}
                onToday={handleToday}
                showRefreshButton={!(isNative || isSmallScreen)}
                isMobile={isNative || isSmallScreen}
                onSettingsOpenChange={setSettingsOpen}
                onToggleAllDays={handleToggleAllDays}
                allDaysCollapsed={Object.keys(groupByDay).length > 0 && Object.keys(groupByDay).every(d => collapsedDays[d])}
                compactMode={compactMode}
                isNative={isNative}
                currentVersion={process.env.NEXT_PUBLIC_APP_VERSION}
                onCheckUpdates={handleCheckUpdates}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                showTimeLabels={showTimeLabels}
                onToggleTimeLabels={handleToggleTimeLabels}
                subjects={subjects}
                selectedSubjects={selectedSubjects}
                onSubjectsChange={setSelectedSubjects}
                showFilter={!loading && allEvents.length > 0}
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

                {!loading && events.length === 0 && allEvents.length > 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem 1rem',
                        color: 'var(--text-secondary)',
                        fontSize: '1rem'
                    }}>
                        Pas de cours trouvé pour cette semaine
                    </div>
                )}

                {(!loading || events.length > 0) && events.length > 0 && (
                    <div
                        key={selectedWeek ? selectedWeek.getTime() : 'no-week'}
                        className={
                            `${styles.weekContent} ` +
                            (weekTransitionDirection === 'next'
                                ? styles.slideLeft
                                : weekTransitionDirection === 'prev'
                                    ? styles.slideRight
                                    : '')
                        }
                    >
                        {viewMode === 'vertical' ? (
                            <VerticalSchedule
                                events={events}
                                subjectColors={subjectColors}
                                onOpenEventDetails={(ev) => setSelectedEvent(ev)}
                                compactMode={compactMode}
                                showTimeLabels={showTimeLabels}
                                isNative={isNative}
                                monthFormat={'short'}
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
                                        {isToday && (
                                            <div
                                                style={{
                                                    height: '0px',
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
                        {/* Affichage de la date et heure de dernière sauvegarde */}
                        <div className="last-update-info">
                            <SubjectHoursInfo allEvents={allEvents} subjectColors={subjectColors}/>
                            <span>EDT à jour le : {formatLastUpdate(lastUpdateTimestamp)}</span>
                        </div>
                    </div>
                )}
            </main>

            <Footer 
                testMode={testMode}
                onToggleTestMode={handleToggleTestMode}
                testWeekMode={testWeekMode}
                onToggleTestWeek={handleToggleTestWeek}
            />

            <ScrollToTop/>

            <OfflineNotification forceShow={hasNetworkError}/>
            
            <DevNotification 
                message={devNotification} 
                isVisible={showDevNotification} 
                onClose={() => setShowDevNotification(false)} 
            />

            {/* Test mode indicator removed; show badge in footer instead */}

            {showMap && selectedEvent && (
                <MapViewer 
                    location={selectedEvent.location} 
                    onClose={() => setShowMap(false)}
                />
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
                            {/* Section Informations principales */}
                            <div className="modal-section">
                                <div className="pop-row">
                                    <span>⏰</span>
                                    <span>{new Date(selectedEvent.start).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })} - {new Date(selectedEvent.end).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</span>
                                </div>
                                {formatDurationHM(selectedEvent.start, selectedEvent.end) && (
                                    <div className="pop-row">
                                        <span>⏳</span>
                                        <span>Durée : {formatDurationHM(selectedEvent.start, selectedEvent.end)}</span>
                                    </div>
                                )}
                                {(() => {
                                    const courseType = extractCourseType(selectedEvent);
                                    const {prof: extractedProf} = getEventTitle(selectedEvent) || {};
                                    const profName = extractedProf || selectedEvent.prof;
                                    return (
                                        <>
                                            {courseType && (
                                                <div className="pop-row">
                                                    <span>📘</span>
                                                    <span>{courseType}</span>
                                                </div>
                                            )}
                                            {profName && (
                                                <div className="pop-row">
                                                    <span>👤</span>
                                                    <span>Professeur : {profName}</span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                                {selectedEvent.location && (
                                    <div className="pop-row location-row">
                                        <span>📍</span>
                                        <span>{selectedEvent.location}</span>
                                        {(() => {
                                            const siteInfo = getCnamSite(selectedEvent.location);
                                            if (!siteInfo) return null;
                                            return (
                                                <span 
                                                    className="site-badge" 
                                                    style={{ 
                                                        backgroundColor: siteInfo.color,
                                                        color: 'white'
                                                    }}
                                                >
                                                    {siteInfo.site}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Section Progression */}
                            {(() => {
                                const {matiere} = getEventTitle(selectedEvent) || {};
                                const hoursStats = getSubjectHoursStats(matiere, selectedEvent);
                                
                                if (!hoursStats || hoursStats.total === 0) return null;
                                
                                return (
                                    <div className="modal-section">
                                        <div className="hours-stats-compact">
                                            <div className="hours-stats-header">
                                                <span className="hours-stats-icon">📊</span>
                                                <span className="hours-stats-label">Progression à ce cours</span>
                                            </div>
                                            <div className="hours-stats-bar-wrapper">
                                                <div className="hours-stats-bar">
                                                    <div 
                                                        className="hours-stats-bar-fill" 
                                                        style={{width: `${hoursStats.percentage}%`}}
                                                    >
                                                        <span className="hours-stats-bar-percent">{hoursStats.percentage}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="hours-stats-details">
                                                <span className="hours-stats-completed">{formatHoursDecimal(hoursStats.completed)} / {formatHoursDecimal(hoursStats.total)}</span>
                                                {hoursStats.remaining > 0 && (
                                                    <>
                                                        <span className="hours-stats-dot">•</span>
                                                        <span className="hours-stats-remaining">{formatHoursDecimal(hoursStats.remaining)} restantes après ce cours</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Section Actions */}
                            <div className="modal-section modal-actions">
                                {selectedEvent.location && (
                                    <button
                                        className="action-btn map-btn"
                                        onClick={() => setShowMap(true)}
                                        aria-label="Voir dans la map"
                                    >
                                        <span className="action-btn-icon">🗺️</span>
                                        <span className="action-btn-text">Voir la salle</span>
                                    </button>
                                )}
                                {(() => {
                                    const courseId = extractCourseIdFromSummary(selectedEvent.summary || selectedEvent.description || '');
                                    if (!courseId) return null;
                                    const [yearStart, yearEnd] = getAcademicYearParts(selectedEvent.start || Date.now());
                                    const query = `${courseId} ${yearStart} ${yearEnd}`;
                                    const moodleUrl = `https://par.moodle.lecnam.net/course/search.php?search=${encodeURIComponent(query)}`;
                                    return (
                                        <a
                                            className="action-btn moodle-btn"
                                            href={moodleUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`Ouvrir Moodle pour ${courseId}`}
                                        >
                                            <span className="action-btn-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
                                                    <path fill="#ffab40" d="M33.5,16c-2.5,0-4.8,1-6.5,2.6C25.3,17,23,16,20.5,16c-5.2,0-9.5,4.3-9.5,9.5V37h6V24.5 c0-1.9,1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5V37h6V24.5c0-1.9,1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5V37h6V25.5C43,20.3,38.7,16,33.5,16z"/>
                                                    <path d="M5.5 16.2H6.5V32H5.5z"/>
                                                    <path fill="#424242" d="M22,13c1.1,0.4,2.6,2,3,3c-1.8,1.7-2.6,2.9-3,6c-0.1,1.1-0.9,1.7-2,1c-3.1-1.9-6-2-8-2 c-1-1-0.5-3.7,0-5l6,1L22,13z"/>
                                                    <path fill="#616161" d="M18,17H4l11-7h14L18,17z"/>
                                                    <path fill="#424242" d="M7.5,30c0-2.2-0.7-4-1.5-4s-1.5,1.8-1.5,4s0.7,4,1.5,4S7.5,32.2,7.5,30z"/>
                                                </svg>
                                            </span>
                                            <span className="action-btn-text">Ouvrir Moodle</span>
                                        </a>
                                    );
                                })()}
                            </div>

                            {/* Debug info */}
                            {devMode && selectedEvent.description && (
                                <div className="modal-section">
                                    <div className="pop-desc">{selectedEvent.description}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<LoadingSpinner/>}>
            <HomeContentWrapper/>
        </Suspense>
    );
}

function HomeContentWrapper() {
    const searchParams = useSearchParams();
    return <HomeContent searchParams={searchParams}/>;
}