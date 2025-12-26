"use client";
import { useState, useEffect, useMemo } from "react";
import { fetchICSEvents } from "@/services/icsService";
import { getEventTitle } from "@/utils/eventUtils";
import { createSubjectColorMapping } from "@/utils/eventUtils";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

function ExamensContent() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [subjectColors, setSubjectColors] = useState({});

    // Mettre à jour l'heure actuelle toutes les secondes
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Charger les événements
    useEffect(() => {
        async function loadEvents() {
            try {
                setLoading(true);
                setError(null);
                const result = await fetchICSEvents();
                if (result && result.events) {
                    setEvents(result.events);
                    const colors = createSubjectColorMapping(result.events);
                    setSubjectColors(colors);
                }
            } catch (err) {
                console.error("[Examens] Erreur lors du chargement:", err);
                setError(err.message || "Erreur lors du chargement des examens");
            } finally {
                setLoading(false);
            }
        }
        loadEvents();
    }, []);

    // Filtrer et traiter les examens
    const upcomingExams = useMemo(() => {
        return events
            .filter((event) => {
                const description = event.description || "";
                const isExam = description.toUpperCase().includes("EXAMEN");
                if (!isExam) return false;

                const examDate = new Date(event.start);
                return examDate > currentTime;
            })
            .map((event) => {
                const examDate = new Date(event.start);
                const timeDiff = examDate - currentTime;
                const { matiere } = getEventTitle(event);
                
                return {
                    ...event,
                    matiere: matiere || event.summary || "Matière inconnue",
                    examDate,
                    timeDiff,
                };
            })
            .sort((a, b) => a.examDate - b.examDate);
    }, [events, currentTime]);

    // Fonction pour formater le temps restant (toujours avec secondes)
    function formatTimeRemaining(timeDiff) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        if (days > 0) {
            return `${days}j ${hours}h ${minutes}m ${seconds}s`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // Fonction pour obtenir la couleur d'une matière
    function getSubjectColor(matiere) {
        const colorIndex = subjectColors[matiere] ?? 0;
        const colors = [
            "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
            "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
            "#14b8a6", "#a855f7", "#f43f5e", "#0ea5e9", "#22c55e",
            "#eab308", "#d946ef", "#64748b", "#06b6d4", "#8b5cf6"
        ];
        return colors[colorIndex % colors.length];
    }

    // Fonction pour formater la date (format court)
    function formatDate(date) {
        return date.toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <Navbar
                    darkMode={false}
                    oledMode={false}
                    onToggleDarkMode={() => {}}
                    onToggleOledMode={() => {}}
                    availableWeeks={[]}
                    selectedWeek={null}
                    onWeekChange={() => {}}
                    showRefreshButton={false}
                    showFilter={false}
                />
                <div className={styles.loadingContainer}>
                    <LoadingSpinner />
                    <p>Chargement des examens...</p>
                </div>
                <Footer />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <Navbar
                    darkMode={false}
                    oledMode={false}
                    onToggleDarkMode={() => {}}
                    onToggleOledMode={() => {}}
                    availableWeeks={[]}
                    selectedWeek={null}
                    onWeekChange={() => {}}
                    showRefreshButton={false}
                    showFilter={false}
                />
                <div className={styles.errorContainer}>
                    <p className={styles.errorMessage}>❌ {error}</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Navbar
                darkMode={false}
                oledMode={false}
                onToggleDarkMode={() => {}}
                onToggleOledMode={() => {}}
                availableWeeks={[]}
                selectedWeek={null}
                onWeekChange={() => {}}
                showRefreshButton={false}
                showFilter={false}
            />
            <main className={styles.main}>
                <h1 className={styles.title}>⏰ Temps restant jusqu'aux examens</h1>

                {upcomingExams.length === 0 ? (
                    <div className={styles.noExamsContainer}>
                        <div className={styles.noExamsIcon}>😌</div>
                        <h2 className={styles.noExamsTitle}>Relax, pas encore d'examen !</h2>
                        <p className={styles.noExamsText}>
                            Aucun examen à venir pour le moment. Profite de ce répit ! 🎉
                        </p>
                    </div>
                ) : (
                    <>
                        <div className={styles.summary}>
                            <p className={styles.summaryText}>
                                {upcomingExams.length} examen{upcomingExams.length > 1 ? "s" : ""} à venir
                            </p>
                        </div>

                        <ul className={styles.examsList}>
                            {upcomingExams.map((exam, index) => {
                                const color = getSubjectColor(exam.matiere);
                                const isUrgent = exam.timeDiff < 24 * 60 * 60 * 1000; // Moins de 24h
                                const isVeryUrgent = exam.timeDiff < 7 * 60 * 60 * 1000; // Moins de 7h

                                return (
                                    <li
                                        key={exam.uid || index}
                                        className={`${styles.examItem} ${isUrgent ? styles.urgent : ""} ${isVeryUrgent ? styles.veryUrgent : ""}`}
                                        style={{ "--subject-color": color }}
                                    >
                                        <div className={styles.examContent}>
                                            <div className={styles.examLeft}>
                                                <div
                                                    className={styles.colorIndicator}
                                                    style={{ backgroundColor: color }}
                                                />
                                                <div className={styles.examInfo}>
                                                    <h3 className={styles.examSubject}>{exam.matiere}</h3>
                                                    <div className={styles.examMeta}>
                                                        <span className={styles.examDate}>
                                                            📅 {formatDate(exam.examDate)}
                                                        </span>
                                                        {exam.location && (
                                                            <span className={styles.examLocation}>
                                                                📍 {exam.location}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={styles.examRight}>
                                                <div
                                                    className={`${styles.timeRemaining} ${isUrgent ? styles.urgentTime : ""} ${isVeryUrgent ? styles.veryUrgentTime : ""}`}
                                                >
                                                    {formatTimeRemaining(exam.timeDiff)}
                                                </div>
                                                {isVeryUrgent && (
                                                    <span className={styles.urgentBadge}>⚠️</span>
                                                )}
                                                {isUrgent && !isVeryUrgent && (
                                                    <span className={styles.warningBadge}>⏰</span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
}

export default function ExamensPage() {
    return <ExamensContent />;
}

