"use client";
import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { getEventTitle } from "@/utils/eventUtils";
import { areNoteEntriesEqual, parseStoredNoteValue, sanitizeNoteEntries } from "@/utils/noteEntries";

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
    }, []);

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

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Récupérer les infos utilisateur
            const userRes = await fetch("/api/user", {
                cache: "no-store",
            });

            if (userRes.status === 401) {
                setAuthenticated(false);
                setUserInfo(null);
                setLoading(false);
                return;
            }

            if (!userRes.ok) {
                const errorData = await userRes.json().catch(() => ({}));
                console.error("[Agenda] Erreur récupération user:", errorData);
                throw new Error(errorData.error || "Erreur lors de la récupération des informations utilisateur");
            }

            const userData = await userRes.json();
            console.log("[Agenda] User data:", userData); // Debug
            setUserInfo(userData);
            setAuthenticated(true);

            // 2. Récupérer les notes
            const notesRes = await fetch("/api/agenda", {
                cache: "no-store",
            });

            if (!notesRes.ok) {
                throw new Error("Erreur lors de la récupération des notes");
            }

            const notesData = await notesRes.json();
            
            // Vérifier l'authentification depuis la réponse
            if (!notesData.authenticated) {
                setAuthenticated(false);
                setUserInfo(null);
                setLoading(false);
                return;
            }
            
            // Convertir les notes en Map pour accès rapide
            const notesMap = new Map();
            if (notesData.notes && Array.isArray(notesData.notes)) {
                notesData.notes.forEach((note) => {
                    notesMap.set(note.course_uid, note);
                });
            }
            setNotes(notesMap);

            // 2. Charger les cours
            const eventsRes = await fetch("/api/fetch-ics", {
                cache: "no-store",
            });

            if (!eventsRes.ok) {
                throw new Error("Erreur lors de la récupération des cours");
            }

            const eventsData = await eventsRes.json();
            const eventsList = Array.isArray(eventsData.events)
                ? eventsData.events
                : [];

            // Trier par date
            eventsList.sort((a, b) => {
                const dateA = new Date(a.start || 0);
                const dateB = new Date(b.start || 0);
                return dateA - dateB;
            });

            setEvents(eventsList);
        } catch (err) {
            console.error("[Agenda] Erreur chargement:", err);
            setError(err.message || "Erreur lors du chargement");
        } finally {
            setLoading(false);
        }
    };

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
        for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
            const days = [];
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + weekIndex * 7 + dayIndex);
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
            }
            weeks.push(days);
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
                <div className={styles.card}>
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className={styles.pageCentered}>
                <div className={styles.card}>
                    <div className={styles.status}>
                        <span className={`${styles.badge} ${styles.badgeGuest}`}>
                            Non connecté
                        </span>
                        <h1>Accès réservé</h1>
                        <p>
                            Vous devez être connecté pour créer ou modifier l'agenda.
                        </p>
                    </div>
                    <div className={styles.actions}>
                        <Link href="/login" className={styles.primaryButton}>
                            Se connecter
                        </Link>
                        <Link href="/signup" className={styles.ghostLink}>
                            Créer un compte
                        </Link>
                        <button 
                            onClick={() => router.push('/')} 
                            className={styles.backButton}
                        >
                            Retour
                        </button>
                    </div>
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
                            {userInfo && userInfo.name && (
                                <span className={styles.userGreetingCompact}>
                                    Bonjour {userInfo.name} {userInfo.lastName || ""}
                                </span>
                            )}
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
                    <h1>Agenda</h1>
                    <p className={styles.subtitle}>
                        Sélectionnez une date, puis un cours pour ajouter ou modifier vos notes.
                    </p>
                </div>

                {error && (
                    <div className={styles.errorBox}>
                        <strong>Erreur :</strong> {error}
                        <button
                            onClick={() => setError(null)}
                            className={styles.closeError}
                        >
                            ×
                        </button>
                    </div>
                )}

                <div className={styles.dateSelector}>
                    <div className={styles.datePickerCard}>
                        <button
                            type="button"
                            className={styles.datePickerButton}
                            onClick={() => shiftSelectedDate(-1)}
                            aria-label="Jour précédent"
                        >
                            ←
                        </button>
                        <div className={styles.dateVisualWrapper}>
                            <button
                                type="button"
                                className={styles.dateVisual}
                                onClick={handleCalendarToggle}
                                aria-haspopup="dialog"
                                aria-expanded={isCalendarOpen}
                                ref={dateTriggerRef}
                            >
                                <span className={styles.dateWeekday}>{readableWeekday}</span>
                                <span className={styles.dateDay}>{readableDay}</span>
                                <span className={styles.dateMonth}>{readableMonth}</span>
                            </button>
                            {isCalendarOpen && (
                                <div
                                    className={styles.calendarPopover}
                                    role="dialog"
                                    aria-label="Choisir une date"
                                    ref={calendarPopoverRef}
                                >
                                    <div className={styles.calendarPopoverHeader}>
                                        <div className={styles.calendarPopoverTitle}>
                                            <span className={styles.calendarMonthLabel}>{calendarMonthLabel}</span>
                                        </div>
                                        <div className={styles.calendarHeaderButtons}>
                                            <button
                                                type="button"
                                                className={styles.calendarNavButton}
                                                onClick={() => changeMonth(-1)}
                                                aria-label="Mois précédent"
                                            >
                                                ←
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.calendarNavButton}
                                                onClick={() => changeMonth(1)}
                                                aria-label="Mois suivant"
                                            >
                                                →
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.calendarCloseButton}
                                                onClick={closeCalendar}
                                                aria-label="Fermer le calendrier"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                    <div className={styles.calendarWrapper}>
                                        <div
                                            className={styles.calendarGrid}
                                            style={{ gridTemplateColumns: `repeat(${weekdayIndexesToRender.length}, 1fr)` }}
                                        >
                                            {weekdayIndexesToRender.map((weekdayIndex) => (
                                                <span key={weekDayLabels[weekdayIndex]} className={styles.calendarWeekday}>
                                                    {weekDayLabels[weekdayIndex]}
                                                </span>
                                            ))}
                                            {calendarMatrix.map((week, weekIndex) =>
                                                weekdayIndexesToRender.map((weekdayIndex) => {
                                                    const day = week[weekdayIndex];
                                                    if (!day) return null;
                                                    if (!day.isCurrentMonth) {
                                                        return null;
                                                    }
                                                    const dayHasCourse = hasEventsOnDate(day.dateString);
                                                    if (showOnlyCourseDays && !dayHasCourse) {
                                                        return (
                                                            <span
                                                                key={`${weekIndex}-${day.dateString}`}
                                                                className={styles.calendarDayHidden}
                                                                aria-hidden="true"
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <button
                                                            key={`${weekIndex}-${day.dateString}`}
                                                            type="button"
                                                            className={[
                                                                styles.calendarDay,
                                                                !day.isCurrentMonth ? styles.calendarDayMuted : "",
                                                                day.isToday ? styles.calendarDayToday : "",
                                                                day.isSelected ? styles.calendarDaySelected : "",
                                                            ].join(" ")}
                                                            onClick={() => handleCalendarDaySelect(day.dateString)}
                                                        >
                                                            {day.label}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                            <div className={styles.calendarFooter}>
                                <div className={styles.calendarFilter}>
                                    <button
                                        type="button"
                                        className={`${styles.calendarFilterButton} ${!showOnlyCourseDays ? styles.calendarFilterButtonActive : ""}`}
                                        onClick={() => setShowOnlyCourseDays(false)}
                                    >
                                        Tous les jours
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.calendarFilterButton} ${showOnlyCourseDays ? styles.calendarFilterButtonActive : ""}`}
                                        onClick={() => setShowOnlyCourseDays(true)}
                                    >
                                        Jours avec cours
                                    </button>
                                </div>
                                        <button
                                            type="button"
                                            className={styles.calendarTodayButton}
                                            onClick={handleTodaySelect}
                                        >
                                            Aujourd&apos;hui
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className={styles.datePickerButton}
                            onClick={() => shiftSelectedDate(1)}
                            aria-label="Jour suivant"
                        >
                            →
                        </button>
                    </div>
                </div>

                <div className={styles.contentGrid}>
                    <div className={styles.coursesList}>
                        <h2 className={styles.sectionTitle}>
                            {coursesForSelectedDate.length > 0
                                ? `Cours du jour (${coursesForSelectedDate.length})`
                                : "Aucun cours pour ce jour"}
                        </h2>
                        {dateLoading ? (
                            <div className={styles.inlineLoader}>
                                <div className={styles.inlineLoaderContent}>
                                    <div className={styles.skeletonLine}></div>
                                    <div className={styles.skeletonLine}></div>
                                    <div className={styles.skeletonLine}></div>
                                </div>
                            </div>
                        ) : coursesForSelectedDate.length === 0 ? (
                            <div className={styles.noCourseAlert}>
                                <p>Pas de cours pour ce jour.</p>
                                <span>Choisissez un jour contenant au moins un cours pour ajouter une note.</span>
                            </div>
                        ) : (
                            coursesForSelectedDate.map((course) => {
                                const { matiere, prof } = getEventTitle(course);
                                const courseNote = notes.get(course.uid);
                                const courseNoteEntries = extractNoteEntries(courseNote);
                                const courseHasEntries = sanitizeNoteEntries(courseNoteEntries).length > 0;
                                const isSelected = selectedCourse === course.uid;

                                return (
                                    <button
                                        key={course.uid}
                                        onClick={() => handleCourseSelect(course.uid)}
                                        className={`${styles.courseButton} ${isSelected ? styles.courseButtonSelected : ''}`}
                                    >
                                        <div className={styles.courseButtonContent}>
                                            <div className={styles.courseButtonInfo}>
                                                <span className={styles.courseButtonTime}>
                                                    {formatTime(course.start)} - {formatTime(course.end)}
                                                </span>
                                                <span className={styles.courseButtonTitle}>
                                                    {matiere || course.summary || "Sans titre"}
                                                </span>
                                                {course.location && (
                                                    <span className={styles.courseButtonLocation}>
                                                        📍 {course.location}
                                                    </span>
                                                )}
                                            </div>
                                            {courseHasEntries && (
                                                <span className={styles.courseButtonBadge}>
                                                    📝
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className={styles.notePanel}>
                        {dateLoading ? (
                            <div className={styles.notePlaceholder}>
                                <div className={styles.inlineLoaderContent}>
                                    <div className={styles.skeletonLine}></div>
                                    <div className={styles.skeletonLine}></div>
                                    <div className={styles.skeletonLine}></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {selectedDate && coursesForSelectedDate.length === 0 && (
                                    <div className={styles.noCourseNoteWarning}>
                                        Pas de cours pour ce jour !
                                    </div>
                                )}
                                {!selectedCourse ? (
                                    <div className={styles.notePlaceholder}>
                                        <p>
                                            {coursesForSelectedDate.length === 0
                                                ? "Choisissez un autre jour avec cours pour ajouter une note."
                                                : "👈 Sélectionnez un cours pour voir ou modifier une note"}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles.noteHeader}>
                                            <div className={styles.noteHeaderInfo}>
                                                <h3 className={styles.noteTitle}>
                                                    {selectedCourseData ? (
                                                        <>
                                                            {getEventTitle(selectedCourseData).matiere || selectedCourseData.summary || "Sans titre"}
                                                            <span className={styles.noteTime}>
                                                                {formatTime(selectedCourseData.start)} - {formatTime(selectedCourseData.end)}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        "Cours sélectionné"
                                                    )}
                                                </h3>
                                                {selectedCourseData?.location && (
                                                    <span className={styles.noteLocation}>
                                                        📍 {selectedCourseData.location}
                                                    </span>
                                                )}
                                            </div>
                                            {savedEntries.length > 0 && !isEditingNotes && (
                                                <button
                                                    type="button"
                                                    className={styles.noteEditIconButton}
                                                    onClick={handleStartEditing}
                                                    title="Modifier les notes"
                                                    aria-label="Modifier les notes"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                        </div>

                                        <div className={styles.noteEditor}>
                                            {savedEntries.length === 0 && !isEditingNotes ? (
                                                <div className={styles.noteEmpty}>
                                                    <p>Aucune note pour ce cours pour le moment.</p>
                                                    <button
                                                        type="button"
                                                        className={styles.noteAddButton}
                                                        onClick={() => {
                                                            setIsEditingNotes(true);
                                                            setNoteEntries([""]);
                                                        }}
                                                        disabled={saving}
                                                    >
                                                        + Ajouter une note
                                                    </button>
                                                </div>
                                            ) : isEditingNotes ? (
                                                <>
                                                    {noteEntries.length === 0 ? (
                                                        <div className={styles.noteEmpty}>
                                                            <p>Aucune note en cours d’édition.</p>
                                                            <button
                                                                type="button"
                                                                className={styles.noteAddButton}
                                                                onClick={handleAddEntry}
                                                                disabled={saving}
                                                            >
                                                                + Ajouter une note
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className={styles.noteEntriesList}>
                                                            {noteEntries.map((entry, index) => (
                                                                <div
                                                                    key={`${selectedCourse || "course"}-${index}`}
                                                                    className={styles.noteEntryCard}
                                                                >
                                                                    <div className={styles.noteEntryHeader}>
                                                                        <span className={styles.noteEntryIndex}>
                                                                            Note {index + 1}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            className={styles.noteEntryRemove}
                                                                            onClick={() => handleRemoveEntry(index)}
                                                                            disabled={saving}
                                                                        >
                                                                            Supprimer
                                                                        </button>
                                                                    </div>
                                                                    <textarea
                                                                        value={entry}
                                                                        onChange={(e) => handleEntryChange(index, e.target.value)}
                                                                        placeholder="Ajoutez vos notes pour ce cours..."
                                                                        className={styles.noteEntryTextarea}
                                                                        rows={4}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className={styles.noteAddButtonSecondary}
                                                        onClick={handleAddEntry}
                                                        disabled={saving}
                                                    >
                                                        + Ajouter une note
                                                    </button>
                                                    <div className={styles.noteActions}>
                                                        {hasChanges && (
                                                            <button
                                                                onClick={saveNote}
                                                                disabled={saving}
                                                                className={styles.saveButton}
                                                            >
                                                                {saving
                                                                    ? "Enregistrement..."
                                                                    : sanitizedCurrentEntries.length === 0
                                                                        ? "Enregistrer (supprimer)"
                                                                        : "Enregistrer"}
                                                            </button>
                                                        )}
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
                                                <div className={styles.noteDisplay}>
                                                    {(() => {
                                                        const courseNote = notes.get(selectedCourse);
                                                        const modificationHistory = courseNote?.modification_history || [];
                                                        
                                                        const formatDateTime = (dateString) => {
                                                            if (!dateString) return '';
                                                            const date = new Date(dateString);
                                                            return date.toLocaleDateString('fr-FR', { 
                                                                day: 'numeric', 
                                                                month: 'long', 
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            });
                                                        };
                                                        
                                                        return (
                                                            <>
                                                                {modificationHistory.length > 0 && (
                                                                    <div className={styles.noteAuthorInfo}>
                                                                        <div className={styles.noteHistoryTitle}>Historique des modifications</div>
                                                                        <table className={styles.noteHistoryTable}>
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>Action</th>
                                                                                    <th>Personne</th>
                                                                                    <th>Date et heure</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {modificationHistory.map((entry, idx) => (
                                                                                    <tr key={idx}>
                                                                                        <td>
                                                                                            <span className={`${styles.noteHistoryBadge} ${entry.action === 'created' ? styles.created : styles.modified}`}>
                                                                                                {entry.action === 'created' ? 'Créé' : 'Modifié'}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td>{entry.user_name || 'Utilisateur inconnu'}</td>
                                                                                        <td>{formatDateTime(entry.timestamp)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                                <div className={styles.noteDisplayList}>
                                                                    {savedEntries.map((entry, index) => {
                                                                        // Récupérer la dernière personne (modification ou création)
                                                                        const lastPerson = modificationHistory.length > 0 
                                                                            ? modificationHistory[modificationHistory.length - 1] 
                                                                            : null;
                                                                        
                                                                        const formatDateTime = (dateString) => {
                                                                            if (!dateString) return '';
                                                                            const date = new Date(dateString);
                                                                            return date.toLocaleDateString('fr-FR', {
                                                                                day: 'numeric',
                                                                                month: 'numeric',
                                                                                year: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            });
                                                                        };
                                                                        
                                                                        return (
                                                                            <div key={`${selectedCourse}-view-${index}`}>
                                                                                <div className={styles.noteDisplayCard}>
                                                                                    <span className={styles.noteDisplayIndex}>Note {index + 1}</span>
                                                                                    <p>{entry}</p>
                                                                                </div>
                                                                                {lastPerson && (
                                                                                    <div className={styles.noteLastPerson}>
                                                                                        {lastPerson.user_name || 'Utilisateur inconnu'}
                                                                                        {lastPerson.timestamp && ` - ${formatDateTime(lastPerson.timestamp)}`}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                    <div className={styles.noteViewActions}>
                                                        <button
                                                            type="button"
                                                            className={styles.noteEditButton}
                                                            onClick={handleStartEditing}
                                                            disabled={saving}
                                                        >
                                                            ✏️ Modifier
                                                        </button>
                                                        <button
                                                            onClick={deleteNote}
                                                            disabled={saving}
                                                            className={styles.deleteButton}
                                                        >
                                                            🗑️ Supprimer
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
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
