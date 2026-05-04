// @ts-nocheck
"use client";
import {useState, useEffect, useRef, useMemo, Suspense} from "react";
import {useSearchParams, useRouter} from "next/navigation";
import {useI18n} from "@/i18n/I18nContext";
import {getMonday, getCurrentWeek, extractAvailableWeeks, selectBestWeek, getSchoolYearRange} from "@/utils/dateUtils";
import {createSubjectColorMapping, groupEventsByDay, getEventTitle} from "@/utils/eventUtils";
import {useDevMode} from "@/utils/env";
import {fetchICSEvents, loadEventsFromCache, saveEventsToCache} from "@/services/icsService";
import {
    addTestCoursesForToday,
    isTestModeEnabled,
    setTestMode,
    generateTestWeek,
    isTestWeekEnabled,
    setTestWeekMode
} from "@/services/testDataService";
import {usePWA} from "@/hooks/usePWA";
import {useNetworkStatus} from "@/hooks/useNetworkStatus";
import {usePullToRefresh} from "@/hooks/usePullToRefresh";
import {useCourseNotes} from "@/hooks/useCourseNotes";
import {useHomePageHandlers} from "@/hooks/useHomePageHandlers";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import Spinner from "@/components/Spinner";
import Toast from "@/components/Toast";
import DayBlock from "@/components/DayBlock";
import VerticalSchedule from "@/components/VerticalSchedule";
import ScrollToTop from "@/components/ScrollToTop";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import UpdateBanner from "@/components/UpdateBanner";
import Footer from "@/components/Footer";
import OfflineNotification from "@/components/OfflineNotification";
import SupabaseNotification from "@/components/SupabaseNotification";
import SubjectHoursInfo from "@/components/SubjectHoursInfo";
import DevNotification from "@/components/DevNotification";
import DevToolsButton from "@/components/DevToolsButton";
import EventModal from "@/components/EventModal/EventModal";
import YearCalendar from "@/components/YearCalendar";
import styles from "./page.module.css";
import "@/components/VerticalSchedule.css";
import {saveSnapshotIfChanged} from "@/utils/historyService";
import {parseStoredNoteValue} from "@/utils/noteEntries";
import {generateEventKey} from "@/utils/eventModalUtils";

/**
 * Délai max sur UNE tentative de `fetchICSEvents()` → `/api/fetch-ics` uniquement.
 */
const FETCH_ICS_TIMEOUT_MS = 4000;
/** Timeout synchro en arrière-plan (cache déjà affiché). */
const FETCH_ICS_TIMEOUT_BG_MS = 5000;
/** Durée min. d’affichage du libellé « Chargement de l'emploi du temps » (pas de cache). */
const MIN_DISPLAY_MS_EDT_LOADING_FIRST = 0;
/** Durée min. d’affichage du libellé « Vérification des mises à jour… » (cache présent). */
const MIN_DISPLAY_MS_EDT_WAIT_SYNC = 0;

