// @ts-nocheck
import {selectBestWeek, getCurrentWeek} from "@/utils/dateUtils";
import {createSubjectColorMapping} from "@/utils/eventUtils";
import {extractAvailableWeeks} from "@/utils/dateUtils";
import {saveEventsToCache} from "@/services/icsService";
import {generateTestWeek} from "@/services/testDataService";

export function useHomePageHandlers({
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
    language
}) {
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

    const handleToggleAutoScroll = (enabled, setAutoScrollToday) => {
        setAutoScrollToday(enabled);
        localStorage.setItem('autoScrollToday', enabled.toString());
    };

    const handleViewModeChange = (mode, setViewMode) => {
        setViewMode(mode);
        localStorage.setItem('viewMode', mode);
    };

    const handleToggleTimeLabels = (enabled, setShowTimeLabels) => {
        setShowTimeLabels(enabled);
        localStorage.setItem('showTimeLabels', enabled.toString());
    };

    const handleToggle15MinSpacing = (enabled, setHide15MinSpacing) => {
        setHide15MinSpacing(enabled);
        localStorage.setItem('hide15MinSpacing', enabled.toString());
    };

    const handleToggleTimeRemaining = (enabled, setShowTimeRemaining) => {
        setShowTimeRemaining(enabled);
        localStorage.setItem('showTimeRemaining', enabled.toString());
    };

    const handleToggleTooltips = (enabled, setShowTooltips) => {
        setShowTooltips(enabled);
        localStorage.setItem('showTooltips', enabled.toString());
    };

    const handleToggleCurrentTimeIndicator = (enabled, setShowCurrentTimeIndicator) => {
        setShowCurrentTimeIndicator(enabled);
        localStorage.setItem('showCurrentTimeIndicator', enabled.toString());
    };

    const handleToggleShowCourseProgressPercent = (enabled, setShowCourseProgressPercent) => {
        setShowCourseProgressPercent(enabled);
        localStorage.setItem('showCourseProgressPercent', enabled.toString());
    };

    const handleToggleCourseProgressPercentDecimals = (value, setCourseProgressPercentDecimals) => {
        const clamped = Math.max(0, Math.min(5, value));
        setCourseProgressPercentDecimals(clamped);
        localStorage.setItem('courseProgressPercentDecimals', clamped.toString());
    };

    const handleColorPositionChange = (position, setColorPosition) => {
        setColorPosition(position);
        localStorage.setItem('colorPosition', position);
    };

    const handleColorBackgroundOpacityChange = (opacity, setColorBackgroundOpacity) => {
        setColorBackgroundOpacity(opacity);
        localStorage.setItem('colorBackgroundOpacity', opacity.toString());
    };

    const handleTimePassedOverlayIntensityChange = (intensity, setTimePassedOverlayIntensity) => {
        setTimePassedOverlayIntensity(intensity);
        localStorage.setItem('timePassedOverlayIntensity', intensity.toString());
    };

    const handleToggleFullYear = (enabled, setShowFullYear) => {
        setShowFullYear(enabled);
        localStorage.setItem('showFullYear', enabled.toString());
    };

    const handleToggleDay = (day) => {
        // Vérifier si on essaie de fermer le dernier jour ouvert
        const willBeCollapsed = !collapsedDays[day];
        
        if (willBeCollapsed) {
            // Compter combien de jours sont actuellement ouverts
            const dayKeys = Object.keys(groupByDay);
            const openDaysCount = dayKeys.filter(d => !collapsedDays[d]).length;
            
            // Si c'est le dernier jour ouvert, ne pas le fermer
            if (openDaysCount <= 1) {
                //console.log('[HandleToggleDay] Impossible de fermer le dernier jour ouvert');
                // Afficher le toast d'avertissement
                if (setShowDayWarningToast) {
                    setShowDayWarningToast(true);
                    setTimeout(() => setShowDayWarningToast(false), 3000);
                }
                return; // Ne rien faire
            }
        }
        
        const newCollapsedDays = {
            ...collapsedDays,
            [day]: willBeCollapsed
        };
        setCollapsedDays(newCollapsedDays);
        localStorage.setItem('collapsedDays', JSON.stringify(newCollapsedDays));
    };

    const handleToggleAllDays = () => {
        const dayKeys = Object.keys(groupByDay);
        if (dayKeys.length === 0) return;
        
        const someExpanded = dayKeys.some(d => !collapsedDays[d]);
        const nextCollapsed = {};
        
        if (someExpanded) {
            // Si certains jours sont ouverts, on veut tous les fermer SAUF un
            // Garder ouvert le jour actuel s'il existe, sinon le premier jour
            const today = new Date();
            const todayDateString = today.toDateString();
            
            let todayKey = null;
            for (const dayKey of dayKeys) {
                const dayEvents = groupByDay[dayKey];
                if (dayEvents && dayEvents.length > 0) {
                    const firstEventDate = new Date(dayEvents[0].start);
                    if (firstEventDate.toDateString() === todayDateString) {
                        todayKey = dayKey;
                        break;
                    }
                }
            }
            
            // Si aujourd'hui n'existe pas dans cette semaine, garder le premier jour ouvert
            const dayToKeepOpen = todayKey || dayKeys[0];
            
            for (const d of dayKeys) {
                nextCollapsed[d] = (d !== dayToKeepOpen); // Fermer tous sauf celui qu'on garde
            }
        } else {
            // Si tous les jours sont fermés, ouvrir tous les jours
            for (const d of dayKeys) {
                nextCollapsed[d] = false;
            }
        }
        
        setCollapsedDays(nextCollapsed);
        localStorage.setItem('collapsedDays', JSON.stringify(nextCollapsed));
    };

    const handleToggleTestMode = (testMode) => {
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

            // Créer 7 cours d'affilée de 6h30 à 20h avec 15 minutes de pause entre chaque
            const testEvents = [];
            const courses = [
                {subject: 'Mathématiques Appliquées', prof: 'M. Dupont', location: '3.1.08'}, // Saint-Martin
                {subject: 'Informatique Théorique', prof: 'Mme Martin', location: '35.1.15'}, // Conté
                {subject: 'Base de Données', prof: 'M. Bernard', location: '2.2.18'}, // Saint-Martin
                {subject: 'Développement Web', prof: 'Mme Dubois', location: '33.1.10'}, // Conté
                {subject: 'Architecture Logicielle', prof: 'M. Lefebvre', location: '11.1.12'}, // Saint-Martin
                {subject: 'Intelligence Artificielle', prof: 'Mme Garcia', location: '34.1.16'}, // Conté
                {subject: 'Sécurité Informatique', prof: 'M. Moreau', location: '15.2.13'} // Saint-Martin
            ];

            // Calcul de la durée optimale pour finir exactement à 20h
            // De 6h30 à 20h = 13h30 = 810 minutes
            // 6 pauses * 15 min = 90 minutes
            // Temps disponible pour les cours = 810 - 90 = 720 minutes
            // Durée par cours = 720 / 7 ≈ 102.86 minutes ≈ 1h43
            const totalMinutes = 13 * 60 + 30; // 6h30 à 20h = 810 minutes
            const pauseDurationMinutes = 15;
            const totalPauseMinutes = 6 * pauseDurationMinutes; // 6 pauses entre 7 cours
            const availableMinutes = totalMinutes - totalPauseMinutes;
            const courseDurationMinutes = Math.floor(availableMinutes / 7); // ≈ 102 minutes (1h42)

            // Premier cours commence à 6h30
            let currentStartHour = 6;
            let currentStartMinute = 30;

            // Créer 7 cours d'affilée
            for (let i = 0; i < 7; i++) {
                const course = courses[i];

                const startTime = new Date(today);
                startTime.setHours(currentStartHour, currentStartMinute, 0, 0);

                const endTime = new Date(startTime);

                // Pour le dernier cours (index 6), on force la fin à 20h
                if (i === 6) {
                    endTime.setHours(20, 0, 0, 0);
                } else {
                    endTime.setMinutes(startTime.getMinutes() + courseDurationMinutes);
                }

                testEvents.push({
                    summary: course.subject,
                    start: startTime,
                    end: endTime,
                    location: course.location,
                    description: `Professeur : ${course.prof}\nMatière : ${course.subject}\n\n[Cours de test généré automatiquement]`
                });

                // Calculer l'heure de début du prochain cours (fin du cours actuel + pause)
                // Sauf pour le dernier cours
                if (i < 6) {
                    const nextStartTime = new Date(endTime);
                    nextStartTime.setMinutes(nextStartTime.getMinutes() + pauseDurationMinutes);
                    currentStartHour = nextStartTime.getHours();
                    currentStartMinute = nextStartTime.getMinutes();
                }
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

    const handleToggleTestWeek = (testWeekMode) => {
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


    return {
        handleRefresh,
        handleToday,
        handleWeekChange,
        handleToggleAutoScroll,
        handleViewModeChange,
        handleToggleTimeLabels,
        handleToggle15MinSpacing,
        handleToggleTimeRemaining,
        handleToggleTooltips,
        handleToggleCurrentTimeIndicator,
        handleToggleShowCourseProgressPercent,
        handleToggleCourseProgressPercentDecimals,
        handleColorPositionChange,
        handleColorBackgroundOpacityChange,
        handleTimePassedOverlayIntensityChange,
        handleToggleFullYear,
        handleToggleDay,
        handleToggleAllDays,
        handleToggleTestMode,
        handleToggleTestWeek
    };
}



