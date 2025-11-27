"use client";
import React, { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import styles from "./page.module.css";
import { getEventTitle } from "@/utils/eventUtils";
import { areNoteEntriesEqual, parseStoredNoteValue, sanitizeNoteEntries } from "@/utils/noteEntries";
import LoginForm from "@/app/login/LoginForm";

function AgendaContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const extractNoteEntries = (record) => {
        if (!record) return [];
        return Array.isArray(record.entries)
            ? record.entries
            : parseStoredNoteValue(record.notes);
    };
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [userInfo, setUserInfo] = useState(null); // { name, lastName }
    const [userRole, setUserRole] = useState(null);
    const [events, setEvents] = useState([]);
    const [notes, setNotes] = useState(new Map()); // Map<course_uid, note>
    const [publicNotes, setPublicNotes] = useState([]); // Notes visibles par tous
    const [activeTab, setActiveTab] = useState("public");
    const [showOldNotes, setShowOldNotes] = useState(false); // Afficher les anciennes notes
    const [selectedLabelFilter, setSelectedLabelFilter] = useState(null); // Filtre par label
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedCourse, setSelectedCourse] = useState(null); // course_uid sélectionné
    const [noteEntries, setNoteEntries] = useState([]);
    const [originalNoteEntries, setOriginalNoteEntries] = useState([]); // Pour détecter les modifications
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [saving, setSaving] = useState(false);
    const [entryLabels, setEntryLabels] = useState({}); // Labels par note : { "0": ["Contrôle"], "1": ["Devoir"] }
    const [originalEntryLabels, setOriginalEntryLabels] = useState({}); // Labels originaux pour détecter les modifications
    const [showLabelInputForEntry, setShowLabelInputForEntry] = useState(null); // Index de la note pour lequel l'input est ouvert (null si aucun)
    const [newLabelValue, setNewLabelValue] = useState(""); // Valeur du nouveau label
    const [error, setError] = useState(null);
    const [dateLoading, setDateLoading] = useState(false);
    const dateTriggerRef = useRef(null);
    const calendarPopoverRef = useRef(null);
    const notePanelMobileRef = useRef(null);
    const [calendarMonth, setCalendarMonth] = useState(null); // Date sur le 1er jour du mois affiché
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [showOnlyCourseDays, setShowOnlyCourseDays] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    const refreshPublicNotes = useCallback(async ({ existingResponse = null, silent = false } = {}) => {
        try {
            const response = existingResponse || await fetch("/api/agenda?mode=public", {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Erreur lors de la récupération des notes publiques");
            }

            const data = await response.json();
            const noteList = Array.isArray(data.notes) ? data.notes : [];
            setPublicNotes(noteList);
            return noteList;
        } catch (err) {
            console.error("[Agenda] Erreur notes publiques:", err);
            if (!silent) {
                throw err;
            }
            return [];
        }
    }, []);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const userPromise = fetch("/api/user", { cache: "no-store" });
            const eventsPromise = fetch("/api/fetch-ics", { cache: "no-store" });
            const publicPromise = fetch("/api/agenda?mode=public", { cache: "no-store" });

            const [userRes, eventsRes, publicRes] = await Promise.all([
                userPromise,
                eventsPromise,
                publicPromise,
            ]);

            await refreshPublicNotes({ existingResponse: publicRes });

            if (!eventsRes.ok) {
                throw new Error("Erreur lors de la récupération des cours");
            }

            const eventsData = await eventsRes.json();
            const eventsList = Array.isArray(eventsData.events)
                ? eventsData.events
                : [];

            eventsList.sort((a, b) => {
                const dateA = new Date(a.start || 0);
                const dateB = new Date(b.start || 0);
                return dateA - dateB;
            });

            setEvents(eventsList);

            let isAuthenticated = false;

            if (userRes.status === 401) {
                setAuthenticated(false);
                setUserInfo(null);
                setUserRole(null);
            } else {
                if (!userRes.ok) {
                    const errorData = await userRes.json().catch(() => ({}));
                    console.error("[Agenda] Erreur récupération user:", errorData);
                    throw new Error(errorData.error || "Erreur lors de la récupération des informations utilisateur");
                }

                const userData = await userRes.json();
                setUserInfo(userData);
                setAuthenticated(true);
                isAuthenticated = true;
            }

            if (isAuthenticated) {
                const personalRes = await fetch("/api/agenda", {
                    cache: "no-store",
                });

                if (!personalRes.ok) {
                    throw new Error("Erreur lors de la récupération de vos notes");
                }

                const personalData = await personalRes.json();
                const notesMap = new Map();
                if (personalData.notes && Array.isArray(personalData.notes)) {
                    personalData.notes.forEach((note) => {
                        notesMap.set(note.course_uid, note);
                    });
                }
                setNotes(notesMap);
            } else {
                setNotes(new Map());
                setSelectedCourse(null);
                setNoteEntries([]);
                setOriginalNoteEntries([]);
                setIsEditingNotes(false);
            }
        } catch (err) {
            console.error("[Agenda] Erreur chargement:", err);
            setError(err.message || "Erreur lors du chargement");
        } finally {
            setLoading(false);
        }
    }, [refreshPublicNotes]);

    // Initialiser la date par défaut (aujourd'hui) uniquement côté client
    useEffect(() => {
        if (typeof window !== 'undefined' && !selectedDate) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const formatted = `${year}-${month}-${day}`;
            setSelectedDate(formatted);
            setCalendarBaseMonth(formatted);
        }
    }, [selectedDate]);

    // Vérifier l'authentification et charger les données
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Gérer le paramètre course_uid depuis l'URL
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const courseUidParam = searchParams?.get('course_uid');
        if (courseUidParam && events.length > 0) {
            // Trouver le cours correspondant
            const course = events.find(e => e.uid === courseUidParam);
            if (course) {
                // Définir la date du cours
                const courseDate = new Date(course.start);
                const year = courseDate.getFullYear();
                const month = String(courseDate.getMonth() + 1).padStart(2, '0');
                const day = String(courseDate.getDate()).padStart(2, '0');
                setSelectedDate(`${year}-${month}-${day}`);
                // Sélectionner le cours
                setSelectedCourse(courseUidParam);
            }
        }
    }, [searchParams, events]);

    // Charger la note du cours sélectionné quand il change
    useEffect(() => {
        if (selectedCourse) {
            const courseNote = notes.get(selectedCourse);
            const entries = extractNoteEntries(courseNote);
            setNoteEntries(entries.length ? [...entries] : []);
            setOriginalNoteEntries(entries);
            setIsEditingNotes(false);
            
            // Charger les labels par note
            const entryLabelsData = courseNote?.entry_labels || {};
            setEntryLabels({ ...entryLabelsData });
            setOriginalEntryLabels({ ...entryLabelsData });
        } else {
            setNoteEntries([]);
            setOriginalNoteEntries([]);
            setIsEditingNotes(false);
            setEntryLabels({});
            setOriginalEntryLabels({});
        }
        setShowLabelInputForEntry(null);
        setNewLabelValue("");
    }, [selectedCourse, notes]);

    // Vérifier si le contenu a été modifié
    const hasChanges = !areNoteEntriesEqual(noteEntries, originalNoteEntries);
    const sanitizedCurrentEntries = sanitizeNoteEntries(noteEntries);
    const savedEntries = sanitizeNoteEntries(originalNoteEntries);

    // Filtrer les cours pour la date sélectionnée
    const getCoursesForDate = (dateStr) => {
        if (!dateStr) return [];

        const selectedDateObj = new Date(dateStr + 'T00:00:00');
        const selectedDateString = selectedDateObj.toDateString();

        return events.filter((event) => {
            if (!event.start || !event.uid) return false;
            const eventDate = new Date(event.start);
            return eventDate.toDateString() === selectedDateString;
        }).sort((a, b) => {
            const timeA = new Date(a.start).getTime();
            const timeB = new Date(b.start).getTime();
            return timeA - timeB;
        });
    };

    const coursesForSelectedDate = getCoursesForDate(selectedDate);

    const eventsByUid = useMemo(() => {
        const map = new Map();
        events.forEach((event) => {
            if (event?.uid) {
                map.set(event.uid, event);
            }
        });
        return map;
    }, [events]);

    // Calculer toutes les notes avec leur statut futur/passé, triées du passé au futur
    const allPublicNotesWithStatus = useMemo(() => {
        if (!publicNotes.length) return [];

        const now = new Date();
        now.setHours(0, 0, 0, 0); // Mettre à minuit pour comparer les dates uniquement

        return publicNotes
            .map((note) => {
                const relatedEvent = note?.course_uid ? eventsByUid.get(note.course_uid) : null;
                const entries = sanitizeNoteEntries(note?.entries);
                const displayDate = relatedEvent?.start || note?.updated_at || note?.created_at || null;
                const eventDate = relatedEvent?.start ? new Date(relatedEvent.start) : null;
                if (eventDate) {
                    eventDate.setHours(0, 0, 0, 0);
                }
                const isFuture = eventDate ? eventDate >= now : false;
                
                return {
                    ...note,
                    entries,
                    event: relatedEvent,
                    displayDate,
                    isFuture,
                    eventDate: eventDate || new Date(displayDate || 0),
                };
            })
            .sort((a, b) => {
                // Trier du passé au futur (ordre chronologique croissant)
                const dateA = a.eventDate.getTime();
                const dateB = b.eventDate.getTime();
                return dateA - dateB;
            });
    }, [publicNotes, eventsByUid]);

    // Filtrer selon l'option d'affichage et le filtre de label
    const publicNotesList = useMemo(() => {
        let filtered = allPublicNotesWithStatus;
        
        // Filtrer par anciennes/futures
        if (!showOldNotes) {
            filtered = filtered.filter(note => note.isFuture);
        }
        
        // Filtrer par label si un filtre est sélectionné (chercher dans entry_labels de toutes les notes)
        if (selectedLabelFilter) {
            filtered = filtered.filter(note => {
                const entryLabels = note.entry_labels || {};
                // Vérifier si le label existe dans au moins une note
                return Object.values(entryLabels).some(labelsArray => 
                    Array.isArray(labelsArray) && labelsArray.includes(selectedLabelFilter)
                );
            });
        }
        
        return filtered;
    }, [allPublicNotesWithStatus, showOldNotes, selectedLabelFilter]);

    // Récupérer tous les labels uniques pour le filtre (depuis entry_labels de toutes les notes)
    const allAvailableLabels = useMemo(() => {
        const labelsSet = new Set();
        allPublicNotesWithStatus.forEach(note => {
            const entryLabels = note.entry_labels || {};
            Object.values(entryLabels).forEach(labelsArray => {
                if (Array.isArray(labelsArray)) {
                    labelsArray.forEach(label => labelsSet.add(label));
                }
            });
        });
        return Array.from(labelsSet).sort();
    }, [allPublicNotesWithStatus]);

    // Compter les notes futures pour les stats
    const futureNotesCount = useMemo(() => {
        return allPublicNotesWithStatus.filter(note => note.isFuture).length;
    }, [allPublicNotesWithStatus]);

    const setCalendarBaseMonth = (dateStr) => {
        const base = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
        if (Number.isNaN(base.getTime())) return;
        setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    };

    const resetCourseSelection = () => {
        setSelectedCourse(null); // Réinitialiser la sélection du cours
        setNoteEntries([]);
        setOriginalNoteEntries([]);
        setIsEditingNotes(false);
    };

    const updateSelectedDate = (value) => {
        setDateLoading(true);
        setSelectedDate(value);
        setCalendarBaseMonth(value);
        resetCourseSelection();
    };

    const shiftSelectedDate = (offset) => {
        if (!selectedDate) return;
        const date = new Date(selectedDate + "T00:00:00");
        if (Number.isNaN(date.getTime())) return;
        date.setDate(date.getDate() + offset);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        updateSelectedDate(`${year}-${month}-${day}`);
    };

    const handleEntryChange = (index, value) => {
        setNoteEntries((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const ensureEditingMode = () => {
        if (userRole === 'visiteur') {
            setError("Les visiteurs ne peuvent pas créer ou modifier de notes");
            return;
        }
        if (!isEditingNotes) {
            setIsEditingNotes(true);
        }
    };

    const handleAddEntry = () => {
        ensureEditingMode();
        setNoteEntries((prev) => [...prev, ""]);
    };

    const handleRemoveEntry = (index) => {
        setNoteEntries((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleStartEditing = () => {
        if (userRole === 'visiteur') {
            setError("Les visiteurs ne peuvent pas créer ou modifier de notes");
            return;
        }
        setIsEditingNotes(true);
        if (noteEntries.length === 0) {
            setNoteEntries([""]);
        }
    };

    const handleCancelEditing = () => {
        setNoteEntries(originalNoteEntries);
        setEntryLabels(originalEntryLabels);
        setIsEditingNotes(false);
        setShowLabelInputForEntry(null);
        setNewLabelValue("");
    };

    // Labels prédéfinis avec leurs couleurs
    const predefinedLabels = [
        { name: "Contrôle", color: "#ef4444" }, // Rouge
        { name: "Devoir", color: "#f59e0b" }, // Orange
        { name: "Examens", color: "#a855f7" }, // Violet
        { name: "Lien", color: "#3b82f6" }, // Bleu
        { name: "Information", color: "#10b981" }, // Vert
    ];

    // Fonction pour générer une couleur à partir d'un label
    const getLabelColor = (labelName) => {
        // Chercher dans les labels prédéfinis
        const predefined = predefinedLabels.find(l => l.name === labelName);
        if (predefined) {
            return predefined.color;
        }
        
        // Générer une couleur basée sur le hash du nom du label
        let hash = 0;
        for (let i = 0; i < labelName.length; i++) {
            hash = labelName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Générer une couleur HSL avec une saturation et luminosité fixes pour avoir des couleurs vives
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 65%, 50%)`;
    };

    // Gérer les labels par note
    const handleAddLabel = (entryIndex, label) => {
        if (userRole === 'visiteur') {
            setError("Les visiteurs ne peuvent pas créer ou modifier de notes");
            return;
        }
        
        // Activer le mode édition si ce n'est pas déjà le cas
        if (!isEditingNotes) {
            setIsEditingNotes(true);
        }
        
        const labelName = typeof label === 'string' ? label : label.name;
        if (!labelName.trim()) return;
        
        const indexStr = String(entryIndex);
        setEntryLabels(prev => {
            const currentLabels = prev[indexStr] || [];
            if (!currentLabels.includes(labelName.trim())) {
                return {
                    ...prev,
                    [indexStr]: [...currentLabels, labelName.trim()]
                };
            }
            return prev;
        });
    };

    const handleRemoveLabel = (entryIndex, labelToRemove) => {
        if (userRole === 'visiteur') {
            setError("Les visiteurs ne peuvent pas créer ou modifier de notes");
            return;
        }
        
        // Activer le mode édition si ce n'est pas déjà le cas
        if (!isEditingNotes) {
            setIsEditingNotes(true);
        }
        
        const indexStr = String(entryIndex);
        setEntryLabels(prev => {
            const currentLabels = prev[indexStr] || [];
            return {
                ...prev,
                [indexStr]: currentLabels.filter(label => label !== labelToRemove)
            };
        });
    };

    const handleCreateCustomLabel = (entryIndex) => {
        if (newLabelValue.trim()) {
            handleAddLabel(entryIndex, newLabelValue.trim());
            setNewLabelValue("");
            setShowLabelInputForEntry(null);
        }
    };

    const capitalize = (value = "") => {
        if (!value) return "";
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const selectedDateObj = selectedDate ? new Date(selectedDate + "T00:00:00") : null;
    const readableWeekday = selectedDateObj
        ? capitalize(
            selectedDateObj.toLocaleDateString("fr-FR", {
                weekday: "long",
            })
        )
        : "Choisir une date";
    const readableMonth = selectedDateObj
        ? capitalize(
            selectedDateObj.toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
            })
        )
        : "";
    const readableDay = selectedDateObj
        ? String(selectedDateObj.getDate()).padStart(2, "0")
        : "--";

    const handleCalendarToggle = () => {
        setIsCalendarOpen((prev) => !prev);
    };

    const closeCalendar = () => {
        setIsCalendarOpen(false);
    };

    const handleTodaySelect = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const formatted = `${year}-${month}-${day}`;
        updateSelectedDate(formatted);
        closeCalendar();
    };

    const displayedMonth = calendarMonth || (selectedDateObj
        ? new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1)
        : new Date());

    const getMonthMatrix = (baseDate) => {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // Lundi = 0
        const startDate = new Date(year, month, 1 - startOffset);

        const weeks = [];
        let currentDate = new Date(startDate);

        // On continue tant qu'on n'a pas dépassé le mois en cours
        // OU qu'on n'a pas fini la semaine en cours
        while (true) {
            const days = [];
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const y = currentDate.getFullYear();
                const m = String(currentDate.getMonth() + 1).padStart(2, "0");
                const d = String(currentDate.getDate()).padStart(2, "0");

                const dateString = `${y}-${m}-${d}`;
                days.push({
                    label: currentDate.getDate(),
                    dateString: dateString,
                    isCurrentMonth: currentDate.getMonth() === month,
                    isSelected: selectedDate === dateString,
                    isToday: (() => {
                        const today = new Date();
                        return today.toDateString() === currentDate.toDateString();
                    })(),
                    hasNotes: false, // Sera mis à jour après
                });

                // Avancer d'un jour
                currentDate.setDate(currentDate.getDate() + 1);
            }
            weeks.push(days);

            // Si le premier jour de la prochaine semaine est dans le mois suivant, on arrête
            // (currentDate est déjà au début de la semaine suivante ici)
            if (currentDate.getMonth() !== month && weeks.length >= 4) {
                break;
            }
        }
        return weeks;
    };

    const weekDayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

    const hasEventsOnDate = useCallback((dateString) => {
        if (!events.length) return false;
        return events.some((event) => {
            if (!event.start) return false;
            const eventDate = new Date(event.start);
            const year = eventDate.getFullYear();
            const month = String(eventDate.getMonth() + 1).padStart(2, "0");
            const day = String(eventDate.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}` === dateString;
        });
    }, [events]);

    // Vérifier si une date a des notes (personnelles ou publiques)
    const hasNotesOnDate = useCallback((dateString) => {
        // Vérifier les notes personnelles
        if (notes.size > 0) {
            for (const [courseUid, note] of notes.entries()) {
                const course = events.find(e => e.uid === courseUid);
                if (course && course.start) {
                    const eventDate = new Date(course.start);
                    const year = eventDate.getFullYear();
                    const month = String(eventDate.getMonth() + 1).padStart(2, "0");
                    const day = String(eventDate.getDate()).padStart(2, "0");
                    const courseDateString = `${year}-${month}-${day}`;
                    if (courseDateString === dateString) {
                        const entries = extractNoteEntries(note);
                        if (entries && entries.length > 0 && entries.some(e => e && e.trim())) {
                            return true;
                        }
                    }
                }
            }
        }

        // Vérifier les notes publiques
        if (publicNotes.length > 0) {
            for (const note of publicNotes) {
                if (note.course_uid) {
                    const course = events.find(e => e.uid === note.course_uid);
                    if (course && course.start) {
                        const eventDate = new Date(course.start);
                        const year = eventDate.getFullYear();
                        const month = String(eventDate.getMonth() + 1).padStart(2, "0");
                        const day = String(eventDate.getDate()).padStart(2, "0");
                        const courseDateString = `${year}-${month}-${day}`;
                        if (courseDateString === dateString) {
                            const entries = extractNoteEntries(note);
                            if (entries && entries.length > 0 && entries.some(e => e && e.trim())) {
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
    }, [notes, publicNotes, events]);

    const calendarMatrix = useMemo(() => {
        const matrix = getMonthMatrix(displayedMonth);
        // Mettre à jour hasNotes pour chaque jour
        return matrix.map(week => 
            week.map(day => ({
                ...day,
                hasNotes: hasNotesOnDate(day.dateString)
            }))
        );
    }, [displayedMonth, selectedDate, hasNotesOnDate]);

    const weekdayHasCoursesInMonth = useMemo(() => {
        const flags = Array(7).fill(false);
        if (!events.length) return flags;
        events.forEach((event) => {
            if (!event.start) return;
            const eventDate = new Date(event.start);
            if (
                eventDate.getFullYear() === displayedMonth.getFullYear() &&
                eventDate.getMonth() === displayedMonth.getMonth()
            ) {
                const weekdayIndex = (eventDate.getDay() + 6) % 7; // Lundi=0
                flags[weekdayIndex] = true;
            }
        });
        return flags;
    }, [events, displayedMonth]);

    const weekdayIndexesToRender = useMemo(() => {
        if (!showOnlyCourseDays) {
            return weekDayLabels.map((_, index) => index);
        }
        const indexes = weekDayLabels
            .map((_, index) => (weekdayHasCoursesInMonth[index] ? index : null))
            .filter((index) => index !== null);
        return indexes.length > 0 ? indexes : weekDayLabels.map((_, index) => index);
    }, [showOnlyCourseDays, weekdayHasCoursesInMonth, weekDayLabels]);

    useEffect(() => {
        if (!selectedDate) return;
        setDateLoading(false);
    }, [selectedDate, coursesForSelectedDate.length]);

    const changeMonth = (offset) => {
        const newMonth = new Date(displayedMonth);
        newMonth.setMonth(displayedMonth.getMonth() + offset);
        newMonth.setDate(1);
        setCalendarMonth(newMonth);
    };

    const calendarMonthLabel = capitalize(
        displayedMonth.toLocaleDateString("fr-FR", {
            month: "long",
            year: "numeric",
        })
    );

    useEffect(() => {
        if (!isCalendarOpen) return;

        const handleClickOutside = (event) => {
            const popoverEl = calendarPopoverRef.current;
            const triggerEl = dateTriggerRef.current;
            if (!popoverEl) return;
            if (
                popoverEl.contains(event.target) ||
                (triggerEl && triggerEl.contains(event.target))
            ) {
                return;
            }
            closeCalendar();
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                closeCalendar();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isCalendarOpen]);

    const handleCalendarDaySelect = (dateStr) => {
        updateSelectedDate(dateStr);
        closeCalendar();
    };

    const handleNativeDateChange = (event) => {
        const nextValue = event?.target?.value;
        if (!nextValue) {
            return;
        }
        updateSelectedDate(nextValue);
        closeCalendar();
    };

    useEffect(() => {
        const handleKeyboardNavigation = (event) => {
            if (!event.ctrlKey) return;
            if (event.key === "ArrowRight") {
                event.preventDefault();
                shiftSelectedDate(1);
            } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                shiftSelectedDate(-1);
            }
        };

        document.addEventListener("keydown", handleKeyboardNavigation);
        return () => {
            document.removeEventListener("keydown", handleKeyboardNavigation);
        };
    }, [selectedDate]);

    const handleCourseSelect = (courseUid) => {
        setSelectedCourse(courseUid);
    };

    const handleLogout = async () => {
        try {
            const res = await fetch("/api/logout", {
                method: "POST",
            });

            if (res.ok) {
                // Rediriger vers la page d'accueil
                router.push("/");
            } else {
                console.error("[Agenda] Erreur déconnexion");
            }
        } catch (err) {
            console.error("[Agenda] Erreur déconnexion:", err);
            // Rediriger quand même
            router.push("/");
        }
    };

    const saveNote = async () => {
        if (!selectedCourse) return;

        if (userRole === 'visiteur') {
            setError("Les visiteurs ne peuvent pas créer ou modifier de notes");
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const entriesToPersist = sanitizeNoteEntries(noteEntries);

            const res = await fetch("/api/agenda", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    course_uid: selectedCourse,
                    notes: entriesToPersist,
                    entry_labels: entryLabels,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: "Erreur inconnue" }));
                const errorMessage = data.error || `Erreur ${res.status}: ${res.statusText}`;
                throw new Error(errorMessage);
            }

            const data = await res.json();

            // Mettre à jour la Map des notes
            const newNotes = new Map(notes);
            if (data.note) {
                const normalizedNote = {
                    ...data.note,
                    entries: Array.isArray(data.note?.entries)
                        ? data.note.entries
                        : parseStoredNoteValue(data.note?.notes),
                    entry_labels: data.note?.entry_labels || {},
                };
                newNotes.set(selectedCourse, normalizedNote);
                setNoteEntries(normalizedNote.entries);
                setOriginalNoteEntries(normalizedNote.entries);
                setEntryLabels(normalizedNote.entry_labels || {});
                setOriginalEntryLabels(normalizedNote.entry_labels || {});
            } else {
                newNotes.delete(selectedCourse);
                setNoteEntries([]);
                setOriginalNoteEntries([]);
            }
            setNotes(newNotes);
            setIsEditingNotes(false);
            await refreshPublicNotes({ silent: true }).catch(() => { });
        } catch (err) {
            console.error("[Agenda] Erreur sauvegarde:", err);
            // Afficher un message d'erreur explicite
            const errorMessage = err.message || "Une erreur inattendue s'est produite lors de la sauvegarde";
            setError(errorMessage);
            
            // Garder l'erreur visible pendant au moins 5 secondes
            setTimeout(() => {
                setError(null);
            }, 5000);
        } finally {
            setSaving(false);
        }
    };

    const deleteNote = async () => {
        if (!selectedCourse) return;

        if (userRole === 'visiteur') {
            setError("Les visiteurs ne peuvent pas supprimer de notes");
            return;
        }

        if (!confirm("Supprimer cette note ?")) {
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const res = await fetch(`/api/agenda?course_uid=${encodeURIComponent(selectedCourse)}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: "Erreur inconnue" }));
                const errorMessage = data.error || `Erreur ${res.status}: ${res.statusText}`;
                throw new Error(errorMessage);
            }

            // Mettre à jour la Map des notes
            const newNotes = new Map(notes);
            newNotes.delete(selectedCourse);
            setNotes(newNotes);

            setNoteEntries([]);
            setOriginalNoteEntries([]);
            setIsEditingNotes(false);
            await refreshPublicNotes({ silent: true }).catch(() => { });
        } catch (err) {
            console.error("[Agenda] Erreur suppression:", err);
            // Afficher un message d'erreur explicite
            const errorMessage = err.message || "Une erreur inattendue s'est produite lors de la suppression";
            setError(errorMessage);
            
            // Garder l'erreur visible pendant au moins 5 secondes
            setTimeout(() => {
                setError(null);
            }, 5000);
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Détecter si on est sur mobile/petit écran
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(max-width: 899px)');
        const update = () => setIsMobile(mq.matches);
        update(); // Appeler immédiatement pour définir la valeur initiale
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    // Scroller automatiquement vers le notePanel sur mobile quand un cours est sélectionné
    useEffect(() => {
        if (isMobile && selectedCourse && notePanelMobileRef.current) {
            // Petit délai pour laisser le DOM se mettre à jour
            setTimeout(() => {
                notePanelMobileRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start',
                    inline: 'nearest'
                });
            }, 100);
        }
    }, [isMobile, selectedCourse]);

    if (loading) {
        return (
            <div className={styles.pageCentered}>
                <div className={styles.loadingContainer}>
                    <div className={styles.loader}></div>
                    <p>Chargement de votre agenda...</p>
                </div>
            </div>
        );
    }

    const selectedCourseData = selectedCourse
        ? coursesForSelectedDate.find(c => c.uid === selectedCourse)
        : null;

    // Fonction pour rendre le contenu du notePanel
    const renderNotePanel = () => {
        if (!selectedCourse) {
            return (
                <div className={styles.notePlaceholder}>
                    <div style={{ fontSize: '3rem' }}>👈</div>
                    <p>Sélectionnez un cours ci-dessus<br />pour ajouter ou modifier une note.</p>
                </div>
            );
        }

        return (
            <>
                {/* Sur desktop, afficher le header avec le nom et l'heure du cours */}
                {!isMobile && (
                    <div className={styles.noteHeader}>
                        <h2 className={styles.noteTitle}>
                            {selectedCourseData
                                ? (getEventTitle(selectedCourseData).matiere || selectedCourseData.summary)
                                : "Cours sélectionné"}
                        </h2>
                        {selectedCourseData && (
                            <div className={styles.noteTime}>
                                🕒 {formatTime(selectedCourseData.start)} - {formatTime(selectedCourseData.end)}
                            </div>
                        )}
                    </div>
                )}


                {isEditingNotes ? (
                    <>
                        <div className={styles.noteEntriesList}>
                            {noteEntries.map((entry, index) => {
                                const entryLabelsForIndex = entryLabels[String(index)] || [];
                                
                                return (
                                    <div key={index} className={styles.noteEntryCard}>
                                        <div className={styles.noteEntryHeader}>
                                            <span>Note {index + 1}</span>
                                            <button
                                                onClick={() => handleRemoveEntry(index)}
                                                className={styles.noteEntryRemove}
                                                disabled={userRole === 'visiteur'}
                                                title={userRole === 'visiteur' ? "Les visiteurs ne peuvent pas modifier de notes" : ""}
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                        
                                        {/* Labels pour cette note */}
                                        <div className={styles.noteLabelsSection}>
                                            <div className={styles.noteLabelsHeader}>
                                                <span className={styles.noteLabelsTitle}>Labels</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (userRole === 'visiteur') {
                                                            setError("Les visiteurs ne peuvent pas créer ou modifier de notes");
                                                            return;
                                                        }
                                                        if (!isEditingNotes) {
                                                            setIsEditingNotes(true);
                                                        }
                                                        setShowLabelInputForEntry(showLabelInputForEntry === index ? null : index);
                                                    }}
                                                    className={styles.addLabelButton}
                                                    title="Créer un label personnalisé"
                                                    disabled={userRole === 'visiteur'}
                                                >
                                                    + Nouveau
                                                </button>
                                            </div>
                                            
                                            {/* Labels existants pour cette note */}
                                            <div className={styles.noteLabelsList}>
                                                {entryLabelsForIndex.length > 0 ? (
                                                    entryLabelsForIndex.map((label, idx) => {
                                                        const labelColor = getLabelColor(label);
                                                        return (
                                                            <span 
                                                                key={idx} 
                                                                className={styles.noteLabel}
                                                                style={{ 
                                                                    backgroundColor: `${labelColor}15`,
                                                                    borderColor: labelColor,
                                                                    color: labelColor
                                                                }}
                                                            >
                                                                {label}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveLabel(index, label)}
                                                                    className={styles.removeLabelButton}
                                                                    title="Supprimer ce label"
                                                                    style={{ color: labelColor }}
                                                                    disabled={userRole === 'visiteur'}
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        );
                                                    })
                                                ) : (
                                                    <span className={styles.noLabelsText}>
                                                        {isEditingNotes ? "Aucun label pour cette note." : "Aucun label"}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Boutons des labels prédéfinis */}
                                            <div className={styles.predefinedLabels}>
                                                {predefinedLabels.map((labelObj) => (
                                                    <button
                                                        key={labelObj.name}
                                                        type="button"
                                                        onClick={() => handleAddLabel(index, labelObj.name)}
                                                        disabled={entryLabelsForIndex.includes(labelObj.name) || userRole === 'visiteur'}
                                                        className={`${styles.predefinedLabelButton} ${entryLabelsForIndex.includes(labelObj.name) ? styles.predefinedLabelButtonDisabled : ""}`}
                                                        style={!entryLabelsForIndex.includes(labelObj.name) ? {
                                                            borderColor: labelObj.color,
                                                            color: labelObj.color
                                                        } : {
                                                            backgroundColor: `${labelObj.color}15`,
                                                            borderColor: labelObj.color,
                                                            color: labelObj.color
                                                        }}
                                                    >
                                                        {labelObj.name}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Input pour créer un label personnalisé */}
                                            {showLabelInputForEntry === index && (
                                                <div className={styles.customLabelInput}>
                                                    <input
                                                        type="text"
                                                        value={newLabelValue}
                                                        onChange={(e) => setNewLabelValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleCreateCustomLabel(index);
                                                            } else if (e.key === 'Escape') {
                                                                setShowLabelInputForEntry(null);
                                                                setNewLabelValue("");
                                                            }
                                                        }}
                                                        placeholder="Nom du label..."
                                                        className={styles.customLabelInputField}
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCreateCustomLabel(index)}
                                                        disabled={!newLabelValue.trim() || entryLabelsForIndex.includes(newLabelValue.trim())}
                                                        className={styles.customLabelAddButton}
                                                    >
                                                        Ajouter
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowLabelInputForEntry(null);
                                                            setNewLabelValue("");
                                                        }}
                                                        className={styles.customLabelCancelButton}
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <textarea
                                            className={styles.noteEntryTextarea}
                                            value={entry}
                                            onChange={(e) => handleEntryChange(index, e.target.value)}
                                            disabled={userRole === 'visiteur'}
                                            placeholder={userRole === 'visiteur' ? "Les visiteurs ne peuvent pas modifier de notes" : "Écrivez votre note ici..."}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.noteActions}>
                            <button 
                                onClick={handleAddEntry} 
                                className={styles.addNoteButton}
                                disabled={userRole === 'visiteur'}
                                title={userRole === 'visiteur' ? "Les visiteurs ne peuvent pas créer de notes" : ""}
                            >
                                + Ajouter une note
                            </button>
                            <button
                                onClick={saveNote}
                                disabled={saving}
                                className={styles.saveButton}
                            >
                                {saving ? "Sauvegarde..." : "Enregistrer"}
                            </button>
                            <button
                                onClick={handleCancelEditing}
                                disabled={saving}
                                className={styles.cancelButton}
                            >
                                Annuler
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {noteEntries.length === 0 ? (
                            <div className={styles.notePlaceholder}>
                                <p>Aucune note pour ce cours.</p>
                                <button 
                                    onClick={handleStartEditing} 
                                    className={styles.addNoteButton}
                                    disabled={userRole === 'visiteur'}
                                    title={userRole === 'visiteur' ? "Les visiteurs ne peuvent pas créer de notes" : ""}
                                >
                                    + Ajouter une note
                                </button>
                            </div>
                        ) : (
                            <div className={styles.noteEntriesList}>
                                {noteEntries.map((entry, idx) => {
                                    const entryLabelsForIndex = entryLabels[String(idx)] || [];
                                    return (
                                        <div key={idx} className={styles.noteDisplayCard}>
                                            {/* Labels pour cette note */}
                                            {entryLabelsForIndex.length > 0 && (
                                                <div className={styles.noteLabelsList} style={{ marginBottom: '0.5rem' }}>
                                                    {entryLabelsForIndex.map((label, labelIdx) => {
                                                        const labelColor = getLabelColor(label);
                                                        return (
                                                            <span 
                                                                key={labelIdx} 
                                                                className={styles.noteLabel}
                                                                style={{ 
                                                                    backgroundColor: `${labelColor}15`,
                                                                    borderColor: labelColor,
                                                                    color: labelColor
                                                                }}
                                                            >
                                                                {label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {entry}
                                        </div>
                                    );
                                })}

                                {notes.get(selectedCourse)?.user_name && (
                                    <div className={styles.noteLastPerson}>
                                        Dernière modif par : {notes.get(selectedCourse).user_name}
                                        {notes.get(selectedCourse).updated_at && (
                                            <> le {formatDateTime(notes.get(selectedCourse).updated_at)}</>
                                        )}
                                    </div>
                                )}

                                <div className={styles.noteViewActions}>
                                    {userRole === 'visiteur' ? (
                                        <div className={styles.visitorWarning}>
                                            <span className={styles.visitorWarningIcon}>ℹ️</span>
                                            <span className={styles.visitorWarningText}>
                                                En tant que visiteur, vous ne pouvez pas modifier ou supprimer de notes
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={handleStartEditing} 
                                                className={styles.noteEditButton}
                                            >
                                                ✏️ Modifier
                                            </button>
                                            <button 
                                                onClick={deleteNote} 
                                                className={styles.deleteButton}
                                            >
                                                🗑️ Supprimer
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </>
        );
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <BackButton href="/dashboard" title="Retour au dashboard" />
                        <div className={styles.userBar}>
                            {userInfo && (
                                <button
                                    onClick={handleLogout}
                                    className={styles.logoutButton}
                                >
                                    Se déconnecter
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <h1>Agenda</h1>
                    </div>
                </div>

                {error && (
                    <div className={styles.errorBox}>
                        <div className={styles.errorContent}>
                            <span className={styles.errorIcon}>⚠️</span>
                            <div className={styles.errorText}>
                                <strong>Erreur :</strong> {error}
                            </div>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className={styles.closeError}
                            title="Fermer"
                        >
                            ×
                        </button>
                    </div>
                )}

                <div className={styles.tabsLayout}>
                    <div className={styles.tabNavigation}>
                        <button
                            type="button"
                            className={`${styles.tabButton} ${activeTab === "public" ? styles.tabButtonActive : ""}`}
                            onClick={() => setActiveTab("public")}
                            aria-pressed={activeTab === "public"}
                        >
                            <strong>Notes</strong>
                            <span>Consulter les notes</span>
                        </button>
                        <button
                            type="button"
                            className={`${styles.tabButton} ${activeTab === "private" ? styles.tabButtonActive : ""}`}
                            onClick={() => setActiveTab("private")}
                            aria-pressed={activeTab === "private"}
                        >
                            <strong>Ajout / modification</strong>
                            <span>{authenticated ? "Gérer mes notes" : "Connexion requise"}</span>
                        </button>
                    </div>

                    <div className={styles.tabContent}>
                        {activeTab === "public" ? (
                            <div className={styles.publicContainer}>
                                <div className={styles.publicIntroCard}>
                                    <div>
                                        <h2>Notes</h2>
                                        <p>Retrouvez ici toutes les notes partagées</p>
                                    </div>
                                    <div className={styles.publicStats}>
                                        <div>
                                            <span className={styles.publicStatsValue}>{showOldNotes ? publicNotesList.length : futureNotesCount}</span>
                                            <span className={styles.publicStatsLabel}>Cours notés{!showOldNotes ? " (futurs)" : ""}</span>
                                        </div>
                                        <div>
                                            <span className={styles.publicStatsValue}>{events.length}</span>
                                            <span className={styles.publicStatsLabel}>Cours</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Filtres : anciennes notes et labels */}
                                {publicNotes.length > 0 && (
                                    <div className={styles.publicNotesFilters}>
                                        <button
                                            type="button"
                                            onClick={() => setShowOldNotes(!showOldNotes)}
                                            className={styles.showOldNotesButton}
                                        >
                                            {showOldNotes ? "📅 Masquer les anciennes notes" : "📅 Voir les anciennes notes"}
                                        </button>
                                        
                                        {/* Filtre par label */}
                                        {allAvailableLabels.length > 0 && (
                                            <div className={styles.labelFilterSection}>
                                                <span className={styles.labelFilterTitle}>Filtrer par label :</span>
                                                <div className={styles.labelFilterButtons}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedLabelFilter(null)}
                                                        className={`${styles.labelFilterButton} ${!selectedLabelFilter ? styles.labelFilterButtonActive : ""}`}
                                                    >
                                                        Tous
                                                    </button>
                                                    {allAvailableLabels.map((label) => {
                                                        const labelColor = getLabelColor(label);
                                                        return (
                                                            <button
                                                                key={label}
                                                                type="button"
                                                                onClick={() => setSelectedLabelFilter(selectedLabelFilter === label ? null : label)}
                                                                className={`${styles.labelFilterButton} ${selectedLabelFilter === label ? styles.labelFilterButtonActive : ""}`}
                                                                style={selectedLabelFilter === label ? {
                                                                    backgroundColor: labelColor,
                                                                    borderColor: labelColor,
                                                                    color: '#fff'
                                                                } : {
                                                                    borderColor: labelColor,
                                                                    color: labelColor
                                                                }}
                                                            >
                                                                {label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {publicNotesList.length === 0 ? (
                                    <div className={styles.publicEmptyState}>
                                        <p>
                                            {selectedLabelFilter 
                                                ? `Aucune note avec le label "${selectedLabelFilter}" disponible.`
                                                : showOldNotes 
                                                    ? "Aucune note disponible pour le moment." 
                                                    : "Aucune note future disponible pour le moment."}
                                        </p>
                                        {!selectedLabelFilter && (
                                            <span>Connectez-vous pour publier la première note (elle sera visible de tous).</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className={styles.publicNotesGrid}>
                                        {publicNotesList.map((note, index) => {
                                            const relatedEvent = note.event;
                                            const { matiere, prof } = relatedEvent
                                                ? getEventTitle(relatedEvent)
                                                : { matiere: null, prof: null };
                                            
                                            // Détecter la transition entre notes passées et futures
                                            // Le séparateur apparaît seulement si :
                                            // 1. On affiche toutes les notes (showOldNotes = true)
                                            // 2. Il y a à la fois des notes passées ET futures
                                            // 3. La note actuelle est passée et la suivante est future
                                            const hasPastNotes = publicNotesList.some(n => !n.isFuture);
                                            const hasFutureNotes = publicNotesList.some(n => n.isFuture);
                                            const isFirstFuture = showOldNotes && 
                                                hasPastNotes && 
                                                hasFutureNotes &&
                                                !note.isFuture && 
                                                index < publicNotesList.length - 1 && 
                                                publicNotesList[index + 1]?.isFuture;
                                            
                                            return (
                                                <React.Fragment key={note.id || note.course_uid}>
                                                    {isFirstFuture && (
                                                        <div className={styles.publicNotesSeparator}>
                                                            <span className={styles.publicNotesSeparatorLine}></span>
                                                            <span className={styles.publicNotesSeparatorText}>Cours à venir</span>
                                                            <span className={styles.publicNotesSeparatorLine}></span>
                                                        </div>
                                                    )}
                                                    <article 
                                                        className={`${styles.publicNoteCard} ${!note.isFuture ? styles.publicNoteCardPast : ""}`}
                                                    >
                                                        <div className={styles.publicNoteHeader}>
                                                            <div>
                                                                <h3>{matiere || relatedEvent?.summary || "Cours à identifier"}</h3>
                                                                <span className={styles.publicNoteDate}>
                                                                    {formatDate(relatedEvent?.start || note.displayDate)}
                                                                </span>
                                                            </div>
                                                            {relatedEvent?.location && (
                                                                <span className={styles.publicNoteLocation}>
                                                                    📍 {relatedEvent.location}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={styles.publicNoteMeta}>
                                                            {relatedEvent?.start && relatedEvent?.end && (
                                                                <span>
                                                                    {formatTime(relatedEvent.start)} - {formatTime(relatedEvent.end)}
                                                                </span>
                                                            )}
                                                            {prof && <span>{prof}</span>}
                                                            {note.user_name && (
                                                                <span>✍️ {note.user_name}</span>
                                                            )}
                                                        </div>
                                                    <div className={styles.publicNoteEntries}>
                                                        {note.entries.map((entry, idx) => {
                                                            const entryLabelsForIndex = (note.entry_labels && note.entry_labels[String(idx)]) || [];
                                                            return (
                                                                <div key={idx}>
                                                                    {/* Labels pour cette note */}
                                                                    {entryLabelsForIndex.length > 0 && (
                                                                        <div className={styles.publicNoteLabels} style={{ marginBottom: '0.5rem' }}>
                                                                            {entryLabelsForIndex.map((label, labelIdx) => {
                                                                                const labelColor = getLabelColor(label);
                                                                                return (
                                                                                    <span 
                                                                                        key={labelIdx} 
                                                                                        className={styles.publicNoteLabel}
                                                                                        style={{ 
                                                                                            backgroundColor: `${labelColor}15`,
                                                                                            borderColor: labelColor,
                                                                                            color: labelColor
                                                                                        }}
                                                                                    >
                                                                                        {label}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                    <p className={styles.publicNoteEntry}>
                                                                        {entry}
                                                                    </p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </article>
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ONGLET PRIVÉ (Ajout/Modif) */
                            <>
                                {!authenticated ? (
                                    <div className={styles.privateLocked}>
                                        <span className={styles.badgeGuest}>Mode Invité</span>
                                        <h2>Connectez-vous pour ajouter des notes</h2>
                                        <LoginForm onSuccess={loadData} embedded={true} />
                                    </div>
                                ) : (
                                    <div className={styles.privateContainer}>
                                        {/* Colonne Gauche : Calendrier + Liste des cours */}
                                        <div className={styles.agendaSidebar}>
                                            {/* Sélecteur de date */}
                                            <div className={styles.dateSelector} ref={dateTriggerRef}>
                                                <button
                                                    className={styles.datePickerButton}
                                                    onClick={() => shiftSelectedDate(-1)}
                                                    aria-label="Jour précédent"
                                                >
                                                    ←
                                                </button>

                                                <div
                                                    className={styles.dateVisual}
                                                    onClick={handleCalendarToggle}
                                                >
                                                    <span className={styles.dateWeekday}>{readableWeekday}</span>
                                                    <span className={styles.dateDay}>{readableDay}</span>
                                                    <span className={styles.dateMonth}>{readableMonth}</span>
                                                </div>

                                                <button
                                                    className={styles.datePickerButton}
                                                    onClick={() => shiftSelectedDate(1)}
                                                    aria-label="Jour suivant"
                                                >
                                                    →
                                                </button>

                                                {/* Popover Calendrier */}
                                                {isCalendarOpen && (
                                                    <div className={styles.calendarPopover} ref={calendarPopoverRef}>
                                                        <div className={styles.calendarPopoverHeader}>
                                                            <span className={styles.calendarMonthLabel}>{calendarMonthLabel}</span>
                                                            <div className={styles.calendarHeaderButtons}>
                                                                <button onClick={() => changeMonth(-1)}>←</button>
                                                                <button onClick={() => changeMonth(1)}>→</button>
                                                            </div>
                                                        </div>

                                                        <div
                                                            className={styles.calendarGrid}
                                                            style={{
                                                                gridTemplateColumns: `repeat(${weekdayIndexesToRender.length}, 1fr)`
                                                            }}
                                                        >
                                                            {weekdayIndexesToRender.map((dayIndex) => (
                                                                <div key={`header-${dayIndex}`} className={styles.calendarWeekday}>
                                                                    {weekDayLabels[dayIndex]}
                                                                </div>
                                                            ))}
                                                            {calendarMatrix.map((week, wIndex) => 
                                                                weekdayIndexesToRender.map((dayIndex) => {
                                                                    const dayObj = week[dayIndex];
                                                                    if (!dayObj) return null;
                                                                    return (
                                                                        <button
                                                                            key={`${wIndex}-${dayIndex}`}
                                                                            className={`${styles.calendarDay} 
                                                                                ${dayObj.isToday ? styles.calendarDayToday : ""} 
                                                                                ${dayObj.isSelected ? styles.calendarDaySelected : ""} 
                                                                                ${!dayObj.isCurrentMonth ? styles.calendarDayMuted : ""}
                                                                                ${dayObj.hasNotes ? styles.calendarDayHasNotes : ""}`}
                                                                            onClick={() => handleCalendarDaySelect(dayObj.dateString)}
                                                                        >
                                                                            <span className={styles.calendarDayNumber}>{dayObj.label}</span>
                                                                            {dayObj.hasNotes && (
                                                                                <span className={styles.calendarDayNoteIndicator} title="Ce jour a des notes"></span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>



                                                        <div className={styles.calendarFooter}>
                                                            <div className={styles.calendarFilter}>
                                                                <button
                                                                    className={`${styles.calendarFilterButton} ${showOnlyCourseDays ? styles.calendarFilterButtonActive : ""}`}
                                                                    onClick={() => setShowOnlyCourseDays(true)}
                                                                >
                                                                    Jours de cours
                                                                </button>
                                                                <button
                                                                    className={`${styles.calendarFilterButton} ${!showOnlyCourseDays ? styles.calendarFilterButtonActive : ""}`}
                                                                    onClick={() => setShowOnlyCourseDays(false)}
                                                                >
                                                                    Tous les jours
                                                                </button>
                                                            </div>
                                                            <button
                                                                className={styles.courseButton}
                                                                style={{ justifyContent: 'center', padding: '0.75rem' }}
                                                                onClick={handleTodaySelect}
                                                            >
                                                                Aujourd'hui
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Liste des cours */}
                                            <div className={styles.coursesList}>
                                                <div className={styles.sectionTitle}>Cours du jour</div>
                                                {dateLoading ? (
                                                    <div className={styles.noCourseAlert}>Chargement...</div>
                                                ) : coursesForSelectedDate.length === 0 ? (
                                                    <div className={styles.noCourseAlert}>
                                                        Aucun cours ce jour-là
                                                    </div>
                                                ) : (
                                                    coursesForSelectedDate.map((course) => {
                                                        const { matiere } = getEventTitle(course);
                                                        const isSelected = selectedCourse === course.uid;
                                                        // Vérifier si ce cours a des notes
                                                        const courseNote = notes.get(course.uid);
                                                        const publicNote = publicNotes.find(n => n.course_uid === course.uid);
                                                        const hasNote = (courseNote && extractNoteEntries(courseNote).some(e => e && e.trim())) ||
                                                                        (publicNote && extractNoteEntries(publicNote).some(e => e && e.trim()));
                                                        return (
                                                            <div key={course.uid} className={`${styles.courseButtonWrapper} ${isMobile && isSelected ? styles.courseButtonWrapperExpanded : ""}`}>
                                                                <button
                                                                    className={`${styles.courseButton} ${isSelected ? styles.courseButtonSelected : ""} ${hasNote ? styles.courseButtonHasNote : ""} ${isMobile && isSelected ? styles.courseButtonExpanded : ""}`}
                                                                    onClick={() => handleCourseSelect(course.uid)}
                                                                >
                                                                    <div className={styles.courseButtonContent}>
                                                                        <div className={styles.courseButtonInfo}>
                                                                            <div className={styles.courseButtonHeader}>
                                                                                <span className={styles.courseButtonTime}>
                                                                                    {formatTime(course.start)} - {formatTime(course.end)}
                                                                                </span>
                                                                                {hasNote && (
                                                                                    <span className={styles.courseButtonNoteBadge} title="Ce cours a des notes">
                                                                                        📋
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span className={styles.courseButtonTitle}>
                                                                                {matiere || course.summary}
                                                                            </span>
                                                                            {course.location && (
                                                                                <span className={styles.courseButtonLocation}>
                                                                                    📍 {course.location}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {isSelected && <span>👉</span>}
                                                                    </div>
                                                                </button>
                                                                {/* Sur mobile, afficher le notePanel intégré dans le cours sélectionné */}
                                                                {isMobile && isSelected && (
                                                                    <div ref={notePanelMobileRef} className={styles.notePanelMobile}>
                                                                        {renderNotePanel()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        {/* Colonne Droite : Éditeur (masqué sur mobile quand un cours est sélectionné) */}
                                        {(!isMobile || !selectedCourse) && (
                                            <div className={styles.notePanel}>
                                                {renderNotePanel()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function AgendaPage() {
    return (
        <Suspense fallback={
            <div className={styles.pageCentered}>
                <div className={styles.card}>
                    <p>Chargement...</p>
                </div>
            </div>
        }>
            <AgendaContent />
        </Suspense>
    );
}
