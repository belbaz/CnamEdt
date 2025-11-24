"use client";
import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getMonday, getCurrentWeek, extractAvailableWeeks, selectBestWeek } from "@/utils/dateUtils";
import { createSubjectColorMapping, groupEventsByDay, getEventTitle } from "@/utils/eventUtils";
import { useDevMode } from "@/utils/env";
import { fetchICSEvents, loadEventsFromCache, saveEventsToCache } from "@/services/icsService";
import {
    addTestCoursesForToday,
    isTestModeEnabled,
    setTestMode,
    generateTestWeek,
    isTestWeekEnabled,
    setTestWeekMode
} from "@/services/testDataService";
import { usePWA } from "@/hooks/usePWA";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useCourseNotes } from "@/hooks/useCourseNotes";
import { useHomePageHandlers } from "@/hooks/useHomePageHandlers";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import DayBlock from "@/components/DayBlock";
import VerticalSchedule from "@/components/VerticalSchedule";
import ScrollToTop from "@/components/ScrollToTop";
import PWAUpdateChecker from "@/components/PWAUpdateChecker";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import Footer from "@/components/Footer";
import OfflineNotification from "@/components/OfflineNotification";
import SupabaseNotification from "@/components/SupabaseNotification";
import SubjectHoursInfo from "@/components/SubjectHoursInfo";
import DevNotification from "@/components/DevNotification";
import DevToolsButton from "@/components/DevToolsButton";
import EventModal from "@/components/EventModal/EventModal";
import styles from "./page.module.css";
import "@/components/VerticalSchedule.css";
import { saveSnapshotIfChanged } from "@/utils/historyService";
import { parseStoredNoteValue } from "@/utils/noteEntries";
import { generateEventKey } from "@/utils/eventModalUtils";

