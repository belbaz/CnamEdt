"use client";
import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
    const [events, setEvents] = useState([]);
    const [notes, setNotes] = useState(new Map()); // Map<course_uid, note>
    const [publicNotes, setPublicNotes] = useState([]); // Notes visibles par tous
    const [activeTab, setActiveTab] = useState("public");
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedCourse, setSelectedCourse] = useState(null); // course_uid sélectionné
    const [noteEntries, setNoteEntries] = useState([]);
    const [originalNoteEntries, setOriginalNoteEntries] = useState([]); // Pour détecter les modifications
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [dateLoading, setDateLoading] = useState(false);
    const dateTriggerRef = useRef(null);
    const calendarPopoverRef = useRef(null);
    const [calendarMonth, setCalendarMonth] = useState(null); // Date sur le 1er jour du mois affiché
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [showOnlyCourseDays, setShowOnlyCourseDays] = useState(true);

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
        } else {
            setNoteEntries([]);
            setOriginalNoteEntries([]);
            setIsEditingNotes(false);
        }
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

    const publicNotesList = useMemo(() => {
        if (!publicNotes.length) return [];

        return publicNotes
            .map((note) => {
                const relatedEvent = note?.course_uid ? eventsByUid.get(note.course_uid) : null;
                const entries = sanitizeNoteEntries(note?.entries);
                const displayDate = relatedEvent?.start || note?.updated_at || note?.created_at || null;
                return {
                    ...note,
                    entries,
                    event: relatedEvent,
                    displayDate,
                };
            })
            .sort((a, b) => {
                const dateA = new Date(a.displayDate || 0).getTime();
                const dateB = new Date(b.displayDate || 0).getTime();
                return dateB - dateA;
            });
    }, [publicNotes, eventsByUid]);

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
        setIsEditingNotes(true);
        if (noteEntries.length === 0) {
            setNoteEntries([""]);
        }
    };

    const handleCancelEditing = () => {
        setNoteEntries(originalNoteEntries);
        setIsEditingNotes(false);
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

                days.push({
                    label: currentDate.getDate(),
                    dateString: `${y}-${m}-${d}`,
                    isCurrentMonth: currentDate.getMonth() === month,
                    isSelected: selectedDate === `${y}-${m}-${d}`,
                    isToday: (() => {
                        const today = new Date();
                        return today.toDateString() === currentDate.toDateString();
                    })(),
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

    const calendarMatrix = useMemo(() => getMonthMatrix(displayedMonth), [displayedMonth, selectedDate]);

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
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la sauvegarde");
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
                };
                newNotes.set(selectedCourse, normalizedNote);
                setNoteEntries(normalizedNote.entries);
                setOriginalNoteEntries(normalizedNote.entries);
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
            setError(err.message || "Erreur lors de la sauvegarde");
        } finally {
            setSaving(false);
        }
    };

    const deleteNote = async () => {
        if (!selectedCourse) return;

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
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la suppression");
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
            setError(err.message || "Erreur lors de la suppression");
        } finally {
            setSaving(false);
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

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <button
                            type="button"
                            className={styles.backIconButton}
                            onClick={() => router.push("/")}
                            aria-label="Retour à l'emploi du temps"
                        >
                            ←
                        </button>
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
                        <div>
                            <strong>Erreur :</strong> {error}
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className={styles.closeError}
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
                                            <span className={styles.publicStatsValue}>{publicNotesList.length}</span>
                                            <span className={styles.publicStatsLabel}>Cours notés</span>
                                        </div>
                                        <div>
                                            <span className={styles.publicStatsValue}>{events.length}</span>
                                            <span className={styles.publicStatsLabel}>Cours</span>
                                        </div>
                                    </div>
                                </div>
                                {publicNotesList.length === 0 ? (
                                    <div className={styles.publicEmptyState}>
                                        <p>Aucune note disponible pour le moment.</p>
                                        <span>Connectez-vous pour publier la première note (elle sera visible de tous).</span>
                                    </div>
                                ) : (
                                    <div className={styles.publicNotesGrid}>
                                        {publicNotesList.map((note) => {
                                            const relatedEvent = note.event;
                                            const { matiere, prof } = relatedEvent
                                                ? getEventTitle(relatedEvent)
                                                : { matiere: null, prof: null };
                                            return (
                                                <article key={note.id || note.course_uid} className={styles.publicNoteCard}>
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
                                                        {note.entries.map((entry, idx) => (
                                                            <p key={idx} className={styles.publicNoteEntry}>
                                                                {entry}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </article>
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
                                                                <div key={weekDayLabels[dayIndex]} className={styles.calendarWeekday}>
                                                                    {weekDayLabels[dayIndex]}
                                                                </div>
                                                            ))}
                                                            {calendarMatrix.map((week, wIndex) => (
                                                                week.map((dayObj, dIndex) => {
                                                                    if (!weekdayIndexesToRender.includes(dIndex)) return null;
                                                                    return (
                                                                        <button
                                                                            key={`${wIndex}-${dIndex}`}
                                                                            className={`${styles.calendarDay} 
                                                                                ${dayObj.isToday ? styles.calendarDayToday : ""} 
                                                                                ${dayObj.isSelected ? styles.calendarDaySelected : ""} 
                                                                                ${!dayObj.isCurrentMonth ? styles.calendarDayMuted : ""}`}
                                                                            onClick={() => handleCalendarDaySelect(dayObj.dateString)}
                                                                        >
                                                                            {dayObj.label}
                                                                        </button>
                                                                    );
                                                                })
                                                            ))}
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
                                                        return (
                                                            <button
                                                                key={course.uid}
                                                                className={`${styles.courseButton} ${isSelected ? styles.courseButtonSelected : ""}`}
                                                                onClick={() => handleCourseSelect(course.uid)}
                                                            >
                                                                <div className={styles.courseButtonContent}>
                                                                    <div className={styles.courseButtonInfo}>
                                                                        <span className={styles.courseButtonTime}>
                                                                            {formatTime(course.start)} - {formatTime(course.end)}
                                                                        </span>
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
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        {/* Colonne Droite : Éditeur */}
                                        <div className={styles.notePanel}>
                                            {!selectedCourse ? (
                                                <div className={styles.notePlaceholder}>
                                                    <div style={{ fontSize: '3rem' }}>👈</div>
                                                    <p>Sélectionnez un cours à gauche<br />pour ajouter ou modifier une note.</p>
                                                </div>
                                            ) : (
                                                <>
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

                                                    {isEditingNotes ? (
                                                        <>
                                                            <div className={styles.noteEntriesList}>
                                                                {noteEntries.map((entry, index) => (
                                                                    <div key={index} className={styles.noteEntryCard}>
                                                                        <div className={styles.noteEntryHeader}>
                                                                            <span>Paragraphe {index + 1}</span>
                                                                            <button
                                                                                onClick={() => handleRemoveEntry(index)}
                                                                                className={styles.noteEntryRemove}
                                                                            >
                                                                                Supprimer
                                                                            </button>
                                                                        </div>
                                                                        <textarea
                                                                            className={styles.noteEntryTextarea}
                                                                            value={entry}
                                                                            onChange={(e) => handleEntryChange(index, e.target.value)}
                                                                            placeholder="Écrivez votre note ici..."
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div className={styles.noteActions}>
                                                                <button onClick={handleAddEntry} className={styles.addNoteButton}>
                                                                    + Ajouter un paragraphe
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
                                                                    <button onClick={handleStartEditing} className={styles.addNoteButton}>
                                                                        + Ajouter une note
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className={styles.noteEntriesList}>
                                                                    {noteEntries.map((entry, idx) => (
                                                                        <div key={idx} className={styles.noteDisplayCard}>
                                                                            {entry}
                                                                        </div>
                                                                    ))}

                                                                    {notes.get(selectedCourse)?.user_name && (
                                                                        <div className={styles.noteLastPerson}>
                                                                            Dernière modif par : {notes.get(selectedCourse).user_name}
                                                                        </div>
                                                                    )}

                                                                    <div className={styles.noteViewActions}>
                                                                        <button onClick={handleStartEditing} className={styles.noteEditButton}>
                                                                            ✏️ Modifier
                                                                        </button>
                                                                        <button onClick={deleteNote} className={styles.deleteButton}>
                                                                            🗑️ Supprimer
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
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
            <div className={styles.page}>
                <div className={styles.card}>
                    <p>Chargement...</p>
                </div>
            </div>
        }>
            <AgendaContent />
        </Suspense>
    );
}
