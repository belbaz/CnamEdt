// @ts-nocheck
"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchICSEvents } from "@/services/icsService";
import { getEventTitle } from "@/utils/eventUtils";
import { createSubjectColorMapping } from "@/utils/eventUtils";
import { generateEventKey } from "@/utils/eventModalUtils";
import {useI18n} from "@/i18n/I18nContext";
import { applyThemeFromBrowserStorage } from "@/lib/themeHydration";
import BackButton from "@/components/BackButton";
import Spinner from "@/components/Spinner";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

function ExamensContent() {
    const { t } = useI18n();
    const router = useRouter();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [subjectColors, setSubjectColors] = useState({});

    // Thème (OLED prioritaire via cookie de session)
    useEffect(() => {
        try {
            applyThemeFromBrowserStorage();
        } catch (e) {
            // Erreur silencieuse
        }
    }, []);

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
                setError(err.message || t('examens.errorLoading'));
            } finally {
                setLoading(false);
            }
        }
        loadEvents();
    }, []);

    // Filtrer et traiter les examens
    const upcomingExams = useMemo(() => {
        // Filtrer et mapper les examens
        const allExams = events
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
                    matiere: matiere || event.summary || t('examens.unknownSubject'),
                    examDate,
                    timeDiff,
                };
            })
            .sort((a, b) => a.examDate - b.examDate);

        // Regrouper les examens consécutifs de la même matière
        const groupedExams = [];
        let currentGroup = null;

        for (const exam of allExams) {
            if (!currentGroup) {
                // Premier examen, créer un nouveau groupe
                const examEndDate = exam.end || exam.end_time || exam.examDate;
                currentGroup = {
                    ...exam,
                    exams: [exam],
                    endDate: new Date(examEndDate),
                };
            } else {
                // Vérifier si cet examen est consécutif et de la même matière
                // Utiliser la date de fin du dernier examen du groupe
                const lastExamInGroup = currentGroup.exams[currentGroup.exams.length - 1];
                const lastExamEndDate = lastExamInGroup.end || lastExamInGroup.end_time || lastExamInGroup.examDate;
                const timeBetweenExams = exam.examDate - new Date(lastExamEndDate);
                const isSameSubject = exam.matiere === currentGroup.matiere;
                const isConsecutive = timeBetweenExams <= 24 * 60 * 60 * 1000; // Moins de 24h entre les examens

                if (isSameSubject && isConsecutive) {
                    // Ajouter à ce groupe
                    currentGroup.exams.push(exam);
                    // Mettre à jour la date de fin avec la date de fin de cet examen
                    const examEndDate = exam.end || exam.end_time || exam.examDate;
                    currentGroup.endDate = new Date(examEndDate);
                    // Mettre à jour le timeDiff avec le premier examen du groupe (le plus proche)
                    if (exam.timeDiff < currentGroup.timeDiff) {
                        currentGroup.timeDiff = exam.timeDiff;
                        currentGroup.examDate = exam.examDate;
                    }
                } else {
                    // Nouveau groupe, sauvegarder l'ancien
                    groupedExams.push(currentGroup);
                    const examEndDate = exam.end || exam.end_time || exam.examDate;
                    currentGroup = {
                        ...exam,
                        exams: [exam],
                        endDate: new Date(examEndDate),
                    };
                }
            }
        }

        // Ne pas oublier le dernier groupe
        if (currentGroup) {
            groupedExams.push(currentGroup);
        }

        return groupedExams;
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

    // Fonction pour formater une plage de dates
    function formatDateRange(startDate, endDate) {
        const start = formatDate(startDate);
        const end = formatDate(endDate);
        
        // Si c'est le même jour, afficher seulement une date avec les heures
        const sameDay = startDate.toDateString() === endDate.toDateString();
        if (sameDay) {
            return start;
        }
        
        return `${start} - ${end}`;
    }

    // Fonction pour naviguer vers le cours correspondant à l'examen
    const handleExamClick = (exam) => {
        try {
            // Si c'est un groupe d'examens, passer tous les eventKey
            if (exam.exams && exam.exams.length > 1) {
                const eventKeys = exam.exams.map(e => encodeURIComponent(generateEventKey(e)));
                router.push(`/?eventKey=${eventKeys.join(',')}`);
            } else {
                // Un seul examen, navigation normale
                const examToNavigate = exam.exams ? exam.exams[0] : exam;
                const eventKey = generateEventKey(examToNavigate);
                const encodedKey = encodeURIComponent(eventKey);
                router.push(`/?eventKey=${encodedKey}`);
            }
        } catch (err) {
            console.error("[Examens] Erreur lors de la navigation:", err);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <Spinner size="large" variant="border" />
                    <p>{t('examens.loading')}</p>
                </div>
                <Footer />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorContainer}>
                    <p className={styles.errorMessage}>❌ {error}</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <main className={styles.main}>
                <div className={styles.header}>
                    <BackButton href="/dashboard" title={t('examens.backToDashboard')} />
                    <h1 className={styles.title}>{t('examens.title')}</h1>
                </div>

                {upcomingExams.length === 0 ? (
                    <div className={styles.noExamsContainer}>
                        <div className={styles.noExamsIcon}>😌</div>
                        <h2 className={styles.noExamsTitle}>{t('examens.noExamsTitle')}</h2>
                        <p className={styles.noExamsText}>
                            {t('examens.noExamsText')}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className={styles.summary}>
                            <p className={styles.summaryText}>
                                {t('examens.upcomingExams')
                                    .replace('{count}', upcomingExams.length)
                                    .replace('{plural}', upcomingExams.length > 1 ? 's' : '')}
                            </p>
                        </div>

                        <ul className={styles.examsList}>
                            {upcomingExams.map((exam, index) => {
                                const color = getSubjectColor(exam.matiere);
                                const isUrgent = exam.timeDiff < 24 * 60 * 60 * 1000; // Moins de 24h
                                const isVeryUrgent = exam.timeDiff < 7 * 60 * 60 * 1000; // Moins de 7h
                                const isGrouped = exam.exams && exam.exams.length > 1;
                                const firstExam = exam.exams ? exam.exams[0] : exam;
                                const lastExam = exam.exams ? exam.exams[exam.exams.length - 1] : exam;
                                const lastExamEndDate = lastExam.end || lastExam.end_time || lastExam.examDate;

                                return (
                                    <li
                                        key={exam.uid || index}
                                        className={`${styles.examItem} ${isUrgent ? styles.urgent : ""} ${isVeryUrgent ? styles.veryUrgent : ""}`}
                                        style={{ "--subject-color": color }}
                                        onClick={() => handleExamClick(exam)}
                                    >
                                        <div className={styles.examContent}>
                                            <div className={styles.examLeft}>
                                                <div
                                                    className={styles.colorIndicator}
                                                    style={{ backgroundColor: color }}
                                                />
                                                <div className={styles.examInfo}>
                                                    <h3 className={styles.examSubject}>
                                                        {exam.matiere}
                                                    </h3>
                                                    <div className={styles.examMeta}>
                                                        <span className={styles.examDate}>
                                                            📅 {isGrouped 
                                                                ? formatDateRange(firstExam.examDate, new Date(lastExamEndDate))
                                                                : formatDate(exam.examDate)
                                                            }
                                                        </span>
                                                        {firstExam.location && (
                                                            <span className={styles.examLocation}>
                                                                📍 {firstExam.location}
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