function HomeContent({ searchParams }) {
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [eventsCalculated, setEventsCalculated] = useState(false);
    const [availableWeeks, setAvailableWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [oledMode, setOledMode] = useState(false);
    const [subjectColors, setSubjectColors] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());
    const [autoScrollToday, setAutoScrollToday] = useState(true);
    const [collapsedDays, setCollapsedDays] = useState({});
    const [progressionExpanded, setProgressionExpanded] = useState(new Map());
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
    const [hide15MinSpacing, setHide15MinSpacing] = useState(false); // Masquer l'espacement visuel de 15 minutes
    const [showTimeRemaining, setShowTimeRemaining] = useState(true); // Afficher le temps restant du cours
    const [showTooltips, setShowTooltips] = useState(true); // Afficher les indications des boutons (tooltips)
    // Animation de transition de semaine: 'next' | 'prev' | null
    const [weekTransitionDirection, setWeekTransitionDirection] = useState(null);
    const previousWeekIndexRef = useRef(null);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [showOnlyExams, setShowOnlyExams] = useState(false);
    // Notification de debug pour le mode dev
    const [devNotification, setDevNotification] = useState(null);
    const [showDevNotification, setShowDevNotification] = useState(false);
    // Notification Supabase
    const [showSupabaseNotification, setShowSupabaseNotification] = useState(false);
    const [supabaseSource, setSupabaseSource] = useState(null);

    // Notes des cours
    const { notes: courseNotes, authenticated: notesAuthenticated, refresh: refreshNotes } = useCourseNotes();

    // Infos utilisateur
    const [userInfo, setUserInfo] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);


    // Présence d'un deep-link vers un cours précis
    const eventKeyParam = searchParams?.get('eventKey');

    // Hook PWA pour détecter l'installation
    const { isInstalled, isStandalone } = usePWA();
    const { isOnline } = useNetworkStatus();
    const devMode = useDevMode();

    // Pull-to-refresh sur mobile/web
    usePullToRefresh(() => fetchEvents());

    // Ref pour le jour actuel
    const todayRef = useRef(null);

    // Fonction utilitaire pour charger le cache et mettre à jour l'état
    const loadCacheAndUpdateState = (cached) => {
        if (!cached || !cached.events || cached.events.length === 0) return false;

        console.log('[Page] Utilisation du cache:', cached.events.length, 'événements');
        setAllEvents(cached.events);
        setSubjectColors(cached.colors);
        const weeks = extractAvailableWeeks(cached.events);
        setAvailableWeeks(weeks);
        if (!eventKeyParam && weeks.length > 0) {
            const weekToSelect = selectBestWeek(weeks);
            setSelectedWeek(weekToSelect?.monday);
        }
        
        // Récupérer le timestamp du cache pour afficher la date de dernière mise à jour du cache
        // IMPORTANT: Toujours restaurer depuis localStorage pour éviter d'afficher la date actuelle
        if (typeof window !== 'undefined') {
            const cachedTimestamp = localStorage.getItem('lastUpdateTimestamp');
            if (cachedTimestamp) {
                console.log('[Page] Restauration du timestamp du cache:', cachedTimestamp);
                setLastUpdateTimestamp(cachedTimestamp);
            } else {
                // Si le timestamp n'existe pas, c'est probablement un ancien cache
                // On ne crée pas de timestamp ici pour éviter d'afficher une date incorrecte
                console.warn('[Page] Aucun timestamp trouvé dans localStorage lors du chargement du cache');
                setLastUpdateTimestamp(null);
            }
        }
        
        setLoading(false);
        setError(null);
        setDebugInfo(null);
        setShowSupabaseNotification(false);
        setSupabaseSource(null);
        return true;
    };

    const fetchEvents = async () => {
        try {
            // Ne pas remettre loading à true si on a déjà des données à afficher
            if (allEvents.length === 0) {
                setLoading(true);
            }
            setError(null);
            setDebugInfo(null);
            setShowSupabaseNotification(false);
            setSupabaseSource(null);

            const debug = {
                isPWAInstalled: isInstalled,
                isStandalone: isStandalone,
                protocol: window.location.protocol,
                href: window.location.href,
                userAgent: window.navigator.userAgent.substring(0, 100)
            };

            let response;
            try {
                // Essayer de récupérer les données (ICS ou Supabase en fallback)
                response = await fetchICSEvents();
            } catch (fetchError) {
                // En cas d'erreur réseau, utiliser le cache
                const isNetworkError = !isOnline ||
                    fetchError.message.includes('Failed to fetch') ||
                    fetchError.message.includes('réseau') ||
                    fetchError.message.includes('network') ||
                    fetchError.message.includes('fetch failed');

                if (isNetworkError) {
                    setHasNetworkError(true);
                    const cached = loadEventsFromCache();
                    if (loadCacheAndUpdateState(cached)) {
                        return; // Cache chargé avec succès
                    }
                }

                // Si pas de cache ou erreur non-réseau, propager l'erreur
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

            // Vérifier si les données viennent de Supabase
            const isSupabaseSource = meta.source === 'database' ||
                meta.source === 'database-fallback' ||
                meta.source === 'force-db' ||
                (meta.source === 'cache' && meta.fromCache === true);

            console.log('[Page] Meta source:', meta.source, '| isSupabaseSource:', isSupabaseSource);

            if (isSupabaseSource) {
                console.log('[Page] Affichage notification Supabase avec source:', meta.source);
                setShowSupabaseNotification(true);
                setSupabaseSource(meta.source);
            } else {
                setShowSupabaseNotification(false);
                setSupabaseSource(null);
            }

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

            // Vérifier si on doit mettre à jour le timestamp
            // Ne pas mettre à jour si :
            // - Les données viennent du cache (meta.fromCache === true)
            // - Il n'y a eu aucun changement (meta.changed === 0)
            const isFromCache = meta.fromCache === true || meta.source === 'cache';
            const hasChanges = typeof meta.changed === 'number' ? meta.changed > 0 : false;
            const shouldUpdateTimestamp = !isFromCache && hasChanges;
            
            // Sauvegarder dans le cache (sans mettre à jour le timestamp si pas de changements)
            saveEventsToCache(eventsData, colorMapping, shouldUpdateTimestamp);

            // Historiser les matières détectées si elles ont changé
            await saveSnapshotIfChanged(eventsData, { skip: shouldSkipHistory });
            
            if (shouldUpdateTimestamp) {
                // Mettre à jour le timestamp dans l'état si on a vraiment récupéré de nouvelles données
                const newTimestamp = new Date().toISOString();
                setLastUpdateTimestamp(newTimestamp);
                console.log('[Page] Timestamp mis à jour avec succès (nouvelles données):', newTimestamp);
            } else {
                // Conserver le timestamp du cache si on charge depuis le cache ou s'il n'y a pas de changements
                if (typeof window !== 'undefined') {
                    let cachedTimestamp = localStorage.getItem('lastUpdateTimestamp');
                    if (cachedTimestamp) {
                        console.log('[Page] Conservation du timestamp du cache (pas de nouvelles données):', cachedTimestamp);
                        setLastUpdateTimestamp(cachedTimestamp);
                    } else {
                        // Si le timestamp n'existe pas mais qu'on a réussi à récupérer des données (même depuis le cache),
                        // créer un timestamp pour éviter "Date inconnue" lors des prochains chargements
                        // Ce cas peut arriver si le cache a été créé avant l'ajout de cette fonctionnalité
                        console.log('[Page] Aucun timestamp trouvé, création d\'un timestamp (données récupérées avec succès)');
                        cachedTimestamp = new Date().toISOString();
                        localStorage.setItem('lastUpdateTimestamp', cachedTimestamp);
                        setLastUpdateTimestamp(cachedTimestamp);
                    }
                }
            }
            
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

                // Créer le message avec les champs modifiés (désactivé - notification supprimée)
                // let notificationMsg = `📊 Events: ${eventsData.length} | Changes: ${totalChanges}`;
                // if (diff.added.length > 0) notificationMsg += ` | +${diff.added.length} added`;
                // if (diff.updated.length > 0) {
                //     notificationMsg += ` | ~${diff.updated.length} updated`;
                //     const fieldsList = Object.entries(fieldChanges)
                //         .map(([field, count]) => `${field}(${count})`)
                //         .join(', ');
                //     if (fieldsList) {
                //         notificationMsg += ` [${fieldsList}]`;
                //     }
                // }
                // if (diff.removed.length > 0) notificationMsg += ` | -${diff.removed.length} removed`;

                // setDevNotification(notificationMsg);
                // setShowDevNotification(true);

                // Logger aussi dans la console (gardé pour le debug)
                const notificationMsg = `📊 Events: ${eventsData.length} | Changes: ${totalChanges}` +
                    (diff.added.length > 0 ? ` | +${diff.added.length} added` : '') +
                    (diff.updated.length > 0 ? ` | ~${diff.updated.length} updated` : '') +
                    (diff.removed.length > 0 ? ` | -${diff.removed.length} removed` : '');
                console.log('[DEV] Sync summary:', notificationMsg);
                if (Object.keys(fieldChanges).length > 0) {
                    console.log('[DEV] Modified fields breakdown:', fieldChanges);
                }
            }
        } catch (err) {
            // Dernier recours : essayer le cache
            const cached = loadEventsFromCache();
            if (loadCacheAndUpdateState(cached)) {
                setHasNetworkError(true);
                return; // Cache chargé, on sort
            }

            // Pas de cache disponible, afficher l'erreur
            const isNetworkError = err.message.includes('Failed to fetch') ||
                err.message.includes('réseau') ||
                err.message.includes('network') ||
                err.message.includes('fetch failed');

            if (isNetworkError) {
                setHasNetworkError(true);
            }

            setShowSupabaseNotification(false);
            setSupabaseSource(null);

            // Gérer le message d'erreur spécifique pour Galao + Supabase indisponibles
            let errorMessage = err.message;
            if (err.details) {
                errorMessage = err.details;
            }
            setError(errorMessage);

            if (!debugInfo) {
                setDebugInfo({
                    error: err.message,
                    stack: err.stack,
                    isPWAInstalled: isInstalled,
                    isStandalone: isStandalone,
                    protocol: window.location.protocol,
                    href: window.location.href
                });
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
                    const { matiere } = getEventTitle(event);
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
        if (!selectedWeek || allEvents.length === 0) {
            setEventsCalculated(false);
            return;
        }

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

        // Filtrer par examens uniquement si activé
        if (showOnlyExams) {
            filtered = filtered.filter((e) => {
                const description = e.description || '';
                return description.toUpperCase().includes("EXAMEN");
            });
        }

        // Filtrer par matières sélectionnées si des filtres sont actifs
        if (selectedSubjects.length > 0) {
            filtered = filtered.filter((e) => {
                const { matiere } = getEventTitle(e);
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
        setEventsCalculated(true);
    }, [selectedWeek, allEvents, searchParams, selectedSubjects, showOnlyExams]);

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

    // Chargement initial : cache puis fetch si en ligne
    useEffect(() => {
        // Pas besoin d'attendre Capacitor pour PWA

        // Initialiser le mode test
        setTestModeState(isTestModeEnabled());
        setTestWeekModeState(isTestWeekEnabled());

        // 1. Charger le cache immédiatement (si disponible)
        const cached = loadEventsFromCache();
        if (cached && cached.events && cached.events.length > 0) {
            console.log('[Page] Chargement depuis le cache:', cached.events.length, 'événements');
            setAllEvents(cached.events);
            setSubjectColors(cached.colors);
            const weeks = extractAvailableWeeks(cached.events);
            setAvailableWeeks(weeks);
            if (!eventKeyParam && weeks.length > 0) {
                const weekToSelect = selectBestWeek(weeks);
                setSelectedWeek(weekToSelect?.monday);
            }
            
            // Récupérer le timestamp du cache pour afficher la date de dernière mise à jour du cache
            // IMPORTANT: Toujours charger depuis localStorage pour avoir la vraie date du cache
            if (typeof window !== 'undefined') {
                const cachedTimestamp = localStorage.getItem('lastUpdateTimestamp');
                if (cachedTimestamp) {
                    console.log('[Page] Timestamp du cache chargé:', cachedTimestamp);
                    setLastUpdateTimestamp(cachedTimestamp);
                } else {
                    // Si le timestamp n'existe pas, c'est probablement un ancien cache créé avant cette fonctionnalité
                    // On ne crée pas de timestamp ici pour éviter d'afficher une date incorrecte
                    // Le timestamp sera créé lors de la prochaine mise à jour réussie
                    console.warn('[Page] Aucun timestamp trouvé dans le cache (ancien cache probablement)');
                    setLastUpdateTimestamp(null);
                }
            }
            
            setLoading(false);
        }

        // 2. Si en ligne, fetch pour mettre à jour (le cache reste affiché pendant le fetch)
        // 3. Si hors ligne, utiliser le cache uniquement
        if (isOnline) {
            fetchEvents();
        } else {
            console.log('[Page] Mode hors ligne - Utilisation du cache uniquement');
            if (!cached || !cached.events || cached.events.length === 0) {
                setError('Mode hors ligne\n\nAucune sauvegarde en cache');
                setHasNetworkError(true);
            } else {
                setHasNetworkError(true); // Notification hors ligne
                // S'assurer que le timestamp du cache est bien chargé
                if (typeof window !== 'undefined') {
                    const cachedTimestamp = localStorage.getItem('lastUpdateTimestamp');
                    if (cachedTimestamp && cachedTimestamp !== lastUpdateTimestamp) {
                        console.log('[Page] Timestamp du cache restauré:', cachedTimestamp);
                        setLastUpdateTimestamp(cachedTimestamp);
                    }
                }
            }
        }
    }, [isOnline]);

    // Charger les infos utilisateur
    useEffect(() => {
        const loadUserInfo = async () => {
            try {
                setIsLoadingUser(true);
                // Délai minimum pour que le spinner soit visible
                const [res] = await Promise.all([
                    fetch("/api/user", { cache: "no-store" }),
                    new Promise(resolve => setTimeout(resolve, 500)) // Minimum 500ms
                ]);
                if (res.ok) {
                    const data = await res.json();
                    setUserInfo(data);
                }
            } catch (error) {
                // Ignorer silencieusement si non connecté
            } finally {
                setIsLoadingUser(false);
            }
        };
        loadUserInfo();
    }, []);


    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);


    // Fonction pour vérifier si une modale est ouverte
    const isAnyModalOpen = () => {
        return !!(
            document.querySelector('.event-modal-layer') ||
            document.querySelector('.settings-overlay') ||
            document.querySelector('.map-viewer-overlay') ||
            document.querySelector('.subject-hours-overlay') ||
            document.querySelector('.filter-overlay') ||
            document.querySelector('.apk-popup-overlay') ||
            document.querySelector('.update-popup-overlay') ||
            document.querySelector('.permission-request-overlay') ||
            // DevToolsButton utilise CSS Modules, on vérifie la présence d'un élément avec aria-modal
            document.querySelector('[aria-modal="true"]')
        );
    };

    // Navigation au clavier : Ctrl + Flèche droite/gauche pour changer de semaine
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Vérifier si Ctrl est pressé et si c'est une flèche gauche ou droite
            if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                // Ne pas permettre le changement de semaine si une modale est ouverte
                if (isAnyModalOpen()) {
                    return;
                }

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
        if (!isSmallScreen) return;

        let touchStartX = null;
        let touchStartY = null;
        let touchStartTime = null;
        const minSwipeDistance = 50; // Distance minimale pour considérer un swipe
        const maxSwipeTime = 500; // Temps maximum pour un swipe (ms)
        const maxVerticalDistance = 100; // Distance verticale maximale pour considérer un swipe horizontal

        const handleTouchStart = (e) => {
            // Ne pas démarrer le swipe si une modale est ouverte
            if (isAnyModalOpen()) {
                return;
            }

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

            // Ne pas permettre le changement de semaine si une modale est ouverte
            if (isAnyModalOpen()) {
                touchStartX = null;
                touchStartY = null;
                touchStartTime = null;
                return;
            }

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
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isSmallScreen, availableWeeks, selectedWeek]);

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
                        if (!isSmallScreen && viewMode === 'horizontal') {
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
    }, [todaySpacing, isSmallScreen, viewMode]);

    // État pour le timestamp de dernière mise à jour
    // Initialiser directement depuis localStorage pour éviter les problèmes de timing
    const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(() => {
        if (typeof window !== 'undefined') {
            const timestamp = localStorage.getItem('lastUpdateTimestamp');
            return timestamp || null;
        }
        return null;
    });

    // Appliquer le dark mode immédiatement au chargement (avant React)
    useEffect(() => {
        try {
            const cookieMatch = document.cookie.match(/(?:^|; )darkMode=([^;]+)/);
            const fromCookie = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
            const fromStorage = localStorage.getItem('darkMode');
            const dark = fromCookie != null ? (fromCookie === 'true') : (fromStorage === 'true');
            if (dark) {
                document.documentElement.classList.add('dark-mode');
            } else {
                document.documentElement.classList.remove('dark-mode');
            }
        } catch (e) {
            // Erreur silencieuse
        }
    }, []);

    useEffect(() => {
        // Ne pas réinitialiser si déjà correct (évite le flash)
        const savedMode = localStorage.getItem("darkMode");
        const cookieMatch = document.cookie.match(/(?:^|; )darkMode=([^;]+)/);
        const fromCookie = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
        const shouldBeDark = fromCookie === 'true' || savedMode === 'true';
        if (darkMode !== shouldBeDark) {
            setDarkMode(shouldBeDark);
        }

        const savedOledMode = localStorage.getItem("oledMode");
        if (savedOledMode === 'true' && !oledMode) {
            setOledMode(true);
        }

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

        const savedHide15MinSpacing = localStorage.getItem("hide15MinSpacing");
        if (savedHide15MinSpacing !== null) setHide15MinSpacing(savedHide15MinSpacing === "true");

        const savedShowTimeRemaining = localStorage.getItem("showTimeRemaining");
        if (savedShowTimeRemaining !== null) setShowTimeRemaining(savedShowTimeRemaining === "true");

        const savedShowTooltips = localStorage.getItem("showTooltips");
        if (savedShowTooltips !== null) setShowTooltips(savedShowTooltips === "true");
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

            // Définir l'espacement uniquement sur desktop et en vue horizontale
            if (!isSmallScreen && viewMode === 'horizontal') {
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

    // Calculer groupByDay avant de l'utiliser dans le hook
    const groupByDay = useMemo(() => groupEventsByDay(events, viewMode === 'horizontal' ? 'long' : 'short'), [events, viewMode]);

    // Utiliser le hook pour les handlers
    const handlers = useHomePageHandlers({
        availableWeeks,
        setSelectedWeek,
        allEvents,
        setAllEvents,
        setSubjectColors,
        setAvailableWeeks,
        collapsedDays,
        setCollapsedDays,
        groupByDay,
        fetchEvents,
        setTestModeState,
        setTestMode,
        setTestWeekModeState,
        setTestWeekMode,
    });

    const handleRefresh = handlers.handleRefresh;
    const handleToday = handlers.handleToday;
    const handleWeekChange = handlers.handleWeekChange;
    const handleToggleAutoScroll = (enabled) => handlers.handleToggleAutoScroll(enabled, setAutoScrollToday);
    const handleViewModeChange = (mode) => handlers.handleViewModeChange(mode, setViewMode);
    const handleToggleTimeLabels = (enabled) => handlers.handleToggleTimeLabels(enabled, setShowTimeLabels);
    const handleToggle15MinSpacing = (enabled) => handlers.handleToggle15MinSpacing(enabled, setHide15MinSpacing);
    const handleToggleTimeRemaining = (enabled) => handlers.handleToggleTimeRemaining(enabled, setShowTimeRemaining);
    const handleToggleTooltips = (enabled) => handlers.handleToggleTooltips(enabled, setShowTooltips);
    const handleToggleDay = handlers.handleToggleDay;
    const handleToggleAllDays = handlers.handleToggleAllDays;
    const handleToggleTestMode = () => handlers.handleToggleTestMode(testMode);
    const handleToggleTestWeek = () => handlers.handleToggleTestWeek(testWeekMode);

    // Vérifier si la semaine affichée est la semaine en cours
    const isCurrentWeekSelected = useMemo(() => {
        if (!selectedWeek) return false;
        const currentWeekMonday = getCurrentWeek();
        return selectedWeek.getTime() === currentWeekMonday.getTime();
    }, [selectedWeek]);

    // Trouver le prochain cours en cours aujourd'hui
    const getNextOngoingCourse = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Filtrer les événements d'aujourd'hui
        const todayEvents = allEvents.filter(event => {
            if (!event.start || !event.end) return false;
            const eventStart = new Date(event.start);
            const eventEnd = event.end_time ? new Date(event.end_time) : new Date(event.end);

            // Vérifier que l'événement est aujourd'hui
            const eventDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
            if (eventDate.getTime() !== today.getTime()) return false;

            // Vérifier que le cours a commencé mais n'est pas encore terminé
            const nowTime = now.getTime();
            const startTime = eventStart.getTime();
            const endTime = eventEnd.getTime();

            return nowTime >= startTime && nowTime < endTime;
        });

        if (todayEvents.length === 0) return null;

        // Trouver le cours qui se termine le plus tôt (le prochain à se terminer)
        todayEvents.sort((a, b) => {
            const endA = a.end_time ? new Date(a.end_time).getTime() : new Date(a.end).getTime();
            const endB = b.end_time ? new Date(b.end_time).getTime() : new Date(b.end).getTime();
            return endA - endB;
        });

        return todayEvents[0];
    }, [allEvents, currentTime]);

    // Calculer le temps restant avant la fin du cours
    const getTimeRemainingText = useMemo(() => {
        if (!showTimeRemaining || !isCurrentWeekSelected || !getNextOngoingCourse) return null;

        const now = new Date();
        const endTime = getNextOngoingCourse.end_time
            ? new Date(getNextOngoingCourse.end_time).getTime()
            : new Date(getNextOngoingCourse.end).getTime();
        const remainingMs = endTime - now.getTime();

        if (remainingMs <= 0) return null;

        const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
        const remainingHours = Math.floor(remainingMinutes / 60);
        const minutes = remainingMinutes % 60;

        if (remainingHours > 0) {
            if (minutes === 0) {
                return `${remainingHours}h avant la fin du cours`;
            }
            return `${remainingHours}h${String(minutes).padStart(2, '0')} avant la fin du cours`;
        }
        return `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} avant la fin du cours`;
    }, [getNextOngoingCourse, currentTime, isCurrentWeekSelected, showTimeRemaining]);

    // Formater le timestamp pour l'affichage
    const formatLastUpdate = (timestamp) => {
        if (!timestamp) {
            // Si pas de timestamp mais qu'on a des événements en cache, c'est probablement un ancien cache
            // On affiche un message indiquant que la date n'est pas disponible
            if (allEvents.length > 0) {
                return 'Date inconnue (ancien cache)';
            }
            return 'Non disponible';
        }
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
        <div className={styles.pageWrapper}>
            {/* Vérification des mises à jour PWA */}
            <PWAUpdateChecker />
            
            {/* Prompt d'installation PWA */}
            <PWAInstallPrompt />

            {/* Bouton de scroll to top */}
            <ScrollToTop />

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
                showRefreshButton={!isSmallScreen}
                isMobile={isSmallScreen}
                onSettingsOpenChange={setSettingsOpen}
                onToggleAllDays={handleToggleAllDays}
                allDaysCollapsed={Object.keys(groupByDay).length > 0 && Object.keys(groupByDay).every(d => collapsedDays[d])}
                compactMode={compactMode}
                isPWAInstalled={isInstalled}
                currentVersion={process.env.NEXT_PUBLIC_APP_VERSION}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                showTimeLabels={showTimeLabels}
                onToggleTimeLabels={handleToggleTimeLabels}
                hide15MinSpacing={hide15MinSpacing}
                onToggle15MinSpacing={handleToggle15MinSpacing}
                showTimeRemaining={showTimeRemaining}
                onToggleTimeRemaining={handleToggleTimeRemaining}
                showTooltips={showTooltips}
                onToggleTooltips={handleToggleTooltips}
                subjects={subjects}
                selectedSubjects={selectedSubjects}
                onSubjectsChange={setSelectedSubjects}
                showOnlyExams={showOnlyExams}
                onShowOnlyExamsChange={setShowOnlyExams}
                showFilter={!loading && allEvents.length > 0}
                userInfo={userInfo}
                isLoadingUser={isLoadingUser}
            />

            <main className={styles.container}>
                {error && !isSmallScreen && (
                    <div className={styles.errorContainer}>
                        <h3 className={styles.errorTitle}>❌ Erreur</h3>
                        <div className={styles.errorMessage}>
                            <strong>Message:</strong> {error}
                        </div>

                        {debugInfo && (
                            <details className={styles.debugDetails}>
                                <summary className={styles.debugSummary}>
                                    🔍 Informations de débogage (cliquer pour voir)
                                </summary>
                                <div className={styles.debugContent}>
                                    <div>
                                        <strong>Mode:</strong> {debugInfo.isPWAInstalled ? '📱 PWA (Installée)' : '🌐 WEB'}
                                    </div>
                                    <div><strong>PWA
                                        installée:</strong> {debugInfo.isPWAInstalled ? 'Oui ✅' : 'Non ❌'}</div>
                                    <div><strong>Mode
                                        standalone:</strong> {debugInfo.isStandalone ? 'Oui ✅' : 'Non ❌'}</div>
                                    <div><strong>Protocole:</strong> {debugInfo.protocol}</div>
                                    <div><strong>URL:</strong> {debugInfo.href}</div>
                                    {debugInfo.fetchError && (
                                        <>
                                            <hr className={styles.debugHr} />
                                            <div><strong>Erreur Fetch:</strong> {debugInfo.fetchError}</div>
                                        </>
                                    )}
                                    {debugInfo.userAgent && (
                                        <div className={styles.debugUserAgent}>
                                            <strong>User Agent:</strong> {debugInfo.userAgent}
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}
                    </div>
                )}

                {loading && events.length === 0 && <LoadingSpinner />}

                {!loading && events.length === 0 && allEvents.length > 0 && availableWeeks.length > 0 && selectedWeek && eventsCalculated && (
                    <div className={styles.noCoursesMessage}>
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
                        {getTimeRemainingText && (
                            <div className={styles.timeRemainingText}>
                                {getTimeRemainingText}
                            </div>
                        )}
                        {viewMode === 'vertical' ? (
                            <VerticalSchedule
                                events={events}
                                subjectColors={subjectColors}
                                onOpenEventDetails={(ev) => setSelectedEvent(ev)}
                                compactMode={compactMode}
                                showTimeLabels={showTimeLabels}
                                hide15MinSpacing={hide15MinSpacing}
                                isPWAInstalled={isInstalled}
                                monthFormat={'short'}
                                courseNotes={courseNotes}
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
                                            hide15MinSpacing={hide15MinSpacing}
                                            courseNotes={courseNotes}
                                        />
                                        {isToday && (
                                            <div
                                                className={styles.todaySpacer}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                        {/* Affichage de la date et heure de dernière sauvegarde */}
                        <div className="last-update-info">
                            <SubjectHoursInfo allEvents={allEvents} subjectColors={subjectColors} />
                            <span className={hasNetworkError ? styles.offlineTimestamp : ''}>
                                EDT à jour le : {formatLastUpdate(lastUpdateTimestamp)}
                            </span>
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

            <ScrollToTop />

            <OfflineNotification forceShow={hasNetworkError} />

            <SupabaseNotification
                show={showSupabaseNotification}
                source={supabaseSource}
            />

            <DevNotification
                message={devNotification}
                isVisible={showDevNotification}
                onClose={() => setShowDevNotification(false)}
            />

            {/* Test mode indicator removed; show badge in footer instead */}

            <EventModal
                selectedEvent={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                onShowMap={setShowMap}
                showMap={showMap}
                allEvents={allEvents}
                progressionExpanded={progressionExpanded}
                setProgressionExpanded={setProgressionExpanded}
                courseNotes={courseNotes}
                notesAuthenticated={notesAuthenticated}
                refreshNotes={refreshNotes}
                devMode={devMode}
                userRole={userInfo?.role}
            />

            {/* Bouton des outils de développement (uniquement en mode dev) */}
            <DevToolsButton />
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <HomeContentWrapper />
        </Suspense>
    );
}

function HomeContentWrapper() {
    const searchParams = useSearchParams();
    return <HomeContent searchParams={searchParams} />;
}