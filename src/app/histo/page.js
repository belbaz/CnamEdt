"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import BackButton from "@/components/BackButton";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function HistoPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const router = useRouter();

    // S'assurer que le dark mode est appliqué au chargement
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
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                // Force a refresh of ICS to populate DB if needed
                await fetch('/api/fetch-ics', {cache: 'no-store'});
                const res = await fetch('/api/history', {cache: 'no-store'});
                const data = await res.json();
                if (!cancelled) {
                    setEvents(Array.isArray(data.items) ? data.items : []);
                    setLoading(false);
                    
                    // Marquer comme vu en sauvegardant la date actuelle
                    try {
                        const now = Date.now();
                        localStorage.setItem('histo-last-seen-date', now.toString());
                    } catch (e) {
                        // Erreur silencieuse
                    }
                }
            } catch {
                if (!cancelled) {
                    setEvents([]);
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const formatEventSummary = (summary) => {
        if (!summary || summary.trim() === '' || summary === ':') return 'Sans titre';
        return summary.replace(/^(USS|UAS)[A-Z0-9]*\s*:\s*/i, '').trim() || summary;
    };

    const handleCourseClick = (eventKey, startDate) => {
        // Encoder l'event_key pour l'URL
        const encodedKey = encodeURIComponent(eventKey);
        // Naviguer vers la page EDT avec le paramètre eventKey
        router.push(`/?eventKey=${encodedKey}`);
    };

    // Trier tous les événements par date d'ajout (plus récent en premier)
    const sortedEvents = [...events].sort((a, b) => {
        const dateA = new Date(a.first_seen);
        const dateB = new Date(b.first_seen);
        return dateB - dateA;
    });

    // Grouper les événements par date (jour)
    const groupedEvents = sortedEvents.reduce((groups, event) => {
        const date = new Date(event.first_seen);
        const dateKey = date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(event);
        return groups;
    }, {});

    // Trier les groupes par date (plus récent en premier)
    const sortedGroups = Object.entries(groupedEvents).sort((a, b) => {
        const dateA = new Date(a[1][0].first_seen);
        const dateB = new Date(b[1][0].first_seen);
        return dateB - dateA;
    });

    // Par défaut, ouvrir le premier groupe (le plus récent)
    useEffect(() => {
        if (sortedGroups.length > 0 && expandedGroups.size === 0) {
            setExpandedGroups(new Set([sortedGroups[0][0]]));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortedGroups.length]);

    const toggleGroup = (dateKey) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(dateKey)) {
            newExpanded.delete(dateKey);
        } else {
            newExpanded.add(dateKey);
        }
        setExpandedGroups(newExpanded);
    };

    return (
        <main style={{maxWidth: 900, margin: "0 auto", padding: "1rem"}}>
            <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ marginBottom: "0.75rem" }}>
                    <BackButton href="/dashboard" title="Retour au dashboard" />
                </div>
                <h1 style={{marginBottom: 0}}>Historique des cours ajoutés</h1>
            </div>
            <div style={{
                background: "linear-gradient(135deg, rgba(66, 153, 225, 0.1) 0%, rgba(37, 99, 235, 0.15) 100%)",
                border: "2px solid var(--primary-color)",
                borderRadius: 20,
                padding: "1.75rem",
                marginBottom: "1.5rem",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
                position: "relative",
                overflow: "hidden"
            }}>
                {/* Effet de brillance en arrière-plan */}
                <div style={{
                    position: "absolute",
                    top: "-50%",
                    right: "-50%",
                    width: "200%",
                    height: "200%",
                    background: "radial-gradient(circle, rgba(66, 153, 225, 0.1) 0%, transparent 70%)",
                    pointerEvents: "none"
                }} />
                
                <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        marginBottom: "1rem"
                    }}>
                        <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #4299e1, #2563eb)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: "0 4px 8px rgba(37, 99, 235, 0.3)"
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h2 style={{
                            color: "var(--text-primary)",
                            fontSize: "1.25rem",
                            fontWeight: 700,
                            margin: 0,
                            letterSpacing: "-0.02em"
                        }}>
                            Vérification automatique
                        </h2>
                    </div>
                    
                    <p style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.95rem",
                        margin: "0 0 1.25rem 0",
                        lineHeight: "1.5"
                    }}>
                        Les modifications de l'emploi du temps sont détectées automatiquement :
                    </p>
                    
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.875rem"
                    }}>
                        {/* Période 9h-19h */}
                        <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "1rem",
                            padding: "1rem",
                            background: "var(--bg-secondary)",
                            borderRadius: "12px",
                            border: "1px solid rgba(66, 153, 225, 0.3)",
                            boxShadow: "0 2px 4px rgba(66, 153, 225, 0.1)"
                        }}>
                            <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: "linear-gradient(135deg, #10b981, #059669)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                                    <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    color: "var(--text-primary)",
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    marginBottom: "0.25rem"
                                }}>
                                    <span style={{ color: "var(--primary-color)" }}>9h-19h</span> : toutes les <strong style={{ color: "#10b981" }}>20 minutes</strong>
                                </div>
                                <div style={{
                                    color: "var(--text-secondary)",
                                    fontSize: "0.85rem"
                                }}>
                                    Période active de la journée
                                </div>
                            </div>
                        </div>

                        {/* Période 1h-7h */}
                        <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "1rem",
                            padding: "1rem",
                            background: "var(--bg-secondary)",
                            borderRadius: "12px",
                            border: "1px solid rgba(107, 114, 128, 0.3)",
                            boxShadow: "0 2px 4px rgba(107, 114, 128, 0.1)"
                        }}>
                            <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: "linear-gradient(135deg, #6b7280, #4b5563)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    color: "var(--text-primary)",
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    marginBottom: "0.25rem"
                                }}>
                                    <span style={{ color: "#6b7280" }}>1h-7h</span> : <strong style={{ color: "#6b7280" }}>aucune vérification</strong>
                                </div>
                                <div style={{
                                    color: "var(--text-secondary)",
                                    fontSize: "0.85rem"
                                }}>
                                    Pause nocturne
                                </div>
                            </div>
                        </div>

                        {/* Période reste du temps */}
                        <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "1rem",
                            padding: "1rem",
                            background: "var(--bg-secondary)",
                            borderRadius: "12px",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            boxShadow: "0 2px 4px rgba(245, 158, 11, 0.1)"
                        }}>
                            <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                                    <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    color: "var(--text-primary)",
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    marginBottom: "0.25rem"
                                }}>
                                    <span style={{ color: "#f59e0b" }}>Le reste du temps</span> : toutes les <strong style={{ color: "#f59e0b" }}>heures</strong>
                                </div>
                                <div style={{
                                    color: "var(--text-secondary)",
                                    fontSize: "0.85rem"
                                }}>
                                    Période standard
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <p style={{color: "var(--text-secondary)", marginBottom: "1rem"}}>
                Chaque cours apparaît au moment où il est vu pour la première fois dans l'edt. Cliquez sur un cours pour l'afficher dans l'EDT.
            </p>

            {loading && <LoadingSpinner />}

            {!loading && events.length === 0 && (
                <div style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    padding: "1rem"
                }}>
                    Aucun historique pour le moment. Revenez après un chargement d'ICS.
                </div>
            )}
            {!loading && (
            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
            }}>
                {sortedGroups.map(([dateKey, groupEvents]) => {
                    const isExpanded = expandedGroups.has(dateKey);
                    const eventCount = groupEvents.length;
                    
                    return (
                        <div
                            key={dateKey}
                            style={{
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-color)",
                                borderRadius: 12,
                                overflow: "hidden"
                            }}
                        >
                            <button
                                onClick={() => toggleGroup(dateKey)}
                                style={{
                                    width: "100%",
                                    background: "transparent",
                                    border: "none",
                                    padding: "1rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    color: "var(--text-primary)",
                                    textAlign: "left"
                                }}
                            >
                                <div>
                                    <strong style={{fontSize: "1rem", display: "block"}}>
                                        {dateKey}
                                    </strong>
                                    <span style={{
                                        color: "var(--text-secondary)",
                                        fontSize: "0.85rem"
                                    }}>
                                        {eventCount} cours{eventCount > 1 ? ' ajoutés' : ' ajouté'}
                                    </span>
                                </div>
                                <span style={{
                                    fontSize: "1.2rem",
                                    transition: "transform 0.2s ease",
                                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)"
                                }}>
                                    ▶
                                </span>
                            </button>
                            
                            {isExpanded && (
                                <div style={{
                                    borderTop: "1px solid var(--border-color)",
                                    padding: "0.75rem"
                                }}>
                                    <ul style={{
                                        listStyle: "none",
                                        padding: 0,
                                        margin: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.75rem"
                                    }}>
                                        {groupEvents.map((row) => {
                                            const listKey = row.uid ? `${row.uid}|${row.event_key}` : `${row.event_key}|${row.first_seen}`;
                                            const startDate = new Date(row.start);
                                            const endDate = new Date(row.end_time || row.end || row.start);
                                            const matiere = formatEventSummary(row.summary);
                                            return (
                                                <li
                                                    key={listKey}
                                                    onClick={() => handleCourseClick(row.event_key, startDate)}
                                                    style={{
                                                        background: "var(--bg-primary)",
                                                        border: "1px solid var(--border-color)",
                                                        borderRadius: 8,
                                                        padding: "0.9rem",
                                                        cursor: "pointer",
                                                        transition: "all 0.2s ease",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = "var(--bg-secondary)";
                                                        e.currentTarget.style.borderColor = "var(--text-primary)";
                                                        e.currentTarget.style.transform = "translateX(4px)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = "var(--bg-primary)";
                                                        e.currentTarget.style.borderColor = "var(--border-color)";
                                                        e.currentTarget.style.transform = "translateX(0)";
                                                    }}
                                                >
                                                    <div style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        gap: "0.75rem"
                                                    }}>
                                                        <div style={{flex: 1}}>
                                                            <strong style={{
                                                                color: "var(--text-primary)",
                                                                fontSize: "1rem",
                                                                display: "block",
                                                                marginBottom: "0.25rem"
                                                            }}>{matiere}</strong>
                                                            <div style={{color: "var(--text-secondary)", fontSize: ".9rem"}}>
                                                                {startDate.toLocaleString('fr-FR', {
                                                                    weekday: 'long',
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })} - {endDate.toLocaleTimeString('fr-FR', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                            </div>
                                                            {row.location && (
                                                                <div style={{
                                                                    color: "var(--text-muted)",
                                                                    fontSize: ".85rem",
                                                                    marginTop: "0.25rem"
                                                                }}>📍 {row.location}</div>
                                                            )}
                                                        </div>
                                                        <div style={{color: "var(--text-secondary)", fontSize: ".85rem", textAlign: "right"}}>
                                                            Ajouté à<br/>
                                                            {new Date(row.first_seen).toLocaleTimeString('fr-FR', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            )}
        </main>
    );
}


