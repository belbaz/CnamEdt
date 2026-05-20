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

// Icônes SVG ajustées pour accepter des tailles personnalisées
const EyeIcon = ({ width = 16, height = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = ({ width = 16, height = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
);

function ExamensContent() {
    const { t } = useI18n();
    const router = useRouter();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [subjectColors, setSubjectColors] = useState({});

    const [hiddenSubjects, setHiddenSubjects] = useState([]);

    // --- SÉCURITÉ DE TRADUCTION ---
    // Cette fonction évite de casser l'UI si les JSON ne sont pas encore à jour
    const getSafeTranslation = (key, fallback) => {
        const translation = t(key);
        return (!translation || translation === key) ? fallback : translation;
    };

    const textHide = getSafeTranslation('examens.hide', 'Cacher');
    const textShow = getSafeTranslation('examens.show', 'Afficher');
    const textAllHidden = getSafeTranslation('examens.allHidden', 'Tous vos examens sont masqués.');
    const textHiddenTitle = getSafeTranslation('examens.hiddenTitle', 'Examens masqués');

    useEffect(() => {
        try {
            applyThemeFromBrowserStorage();
        } catch (e) {
            // Erreur silencieuse
        }
    }, []);

    useEffect(() => {
        try {
            const savedHidden = localStorage.getItem('cnamedt_hidden_exams');
            if (savedHidden) {
                setHiddenSubjects(JSON.parse(savedHidden));
            }
        } catch (e) {
            console.error("[Examens] Erreur lecture localStorage:", e);
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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

    const upcomingExams = useMemo(() => {
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

        const examsMap = new Map();

        for (const exam of allExams) {
            if (!examsMap.has(exam.matiere)) {
                const examEndDate = exam.end || exam.end_time || exam.examDate;
                examsMap.set(exam.matiere, {
                    ...exam,
                    exams: [exam],
                    endDate: new Date(examEndDate),
                    _blockBroken: false
                });
            } else {
                const currentGroup = examsMap.get(exam.matiere);

                if (!currentGroup._blockBroken) {
                    const lastExamInGroup = currentGroup.exams[currentGroup.exams.length - 1];
                    const lastExamEndDate = lastExamInGroup.end || lastExamInGroup.end_time || lastExamInGroup.examDate;
                    const timeBetweenExams = exam.examDate - new Date(lastExamEndDate);

                    if (timeBetweenExams <= 24 * 60 * 60 * 1000) {
                        const examEndDate = exam.end || exam.end_time || exam.examDate;
                        currentGroup.endDate = new Date(examEndDate);
                    } else {
                        currentGroup._blockBroken = true;
                    }
                }

                currentGroup.exams.push(exam);
            }
        }

        return Array.from(examsMap.values());
    }, [events, currentTime]);

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

    function formatDate(date) {
        return date.toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function formatDateRange(startDate, endDate) {
        const start = formatDate(startDate);
        const end = formatDate(endDate);
        const sameDay = startDate.toDateString() === endDate.toDateString();
        if (sameDay) {
            return start;
        }
        return `${start} - ${end}`;
    }

    const handleExamClick = (exam) => {
        try {
            if (exam.exams && exam.exams.length > 1) {
                const eventKeys = exam.exams.map(e => encodeURIComponent(generateEventKey(e)));
                router.push(`/?eventKey=${eventKeys.join(',')}`);
            } else {
                const examToNavigate = exam.exams ? exam.exams[0] : exam;
                const eventKey = generateEventKey(examToNavigate);
                const encodedKey = encodeURIComponent(eventKey);
                router.push(`/?eventKey=${encodedKey}`);
            }
        } catch (err) {
            console.error("[Examens] Erreur lors de la navigation:", err);
        }
    };

    const toggleVisibility = (matiere, e) => {
        e.stopPropagation();
        setHiddenSubjects((prev) => {
            const newHidden = prev.includes(matiere)
                ? prev.filter((m) => m !== matiere)
                : [...prev, matiere];

            try {
                localStorage.setItem('cnamedt_hidden_exams', JSON.stringify(newHidden));
            } catch (err) {}
            return newHidden;
        });
    };

    const renderExamCard = (exam, index, isHidden) => {
        const color = getSubjectColor(exam.matiere);
        const isUrgent = exam.timeDiff < 24 * 60 * 60 * 1000;
        const isVeryUrgent = exam.timeDiff < 7 * 60 * 60 * 1000;
        const firstExam = exam.exams ? exam.exams[0] : exam;

        return (
            <li
                key={exam.uid || index}
                className={`${styles.examItem} ${isUrgent && !isHidden ? styles.urgent : ""} ${isVeryUrgent && !isHidden ? styles.veryUrgent : ""}`}
                style={{
                    "--subject-color": color,
                    opacity: isHidden ? 0.6 : 1,
                    filter: isHidden ? 'grayscale(0.6)' : 'none'
                }}
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
                                    📅 {formatDateRange(firstExam.examDate, exam.endDate)}
                                </span>
                                {firstExam.location && (
                                    <span className={styles.examLocation}>
                                        📍 {firstExam.location}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className={styles.examRight} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            className={`${styles.timeRemaining} ${isUrgent && !isHidden ? styles.urgentTime : ""} ${isVeryUrgent && !isHidden ? styles.veryUrgentTime : ""}`}
                        >
                            {formatTimeRemaining(exam.timeDiff)}
                        </div>
                        {isVeryUrgent && !isHidden && (
                            <span className={styles.urgentBadge}>⚠️</span>
                        )}
                        {isUrgent && !isVeryUrgent && !isHidden && (
                            <span className={styles.warningBadge}>⏰</span>
                        )}

                        <button
                            onClick={(e) => toggleVisibility(exam.matiere, e)}
                            title={isHidden ? textShow : textHide}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border-color, rgba(128, 128, 128, 0.4))',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                padding: '4px 10px',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                opacity: 0.8,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.background = 'var(--bg-secondary, rgba(128, 128, 128, 0.1))';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '0.8';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            {isHidden ? (
                                <>
                                    <EyeIcon width={14} height={14} /> {textShow}
                                </>
                            ) : (
                                <>
                                    <EyeOffIcon width={14} height={14} /> {textHide}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </li>
        );
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

    const visibleExams = upcomingExams.filter(exam => !hiddenSubjects.includes(exam.matiere));
    const hiddenExamsList = upcomingExams.filter(exam => hiddenSubjects.includes(exam.matiere));

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
                                    .replace('{count}', visibleExams.length)
                                    .replace('{plural}', visibleExams.length > 1 ? 's' : '')}
                            </p>
                        </div>

                        {visibleExams.length > 0 ? (
                            <ul className={styles.examsList}>
                                {visibleExams.map((exam, index) => renderExamCard(exam, index, false))}
                            </ul>
                        ) : (
                            <div className={styles.noExamsContainer} style={{ padding: '2rem 0' }}>
                                <p className={styles.noExamsText}>{textAllHidden}</p>
                            </div>
                        )}

                        {hiddenExamsList.length > 0 && (
                            <div style={{ marginTop: '3rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem' }}>
                                <h2 style={{
                                    fontSize: '1rem',
                                    fontWeight: '500',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <EyeOffIcon width={18} height={18} /> {textHiddenTitle} ({hiddenExamsList.length})
                                </h2>
                                <ul className={styles.examsList}>
                                    {hiddenExamsList.map((exam, index) => renderExamCard(exam, index, true))}
                                </ul>
                            </div>
                        )}
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