function HomeContent({searchParams}) {
    const {t, language} = useI18n();
    const router = useRouter();
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
    const [showDayWarningToast, setShowDayWarningToast] = useState(false);
    const [progressionExpanded, setProgressionExpanded] = useState(new Map());
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventClickPosition, setEventClickPosition] = useState(null);
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
    const [showCurrentTimeIndicator, setShowCurrentTimeIndicator] = useState(true); // Indicateur de temps (vertical + horizontal)
    const [colorPosition, setColorPosition] = useState('background'); // Position de la couleur: 'top' ou 'background' (par défaut: background)
    const [colorBackgroundOpacity, setColorBackgroundOpacity] = useState(0.8); // Opacité du background (0 à 1, par défaut: 0.8)
    const [timePassedOverlayIntensity, setTimePassedOverlayIntensity] = useState(0.5); // Intensité de l'overlay de temps passé (0.1 à 0.9, par défaut: 0.5)
    const [showCourseProgressPercent, setShowCourseProgressPercent] = useState(false); // Pourcentage de progression du jour (durée des cours)
    const [courseProgressPercentDecimals, setCourseProgressPercentDecimals] = useState(2); // 0 à 5 chiffres après la virgule
    // Animation de transition de semaine: 'next' | 'prev' | null
    const [weekTransitionDirection, setWeekTransitionDirection] = useState(null);
    const previousWeekIndexRef = useRef(null);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [showOnlyExams, setShowOnlyExams] = useState(false);
    // Mode affichage année scolaire complète (initialisé à false pour éviter les erreurs d'hydratation)
    const [showFullYear, setShowFullYear] = useState(false);
    // Notification de debug pour le mode dev
    const [devNotification, setDevNotification] = useState(null);
    const [showDevNotification, setShowDevNotification] = useState(false);
    // Notification Supabase
    const [showSupabaseNotification, setShowSupabaseNotification] = useState(false);
    const [supabaseSource, setSupabaseSource] = useState(null);
    // Modale hors ligne
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    // Timestamp du dernier build (proxy pour la date du dernier commit déployé)
    const [buildTimestamp, setBuildTimestamp] = useState(null);
    const [isLoadingBuildTimestamp, setIsLoadingBuildTimestamp] = useState(false);
    const supportUrl = process.env.NEXT_PUBLIC_ERROR_HELP_URL;
    const [dayOptionsHintAlignLeft, setDayOptionsHintAlignLeft] = useState(false);
    const dayOptionsHintRef = useRef(null);
    /** Indique qu'un cache local a déjà été appliqué (évite un flash de chargement plein écran au sync). */
    const cachePrimedRef = useRef(false);
    const [edtRemoteUpdateOverlay, setEdtRemoteUpdateOverlay] = useState(false);
    /** Synchro serveur en arrière-plan (cache déjà montré). */
    const [isEdtVerifying, setIsEdtVerifying] = useState(false);
    /** Changement EDT hors de la semaine affichée — indicateur discret, pas le toast. */
    const [showEdtMinorUpdateHint, setShowEdtMinorUpdateHint] = useState(false);
    const [showEdtChangeToast, setShowEdtChangeToast] = useState(false);
    const [edtChangeToastMessage, setEdtChangeToastMessage] = useState('current-week'); // 'current-week' ou 'general'
    const [edtChangeToastWeekLabel, setEdtChangeToastWeekLabel] = useState('');
    /** Animation d'entrée des cartes cours au premier affichage de l'EDT (une fois par visite). */
    const [entranceAnimationActive, setEntranceAnimationActive] = useState(false);
    const hasPlayedHomeEntranceRef = useRef(false);
    /** Flag pour savoir si on peut afficher les cartes (évite le flash avant animation) */
    const [canShowCards, setCanShowCards] = useState(false);
    /** Dès l’ouverture : message « connexion » jusqu’à la fin de la sonde ; puis edtWaitSync / edtLoadingFirst. */
    const [edtInitialLoadingText, setEdtInitialLoadingText] = useState(() => t('page.connectivityCheck'));
    /** Début de l’écran de chargement plein écran (pour durée mini. d’affichage du texte). */
    const blockingLoadStartRef = useRef(null);
    /** Au moment du chargement : avait-on déjà des cours en cache local ? */
    const blockingLoadHadCacheRef = useRef(false);
    const blockingLoadEndTimerRef = useRef(null);

    const formatWeekRangeLabel = (weekDate) => {
        if (!weekDate) return '';
        try {
            const weekStart = new Date(weekDate);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const locale = language === 'en' ? 'en-GB' : 'fr-FR';
            const startStr = weekStart.toLocaleDateString(locale, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const endStr = weekEnd.toLocaleDateString(locale, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            return `${startStr} - ${endStr}`;
        } catch (e) {
            return '';
        }
    };

    // Infos utilisateur
    const [userInfo, setUserInfo] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    /** Inclut le chargement / l'id pour recharger les notes quand la session change (contenu public vs compte + entrées perso). */
    const courseNotesSessionKey = `${isLoadingUser ? "0" : "1"}:${userInfo?.id ?? "anon"}`;

    // Notes des cours
    const {notes: courseNotes, authenticated: notesAuthenticated, refresh: refreshNotes} = useCourseNotes(
        courseNotesSessionKey
    );


    // Hook PWA pour détecter l'installation
    const {isInstalled, isStandalone} = usePWA();
    const {isOnline, connectivityReady} = useNetworkStatus();
    const devMode = useDevMode();

    // Pull-to-refresh sur mobile/web
    usePullToRefresh(() => fetchEvents({uiMode: "user-refresh"}));

    // Ref pour le jour actuel
    const todayRef = useRef(null);

    const finishBlockingLoading = () => {
        if (typeof window === 'undefined') {
            setLoading(false);
            return;
        }
        if (blockingLoadEndTimerRef.current) {
            clearTimeout(blockingLoadEndTimerRef.current);
            blockingLoadEndTimerRef.current = null;
        }
        const start = blockingLoadStartRef.current;
        if (start == null) {
            setLoading(false);
            // Safety net : si les cartes ne sont toujours pas visibles, les débloquer
            // (évite le cas où finishBlockingLoading a été appelé sans que start ait été positionné)
            setCanShowCards(true);
            return;
        }
        const minMs = blockingLoadHadCacheRef.current
            ? MIN_DISPLAY_MS_EDT_WAIT_SYNC
            : MIN_DISPLAY_MS_EDT_LOADING_FIRST;
        const elapsed = Date.now() - start;
        const wait = Math.max(0, minMs - elapsed);
        blockingLoadEndTimerRef.current = window.setTimeout(() => {
            blockingLoadEndTimerRef.current = null;
            blockingLoadStartRef.current = null;
            blockingLoadHadCacheRef.current = false;

            if (!hasPlayedHomeEntranceRef.current) {
                hasPlayedHomeEntranceRef.current = true;
                setEntranceAnimationActive(true);
                // Permettre l'affichage des cartes maintenant
                setCanShowCards(true);
            } else {
                // Pas de première animation, afficher directement
                setCanShowCards(true);
            }
            setLoading(false);
        }, wait);
    };

    // Conserver la semaine affichée quand on recharge depuis le cache ou après sync (ex. passage avion → hors ligne).
    // Sinon selectBestWeek ramenait toujours vers la semaine « courante » et cassait navigation + clic sur un cours.
    const syncSelectedWeekWithAvailableWeeks = (weeks) => {
        const hasEventKey =
            typeof window !== 'undefined' &&
            !!new URLSearchParams(window.location.search).get('eventKey');
        if (hasEventKey || !weeks || weeks.length === 0) return;
        setSelectedWeek((prev) => {
            if (prev && weeks.some((w) => w.monday.getTime() === prev.getTime())) {
                return prev;
            }
            return selectBestWeek(weeks)?.monday ?? null;
        });
    };

    // Fonction utilitaire pour charger le cache et mettre à jour l'état
    const loadCacheAndUpdateState = (cached) => {
        if (!cached || !cached.events || cached.events.length === 0) return false;

        console.log('[Page] Utilisation du cache:', cached.events.length, 'événements');
        setAllEvents(cached.events);
        const colors =
            cached.colors && Object.keys(cached.colors).length > 0
                ? cached.colors
                : createSubjectColorMapping(cached.events);
        setSubjectColors(colors);
        const weeks = extractAvailableWeeks(cached.events, language);
        setAvailableWeeks(weeks);
        syncSelectedWeekWithAvailableWeeks(weeks);

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

        setError(null);
        setDebugInfo(null);
        setShowSupabaseNotification(false);
        setSupabaseSource(null);
        cachePrimedRef.current = true;
        return true;
    };

    const fetchEvents = async (options = {}) => {
        const uiMode = options.uiMode ?? "initial-blocking";
        const isNonBlocking = uiMode === "background" || uiMode === "user-refresh";
        let verifyingActive = false;
        try {
            // Inclut le cache chargé juste avant le premier fetch (évite un faux « pas de données »).
            const hadEventsBefore = allEvents.length > 0 || cachePrimedRef.current;

            // Spinner plein écran seulement si rien n'est encore affiché et qu'on est en mode chargement initial
            if (!isNonBlocking && allEvents.length === 0) {
                setLoading(true);
                blockingLoadStartRef.current = Date.now();
                blockingLoadHadCacheRef.current =
                    typeof window !== "undefined" && !!(loadEventsFromCache()?.events?.length);
            }
            setError(null);
            setDebugInfo(null);
            setShowSupabaseNotification(false);
            setSupabaseSource(null);

            // Vérification offline immédiate (avant tout fetch réseau)
            // Cas : fetchEvents() a été appelé alors que isOnline était true,
            // mais navigator.onLine dit déjà false → charger le cache sans attendre
            const immediatelyOffline = typeof navigator !== "undefined" && !navigator.onLine;
            if (immediatelyOffline) {
                console.log("[Page] fetchEvents() : navigator.onLine=false détecté immédiatement → repli cache direct");
                const cached = loadEventsFromCache();
                if (loadCacheAndUpdateState(cached)) {
                    setHasNetworkError(true);
                    return;
                }
                setHasNetworkError(true);
                setError("Mode hors ligne\n\nAucune sauvegarde en cache");
                return;
            }

            if (isNonBlocking) {
                setIsEdtVerifying(true);
                verifyingActive = true;
            }

            const debug = {
                isPWAInstalled: isInstalled,
                isStandalone: isStandalone,
                protocol: window.location.protocol,
                href: window.location.href,
                userAgent: window.navigator.userAgent.substring(0, 100)
            };

            // Vérifier si on a un cache local AVANT de lancer le fetch
            const hasLocalCache = typeof window !== "undefined" && !!(loadEventsFromCache()?.events?.length);

            let response;
            let icsTimeoutId = null;
            try {
                const fetchPromise = fetchICSEvents({
                    onStaleCache: () => {
                        if (!isNonBlocking) setEdtRemoteUpdateOverlay(true);
                    }
                });

                // Timeout : en arrière-plan, délai un peu plus long mais sans bloquer l'affichage
                let timeoutMs = 15000;
                if (hasLocalCache) {
                    timeoutMs = isNonBlocking ? FETCH_ICS_TIMEOUT_BG_MS : FETCH_ICS_TIMEOUT_MS;
                }
                console.log("[Page] Timeout fetch ICS :", timeoutMs, "ms | cache :", hasLocalCache, "| ui :", uiMode);
                const timeoutPromise = new Promise((_, reject) => {
                    icsTimeoutId = setTimeout(
                        () => reject(new Error('FETCH_ICS_TIMEOUT')),
                        timeoutMs
                    );
                });
                response = await Promise.race([fetchPromise, timeoutPromise]);
            } catch (fetchError) {
                const isTimeout = fetchError?.message === 'FETCH_ICS_TIMEOUT';
                if (isTimeout) {
                    console.warn('[Page] Timeout synchro ICS — repli sur le cache si disponible');
                }
                // En cas d'erreur réseau ou timeout, utiliser le cache
                // "Hors ligne" = message retourné par le Service Worker en mode offline (HTTP 503)
                const isNetworkError = isTimeout ||
                    !isOnline ||
                    fetchError.message.includes('Failed to fetch') ||
                    fetchError.message.includes('réseau') ||
                    fetchError.message.includes('network') ||
                    fetchError.message.includes('fetch failed') ||
                    fetchError.message.toLowerCase().includes('hors ligne') ||
                    fetchError.message.includes('offline') ||
                    fetchError.message.includes('503');

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
            } finally {
                if (icsTimeoutId) clearTimeout(icsTimeoutId);
            }

            const eventsData = Array.isArray(response?.events)
                ? response.events
                : Array.isArray(response)
                    ? response
                    : [];

            const meta = response?.meta || {};
            const diff = response?.diff || {added: [], updated: [], removed: []};
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

            const weeks = extractAvailableWeeks(eventsData, language);
            setAvailableWeeks(weeks);
            syncSelectedWeekWithAvailableWeeks(weeks);

            // Vérifier si on est vraiment en ligne (HEAD optionnel : sauté en arrière-plan car le fetch ICS vient de réussir)
            let isReallyOffline = typeof navigator !== "undefined" && !navigator.onLine;
            if (!isReallyOffline && !isNonBlocking) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    await fetch("/api/fetch-ics", {
                        method: "HEAD",
                        cache: "no-store",
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                } catch (e) {
                    console.log(
                        "[Page] Navigateur en ligne mais serveur inaccessible (SW cache probable) -> Mode hors ligne forcé"
                    );
                    isReallyOffline = true;
                }
            }

            if (!isReallyOffline) {
                const serverHash = meta.hash || null;
                const preserveTimestamp =
                    (meta.source === 'local-cache' && meta.fromCache === true) ||
                    meta.icsUnchanged === true;

                // Toujours réécrire le cache local avec la liste complète quand on est en ligne (y compris ICS inchangé).
                if (eventsData.length > 0) {
                    saveEventsToCache(eventsData, colorMapping, serverHash, {preserveTimestamp});
                }

                if (!preserveTimestamp) {
                    const newTimestamp = new Date().toISOString();
                    setLastUpdateTimestamp(newTimestamp);
                    console.log('[Page] En ligne - Date actuelle:', newTimestamp, '| Hash:', serverHash);
                } else {
                    if (typeof window !== 'undefined') {
                        const ts = localStorage.getItem('lastUpdateTimestamp');
                        if (ts) setLastUpdateTimestamp(ts);
                    }
                    console.log('[Page] Données inchangées — cache EDT complet réécrit, date de MAJ conservée | Hash:', serverHash);
                }
                setHasNetworkError(false);
            } else {
                // Hors ligne : on ne met PAS à jour le cache pour ne pas écraser le timestamp
                // On affiche le timestamp existant dans le cache
                if (typeof window !== 'undefined') {
                    const cachedTimestamp = localStorage.getItem('lastUpdateTimestamp');
                    if (cachedTimestamp) {
                        setLastUpdateTimestamp(cachedTimestamp);
                        console.log('[Page] Hors ligne - Date du cache conservée:', cachedTimestamp);
                    } else {
                        // Fallback si pas de timestamp
                        setLastUpdateTimestamp(null);
                    }
                }
                setHasNetworkError(true);
            }

            // Historiser les matières détectées si elles ont changé
            await saveSnapshotIfChanged(eventsData, {skip: shouldSkipHistory});

            const totalChanges = diff.added.length + diff.updated.length + diff.removed.length;

            // OPTIMISATION : Ne montrer la notification QUE si le hash a vraiment changé
            // Comparer avec le hash précédent dans localStorage
            const previousHash = typeof window !== 'undefined' ? localStorage.getItem('lastNotificationHash') : null;
            const currentHash = meta.hash || null;
            const hashHasChanged = currentHash && previousHash && currentHash !== previousHash;

            // Afficher la notification seulement si :
            // 1. Il y a des changements détectés
            // 2. Il y avait des events avant
            // 3. On n'est pas hors ligne
            // 4. ET soit le hash a changé, soit c'est la première visite (pas de hash précédent)
            const shouldShowNotification = totalChanges > 0 &&
                hadEventsBefore &&
                !isReallyOffline &&
                (hashHasChanged || !previousHash);

            if (shouldShowNotification) {
                console.log(`[Page] Changements RÉELS détectés (${totalChanges}): ${diff.added.length} ajoutés, ${diff.updated.length} modifiés, ${diff.removed.length} supprimés`);
                console.log(`[Page] Hash changé: ${previousHash} → ${currentHash}`);

                // Déterminer si les changements concernent la semaine actuellement affichée
                let changesInCurrentWeek = false;

                if (selectedWeek) {
                    // Calculer la plage de dates de la semaine affichée
                    const weekStart = new Date(selectedWeek);
                    weekStart.setHours(0, 0, 0, 0);
                    const weekEnd = new Date(selectedWeek);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    weekEnd.setHours(23, 59, 59, 999);

                    // Vérifier si un des changements concerne cette semaine
                    const isEventInWeek = (event) => {
                        if (!event || !event.start) return false;
                        const eventDate = new Date(event.start);
                        return eventDate >= weekStart && eventDate <= weekEnd;
                    };

                    const addedInWeek = diff.added.some(isEventInWeek);
                    const updatedInWeek = diff.updated.some(ev => isEventInWeek(ev.after || ev));
                    const removedInWeek = diff.removed.some(isEventInWeek);

                    changesInCurrentWeek = addedInWeek || updatedInWeek || removedInWeek;

                    if (changesInCurrentWeek) {
                        console.log(`[Page] Changements dans la semaine affichée (${selectedWeek.toLocaleDateString()})`);
                    } else {
                        console.log(`[Page] Changements HORS de la semaine affichée — notification ignorée`);
                    }
                }

                if (changesInCurrentWeek) {
                    setShowEdtMinorUpdateHint(false);
                    setShowEdtChangeToast(true);
                    setEdtChangeToastMessage("current-week");
                    setEdtChangeToastWeekLabel(formatWeekRangeLabel(selectedWeek));
                } else {
                    setShowEdtChangeToast(false);
                    setShowEdtMinorUpdateHint(true);
                }

                if (currentHash && typeof window !== "undefined") {
                    localStorage.setItem("lastNotificationHash", currentHash);
                    localStorage.setItem("lastEdtChangeNotificationTime", String(Date.now()));
                }
            } else if (totalChanges > 0) {
                // Des changements sont détectés mais le hash est identique = faux positif
                console.log(`[Page] Changements ignorés (cache backend vide, hash identique): ${totalChanges} changes, hash: ${currentHash}`);
            }

            // Afficher une notification de debug en mode dev
            if (devMode) {

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
                err.message.includes('fetch failed') ||
                err.message.toLowerCase().includes('hors ligne') ||
                err.message.toLowerCase().includes('offline') ||
                err.message.includes('503') ||
                err.message.includes('FETCH_ICS_TIMEOUT');

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
            finishBlockingLoading();
            setEdtRemoteUpdateOverlay(false);
            if (verifyingActive) setIsEdtVerifying(false);
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
        if (allEvents.length === 0) {
            setEventsCalculated(false);
            return;
        }

        let startDate, endDate;

        if (showFullYear) {
            // Mode année scolaire complète : septembre à août
            const schoolYearRange = getSchoolYearRange();
            startDate = schoolYearRange.start;
            endDate = schoolYearRange.end;
        } else {
            // Mode semaine normale
            if (!selectedWeek) {
                setEventsCalculated(false);
                return;
            }
            // Toujours afficher toute la semaine (du lundi au dimanche)
            startDate = new Date(selectedWeek);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(selectedWeek);
            endDate.setDate(selectedWeek.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        }

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
                const {matiere} = getEventTitle(e);
                return matiere && selectedSubjects.includes(matiere);
            });
        }

        // Si un eventKey est présent dans l'URL, filtrer pour n'afficher que ce(s) cours
        const eventKeyParam = searchParams?.get('eventKey');
        if (eventKeyParam) {
            // Gérer plusieurs eventKey séparés par des virgules
            const eventKeys = eventKeyParam.split(',').map(key => decodeURIComponent(key.trim()));
            filtered = filtered.filter((e) => {
                const key = generateEventKey(e);
                return eventKeys.includes(key);
            });
        }

        setEvents(filtered);
        setEventsCalculated(true);
    }, [selectedWeek, allEvents, searchParams, selectedSubjects, showOnlyExams, showFullYear]);

    // Si un eventKey est présent dans l'URL, naviguer vers la semaine du cours
    useEffect(() => {
        const eventKeyParam = searchParams?.get('eventKey');
        if (!eventKeyParam || allEvents.length === 0) return;

        // Gérer plusieurs eventKey séparés par des virgules
        const eventKeys = eventKeyParam.split(',').map(key => decodeURIComponent(key.trim()));

        // Trouver le premier événement correspondant (pour déterminer la semaine)
        const matchingEvent = allEvents.find((e) => {
            const key = generateEventKey(e);
            return eventKeys.includes(key);
        });

        if (matchingEvent) {
            // Trouver le lundi de la semaine contenant cet événement
            const eventDate = new Date(matchingEvent.start);
            const monday = getMonday(eventDate);

            // Vérifier si cette semaine est disponible
            const weeks = extractAvailableWeeks(allEvents, language);
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

    // Chargement initial : en ligne → attendre la synchro hash / ICS avant d'afficher l'EDT ; hors ligne → cache tout de suite
    useEffect(() => {
        setTestModeState(isTestModeEnabled());
        setTestWeekModeState(isTestWeekEnabled());

        const cached = loadEventsFromCache();
        cachePrimedRef.current = !!(cached && cached.events && cached.events.length > 0);

        // Avant la fin de la sonde réseau : toujours afficher le chargement (spinner + libellé dédié).
        if (!connectivityReady) {
            setLoading(true);
            setCanShowCards(false);
            return;
        }

        // Vérification directe de navigator.onLine en plus du state isOnline
        // Raison : isOnline peut encore valoir true (valeur initiale useState) même si le navigateur
        // sait déjà qu'on est hors-ligne — la mise à jour du state est asynchrone (batch React)
        const navigatorSaysOffline = typeof navigator !== 'undefined' && !navigator.onLine;

        if (!isOnline || navigatorSaysOffline) {
            console.log('[Page] Mode hors ligne — affichage immédiat depuis le cache (isOnline:', isOnline, '/ navigator.onLine:', typeof navigator !== 'undefined' ? navigator.onLine : 'N/A', ')');
            if (blockingLoadStartRef.current === null) {
                blockingLoadStartRef.current = Date.now();
                blockingLoadHadCacheRef.current = !!(cached?.events?.length);
            }
            if (cached && cached.events && cached.events.length > 0) {
                // Même logique que loadCacheAndUpdateState : efface erreur / debug / notifs
                if (loadCacheAndUpdateState(cached)) {
                    setHasNetworkError(true);
                    finishBlockingLoading();
                }
            } else {
                setError('Mode hors ligne\n\nAucune sauvegarde en cache');
                setHasNetworkError(true);
                finishBlockingLoading();
            }
            return;
        }

        // En ligne avec cache : afficher l'EDT tout de suite, synchro serveur en arrière-plan
        if (cached && cached.events && cached.events.length > 0) {
            console.log("[Page] En ligne — affichage immédiat depuis le cache, vérification ICS en arrière-plan");
            if (loadCacheAndUpdateState(cached)) {
                setLoading(false);
                setCanShowCards(true);
                if (!hasPlayedHomeEntranceRef.current) {
                    hasPlayedHomeEntranceRef.current = true;
                    setEntranceAnimationActive(true);
                }
            }
            fetchEvents({uiMode: "background"});
        } else {
            console.log("[Page] En ligne — pas de cache, chargement initial depuis le serveur");
            fetchEvents({uiMode: "initial-blocking"});
        }
    }, [isOnline, connectivityReady]);

    useEffect(() => {
        if (!showEdtMinorUpdateHint) return;
        const id = window.setTimeout(() => setShowEdtMinorUpdateHint(false), 12000);
        return () => clearTimeout(id);
    }, [showEdtMinorUpdateHint]);

    useEffect(() => {
        return () => {
            if (blockingLoadEndTimerRef.current) {
                clearTimeout(blockingLoadEndTimerRef.current);
                blockingLoadEndTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!connectivityReady) {
            setEdtInitialLoadingText(t('page.connectivityCheck'));
            return;
        }
        const cached = loadEventsFromCache();
        setEdtInitialLoadingText(
            cached?.events?.length > 0 ? t('page.edtWaitSync') : t('page.edtLoadingFirst')
        );
    }, [t, connectivityReady]);

    // Charger les infos utilisateur (après la sonde réseau : évite un 503 SW inutile hors ligne au chargement)
    useEffect(() => {
        if (!connectivityReady) return;
        if (!isOnline) {
            setIsLoadingUser(false);
            return;
        }
        const loadUserInfo = async () => {
            try {
                setIsLoadingUser(true);
                // Délai minimum pour que le spinner soit visible (200ms minimum)
                const startTime = Date.now();
                const [res] = await Promise.all([
                    fetch("/api/user", {cache: "no-store"}),
                    new Promise(resolve => setTimeout(resolve, 500)) // Minimum 200ms
                ]);
                if (res.ok) {
                    const data = await res.json();
                    setUserInfo(data);
                }
                // S'assurer que le délai minimum de 200ms est respecté
                const elapsed = Date.now() - startTime;
                if (elapsed < 500) {
                    await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
                }
            } catch (error) {
                // Ignorer silencieusement si non connecté
            } finally {
                setIsLoadingUser(false);
            }
        };
        loadUserInfo();
    }, [connectivityReady, isOnline]);

    // Charger la date du dernier build uniquement pour les superAdmin
    useEffect(() => {
        if (!userInfo || userInfo.role !== 'superAdmin') return;

        const fetchBuildInfo = async () => {
            setIsLoadingBuildTimestamp(true);
            try {
                const res = await fetch('/api/build-id', {cache: 'no-store'});
                if (!res.ok) return;
                const data = await res.json();
                // On enregistre même si timestamp est null pour pouvoir afficher "Non disponible"
                setBuildTimestamp(data?.timestamp ?? null);
            } catch (e) {
                // En cas d'erreur, on n'affiche simplement pas l'info commit
            } finally {
                setIsLoadingBuildTimestamp(false);
            }
        };

        fetchBuildInfo();
    }, [userInfo]);


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
            document.querySelector('.subject-hours-modal-overlay') ||
            document.querySelector('.filter-overlay') ||
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
        document.addEventListener('touchstart', handleTouchStart, {passive: true});
        document.addEventListener('touchend', handleTouchEnd, {passive: true});

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

        const savedShowCurrentTimeIndicator = localStorage.getItem("showCurrentTimeIndicator");
        if (savedShowCurrentTimeIndicator !== null) {
            setShowCurrentTimeIndicator(savedShowCurrentTimeIndicator === "true");
        } else {
            // Compatibilité avec d'anciennes clés (vertical/horizontal)
            const savedShowVerticalCurrentTimeIndicator = localStorage.getItem("showVerticalCurrentTimeIndicator");
            const savedShowHorizontalCurrentTimeIndicator = localStorage.getItem("showHorizontalCurrentTimeIndicator");

            if (savedShowVerticalCurrentTimeIndicator !== null) {
                setShowCurrentTimeIndicator(savedShowVerticalCurrentTimeIndicator === "true");
            } else if (savedShowHorizontalCurrentTimeIndicator !== null) {
                setShowCurrentTimeIndicator(savedShowHorizontalCurrentTimeIndicator === "true");
            }
        }

        const savedColorPosition = localStorage.getItem("colorPosition");
        if (savedColorPosition === 'top' || savedColorPosition === 'background') {
            setColorPosition(savedColorPosition);
        } else {
            // Par défaut : fond (background)
            setColorPosition('background');
        }

        const savedColorBackgroundOpacity = localStorage.getItem("colorBackgroundOpacity");
        if (savedColorBackgroundOpacity !== null) {
            const opacity = parseFloat(savedColorBackgroundOpacity);
            if (!isNaN(opacity) && opacity >= 0 && opacity <= 1) {
                setColorBackgroundOpacity(opacity);
            }
        }

        const savedTimePassedOverlayIntensity = localStorage.getItem("timePassedOverlayIntensity");
        if (savedTimePassedOverlayIntensity !== null) {
            const intensity = parseFloat(savedTimePassedOverlayIntensity);
            if (!isNaN(intensity) && intensity >= 0 && intensity <= 1) {
                // Clamper entre 0.1 et 0.9
                const clampedIntensity = Math.max(0.1, Math.min(0.9, intensity));
                setTimePassedOverlayIntensity(clampedIntensity);
            }
        }

        const savedShowCourseProgressPercent = localStorage.getItem("showCourseProgressPercent");
        if (savedShowCourseProgressPercent !== null) {
            setShowCourseProgressPercent(savedShowCourseProgressPercent === "true");
        }

        const savedCourseProgressPercentDecimals = localStorage.getItem("courseProgressPercentDecimals");
        if (savedCourseProgressPercentDecimals !== null) {
            const parsed = parseInt(savedCourseProgressPercentDecimals, 10);
            if (!isNaN(parsed)) {
                const clamped = Math.max(0, Math.min(5, parsed));
                setCourseProgressPercentDecimals(clamped);
            }
        }

        const savedShowFullYear = localStorage.getItem("showFullYear");
        if (savedShowFullYear === 'true') setShowFullYear(true);
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
    const groupByDay = useMemo(() => groupEventsByDay(events, viewMode === 'horizontal' ? 'long' : 'short', language), [events, viewMode, language]);
    const allDaysExpanded = useMemo(
        () => Object.keys(groupByDay).length > 0 && Object.keys(groupByDay).every(d => !collapsedDays[d]),
        [groupByDay, collapsedDays]
    );

    useEffect(() => {
        if (!entranceAnimationActive || events.length === 0) return;
        // Durée : 800ms animation + 600ms délai max + marge
        const durationMs = 800 + 600 + 200;
        const t = window.setTimeout(() => setEntranceAnimationActive(false), durationMs);
        return () => clearTimeout(t);
    }, [entranceAnimationActive, events.length]);

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
        setShowDayWarningToast,
        language,
    });

    const handleRefresh = handlers.handleRefresh;
    const handleToggleAutoScroll = (enabled) => handlers.handleToggleAutoScroll(enabled, setAutoScrollToday);
    const handleViewModeChange = (mode) => handlers.handleViewModeChange(mode, setViewMode);
    const handleToggleTimeLabels = (enabled) => handlers.handleToggleTimeLabels(enabled, setShowTimeLabels);
    const handleToggle15MinSpacing = (enabled) => handlers.handleToggle15MinSpacing(enabled, setHide15MinSpacing);
    const handleToggleTimeRemaining = (enabled) => handlers.handleToggleTimeRemaining(enabled, setShowTimeRemaining);
    const handleToggleTooltips = (enabled) => handlers.handleToggleTooltips(enabled, setShowTooltips);
    const handleToggleCurrentTimeIndicator = (enabled) =>
        handlers.handleToggleCurrentTimeIndicator(enabled, setShowCurrentTimeIndicator);
    const handleToggleShowCourseProgressPercent = (enabled) =>
        handlers.handleToggleShowCourseProgressPercent(enabled, setShowCourseProgressPercent);
    const handleToggleCourseProgressPercentDecimals = (value) =>
        handlers.handleToggleCourseProgressPercentDecimals(value, setCourseProgressPercentDecimals);
    const handleColorPositionChange = (position) => handlers.handleColorPositionChange(position, setColorPosition);
    const handleColorBackgroundOpacityChange = (opacity) => handlers.handleColorBackgroundOpacityChange(opacity, setColorBackgroundOpacity);
    const handleTimePassedOverlayIntensityChange = (intensity) => handlers.handleTimePassedOverlayIntensityChange(intensity, setTimePassedOverlayIntensity);
    const handleToggleFullYear = () => handlers.handleToggleFullYear(!showFullYear, setShowFullYear);
    const handleToggleDay = handlers.handleToggleDay;
    const handleToggleAllDays = handlers.handleToggleAllDays;

    const handleDayOptionsHintPosition = () => {
        if (typeof window === 'undefined' || window.innerWidth < 640) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const hint = dayOptionsHintRef.current;
                if (!hint) return;
                const rect = hint.getBoundingClientRect();
                const margin = 12;
                setDayOptionsHintAlignLeft(rect.right > window.innerWidth - margin);
            });
        });
    };

    const handleDayOptionsHintReset = () => {
        setDayOptionsHintAlignLeft(false);
    };

    // Wrapper pour handleToday qui supprime le paramètre eventKey de l'URL
    const handleToday = () => {
        // Désactiver le mode année scolaire si actif
        if (showFullYear) {
            handleToggleFullYear();
        }
        handlers.handleToday();
        // Supprimer le paramètre eventKey de l'URL si présent
        if (searchParams?.get('eventKey')) {
            router.replace('/');
        }
    };

    const handleWeekChange = (newWeekMonday) => {
        // Désactiver le mode année scolaire si actif
        if (showFullYear) {
            handleToggleFullYear();
        }
        handlers.handleWeekChange(newWeekMonday);
    };
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

    // Calculer le temps restant avant la fin du cours (traduit)
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
                return t('timeRemaining.hoursOnly').replace('{hours}', remainingHours);
            }
            return t('timeRemaining.hoursMinutes')
                .replace('{hours}', remainingHours)
                .replace('{minutes}', String(minutes).padStart(2, '0'));
        }
        if (remainingMinutes === 1) {
            return t('timeRemaining.minute');
        }
        return t('timeRemaining.minutes').replace('{count}', remainingMinutes);
    }, [getNextOngoingCourse, currentTime, isCurrentWeekSelected, showTimeRemaining, t]);

    // Formater le timestamp pour l'affichage
    const formatLastUpdate = (timestamp) => {
        if (!timestamp) {
            // Si pas de timestamp mais qu'on a des événements en cache, c'est probablement un ancien cache
            // On affiche un message indiquant que la date n'est pas disponible
            if (allEvents.length > 0) {
                return 'Date inconnue';
            }
            return 'Non disponible';
        }
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Non disponible';

            const now = new Date();
            const isToday =
                date.getFullYear() === now.getFullYear() &&
                date.getMonth() === now.getMonth() &&
                date.getDate() === now.getDate();

            // On garde le format date (JJ/MM/AAAA) + heure (24h) existant
            const time = date.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            const day = isToday
                ? t('page.lastUpdateToday')
                : date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

            // "Today 22:03" ou "Aujourd'hui 22:03"
            return `${day} ${time}`;
        } catch (e) {
            return 'Non disponible';
        }
    };

    return (
        <div className={styles.pageWrapper}>
            {/* Toast d'avertissement pour le dernier jour */}
            {showDayWarningToast && (
                <div className={styles.dayWarningToast}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor"
                              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>
                        {language === 'fr'
                            ? 'Impossible de fermer tous les jours'
                            : 'Cannot close all days'}
                    </span>
                </div>
            )}
            <Toast
                message={edtChangeToastMessage === 'current-week'
                    ? `${t('page.edtChangeDetected')}${edtChangeToastWeekLabel ? ` (${edtChangeToastWeekLabel})` : ''}`
                    : t('page.edtChangeGeneral')}
                isVisible={showEdtChangeToast}
                onClose={() => setShowEdtChangeToast(false)}
            />
            {showEdtMinorUpdateHint && (
                <div className={styles.edtMinorUpdateHint} role="status" aria-live="polite">
                    {t("page.edtMinorUpdateHint")}
                </div>
            )}
            {edtRemoteUpdateOverlay && (
                <div className={styles.edtRemoteUpdateOverlay} role="status" aria-live="polite">
                    <div className={styles.edtRemoteUpdateOverlayInner}>
                        <Spinner size="large" variant="border" ariaLabel={t('page.edtUpdatingOverlay')}/>
                        <p className={styles.edtRemoteUpdateOverlayText}>{t('page.edtUpdatingOverlay')}</p>
                    </div>
                </div>
            )}

            {/* Bannière de mise à jour (is_update) */}
            <UpdateBanner/>

            {/* Prompt d'installation PWA */}
            <PWAInstallPrompt/>

            {/* Bouton de scroll to top */}
            <ScrollToTop/>

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
                allDaysCollapsed={!allDaysExpanded}
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
                showCurrentTimeIndicator={showCurrentTimeIndicator}
                onToggleCurrentTimeIndicator={handleToggleCurrentTimeIndicator}
                colorPosition={colorPosition}
                onColorPositionChange={handleColorPositionChange}
                colorBackgroundOpacity={colorBackgroundOpacity}
                onColorBackgroundOpacityChange={handleColorBackgroundOpacityChange}
                timePassedOverlayIntensity={timePassedOverlayIntensity}
                onTimePassedOverlayIntensityChange={handleTimePassedOverlayIntensityChange}
                showCourseProgressPercent={showCourseProgressPercent}
                onToggleShowCourseProgressPercent={handleToggleShowCourseProgressPercent}
                courseProgressPercentDecimals={courseProgressPercentDecimals}
                onToggleCourseProgressPercentDecimals={handleToggleCourseProgressPercentDecimals}
                subjects={subjects}
                selectedSubjects={selectedSubjects}
                onSubjectsChange={setSelectedSubjects}
                showOnlyExams={showOnlyExams}
                onShowOnlyExamsChange={setShowOnlyExams}
                showFilter={true}
                userInfo={userInfo}
                isLoadingUser={isLoadingUser}
                showFullYear={showFullYear}
                onToggleFullYear={handleToggleFullYear}
            />

            <main className={`${styles.container} ${viewMode === 'vertical' ? styles.containerVertical : ''}`}>
                {/* Affichage détaillé de l'erreur uniquement en mode dev (desktop) */}
                {error && devMode && !isSmallScreen && (
                    <div className={styles.errorContainer}>
                        <h3 className={styles.errorTitle}>❌ {t('page.debugErrorTitle')}</h3>
                        <div className={styles.errorMessage}>
                            <strong>{t('page.debugErrorMessage')}</strong> {error}
                        </div>

                        {debugInfo && (
                            <details className={styles.debugDetails} open>
                                <summary className={styles.debugSummary}>
                                    🔍 {t('page.debugInfoTitle')} ({t('page.debugInfoToggle')})
                                </summary>
                                <div className={styles.debugContent}>
                                    <div>
                                        <strong>{t('page.debugPWAInstalled')}</strong>{' '}
                                        {debugInfo.isPWAInstalled ? `${t('page.debugYes')} ✅` : `${t('page.debugNo')} ❌`}
                                    </div>
                                    <div>
                                        <strong>{t('page.debugStandaloneMode')}</strong>{' '}
                                        {debugInfo.isStandalone ? `${t('page.debugYes')} ✅` : `${t('page.debugNo')} ❌`}
                                    </div>
                                    <div><strong>{t('page.debugProtocol')}</strong> {debugInfo.protocol}</div>
                                    <div><strong>{t('page.debugURL')}</strong> {debugInfo.href}</div>
                                    {debugInfo.fetchError && (
                                        <>
                                            <hr className={styles.debugHr}/>
                                            <div><strong>{t('page.debugFetchError')}</strong> {debugInfo.fetchError}
                                            </div>
                                        </>
                                    )}
                                    {debugInfo.userAgent && (
                                        <div className={styles.debugUserAgent}>
                                            <strong>{t('page.debugUserAgent')}</strong> {debugInfo.userAgent}
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}
                    </div>
                )}

                {/* Affichage utilisateur simple (mobile + desktop), aussi en mode dev */}
                {error && (
                    <div className={styles.smallErrorWrapper} role="status" aria-live="polite">
                        <div className={styles.smallErrorBanner}>
                            <div className={styles.smallErrorContent}>
                                <div className={styles.smallErrorTitle}>{t('page.errorLoadingEDT')}</div>
                                <div className={styles.smallErrorText}>
                                    {t('page.errorLoadingData')}
                                </div>
                                {hasNetworkError && (
                                    <div className={styles.smallErrorHint}>
                                        {t('page.errorNetworkHint')}
                                    </div>
                                )}
                                {supportUrl && (
                                    <a
                                        href={supportUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.smallErrorLink}
                                    >
                                        {t('page.openGalao')}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {loading && events.length === 0 && (
                    <div className={styles.edtInitialLoading}>
                        <Spinner size="large" variant="border" ariaLabel={edtInitialLoadingText}/>
                        <p className={styles.edtInitialLoadingHint}>{edtInitialLoadingText}</p>
                    </div>
                )}

                {!loading && events.length === 0 && allEvents.length > 0 && availableWeeks.length > 0 && selectedWeek && eventsCalculated && (
                    <div className={styles.noCoursesMessage}>
                        {t('page.noCoursesThisWeek')}
                    </div>
                )}

                {showFullYear && (!loading || events.length > 0) ? (
                    <YearCalendar
                        events={events}
                        onDateClick={(date) => {
                            const monday = getMonday(date);
                            setSelectedWeek(monday);
                            handleToggleFullYear();
                        }}
                    />
                ) : (
                    (!loading || events.length > 0) && events.length > 0 && canShowCards && (
                        <div style={viewMode === 'vertical' ? {margin: '.3rem'} : {margin: '0'}}
                             key={selectedWeek ? selectedWeek.getTime() : 'no-week'}
                             className={
                                 `${styles.weekContent} ` +
                                 (viewMode === 'vertical' ? styles.weekContentVertical : '') + ' ' +
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
                            {viewMode === 'horizontal' && (
                                <div
                                    className={styles.dayOptionsButtonWrapper}
                                    data-hint-align={dayOptionsHintAlignLeft ? 'left' : undefined}
                                    onMouseEnter={handleDayOptionsHintPosition}
                                    onMouseLeave={handleDayOptionsHintReset}
                                >
                                    <button
                                        onClick={() => handleToggleAllDays()}
                                        className={styles.dayOptionsButton}
                                        aria-label={allDaysExpanded ? t('navbar.collapseAllDays') : t('navbar.expandAllDays')}
                                        onFocus={handleDayOptionsHintPosition}
                                        onBlur={handleDayOptionsHintReset}
                                    >
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            aria-hidden="true"
                                        >
                                            {allDaysExpanded ? (
                                                <path
                                                    d="M6 15l6-6 6 6"
                                                    stroke="currentColor"
                                                    strokeWidth="2.2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            ) : (
                                                <path
                                                    d="M6 9l6 6 6-6"
                                                    stroke="currentColor"
                                                    strokeWidth="2.2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            )}
                                        </svg>
                                    </button>
                                    {showTooltips && (
                                        <div
                                            ref={dayOptionsHintRef}
                                            className={styles.dayOptionsHint}
                                            aria-hidden="true"
                                        >
                                            {allDaysExpanded
                                                ? t('navbar.collapseAllDays')
                                                : t('navbar.expandAllDays')}
                                        </div>
                                    )}
                                </div>
                            )}
                            {viewMode === 'vertical' ? (
                                <VerticalSchedule
                                    events={events}
                                    subjectColors={subjectColors}
                                    entranceAnimationActive={entranceAnimationActive}
                                    showTooltips={showTooltips}
                                    onOpenEventDetails={(ev, position) => {
                                        setEventClickPosition(position);
                                        setSelectedEvent(ev);
                                    }}
                                    compactMode={compactMode}
                                    showTimeLabels={showTimeLabels}
                                    hide15MinSpacing={hide15MinSpacing}
                                    showCurrentTimeIndicator={showCurrentTimeIndicator}
                                    isPWAInstalled={isInstalled}
                                    monthFormat={'short'}
                                    courseNotes={courseNotes}
                                    colorPosition={colorPosition}
                                    colorBackgroundOpacity={colorBackgroundOpacity}
                                    timePassedOverlayIntensity={timePassedOverlayIntensity}
                                    showCourseProgressPercent={showCourseProgressPercent}
                                    courseProgressPercentDecimals={courseProgressPercentDecimals}
                                />
                            ) : (
                                Object.entries(groupByDay).map(([day, evs], index) => {
                                    const dayDate = evs[0] ? new Date(evs[0].start) : new Date();
                                    const isToday = dayDate.toDateString() === new Date().toDateString();

                                    return (
                                        <div key={day} style={{margin: '.3rem', position: 'relative'}}>
                                            <DayBlock
                                                ref={isToday ? todayRef : null}
                                                day={day}
                                                events={evs}
                                                subjectColors={subjectColors}
                                                isCollapsed={collapsedDays[day] || false}
                                                onToggle={() => handleToggleDay(day)}
                                                onOpenEventDetails={(ev, position) => {
                                                    setEventClickPosition(position);
                                                    setSelectedEvent(ev);
                                                }}
                                                entranceAnimationActive={entranceAnimationActive}
                                                compactMode={compactMode}
                                                showTimeLabels={showTimeLabels}
                                                hide15MinSpacing={hide15MinSpacing}
                                                courseNotes={courseNotes}
                                                showCurrentTimeIndicator={showCurrentTimeIndicator}
                                                colorPosition={colorPosition}
                                                colorBackgroundOpacity={colorBackgroundOpacity}
                                                timePassedOverlayIntensity={timePassedOverlayIntensity}
                                                showCourseProgressPercent={showCourseProgressPercent}
                                                courseProgressPercentDecimals={courseProgressPercentDecimals}
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
                            {
                                !hasNetworkError && (
                                    <div className="last-update-info">
                                        <SubjectHoursInfo allEvents={allEvents} subjectColors={subjectColors}/>
                                        {isEdtVerifying && (
                                            <span className={styles.edtVerifyingPill} aria-live="polite">
                                            {t("page.edtVerifyingShort")}
                                        </span>
                                        )}
                                        <button
                                            onClick={() => setShowOfflineModal(true)}
                                            className="btn-update-detail"
                                            title="Cliquer pour voir les détails"
                                            aria-label="Voir les détails de la dernière mise à jour"
                                        >
                                            {t('page.lastUpdate')} {formatLastUpdate(lastUpdateTimestamp)}
                                        </button>
                                    </div>
                                )
                            }
                            {/* Affichage de la date et heure de dernière sauvegarde */}
                            {
                                hasNetworkError && (
                                    <div className="last-update-info">
                                        {isEdtVerifying && (
                                            <span className={styles.edtVerifyingPill} aria-live="polite">
                                            {t("page.edtVerifyingShort")}
                                        </span>
                                        )}
                                        <button
                                            onClick={() => setShowOfflineModal(true)}
                                            className={styles.offlineTimestamp}
                                            style={{
                                                cursor: 'pointer',
                                                font: 'inherit',
                                                textAlign: 'inherit',
                                                display: 'inline-block'
                                            }}
                                            title="Cliquer pour voir les détails"
                                            aria-label="Voir les détails de la dernière mise à jour"
                                        >
                                            {t('page.lastUpdate')} {formatLastUpdate(lastUpdateTimestamp)}
                                        </button>
                                    </div>
                                )
                            }
                        </div>
                    ))}
            </main>

            <Footer
                testMode={testMode}
                onToggleTestMode={handleToggleTestMode}
                testWeekMode={testWeekMode}
                onToggleTestWeek={handleToggleTestWeek}
            />

            <ScrollToTop/>

            <OfflineNotification
                forceShow={hasNetworkError}
                lastUpdateTimestamp={lastUpdateTimestamp}
                showModal={showOfflineModal}
                onModalClose={() => setShowOfflineModal(false)}
                onModalOpen={() => setShowOfflineModal(true)}
            />

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
                clickPosition={eventClickPosition}
                onClose={() => {
                    setSelectedEvent(null);
                    setEventClickPosition(null);
                }}
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
            <DevToolsButton/>

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
