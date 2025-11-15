"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function HistoPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [showInfoPanel, setShowInfoPanel] = useState(true);
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

    // Charger la préférence d'affichage du panneau d'information
    useEffect(() => {
        try {
            const saved = localStorage.getItem('histo-info-panel-closed');
            if (saved === 'true') {
                setShowInfoPanel(false);
            }
        } catch (e) {
            // Erreur silencieuse
        }
    }, []);

    const handleCloseInfoPanel = () => {
        setShowInfoPanel(false);
        try {
            localStorage.setItem('histo-info-panel-closed', 'true');
        } catch (e) {
            // Erreur silencieuse
        }
    };

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
                <button
                    onClick={() => router.push('/')}
                    style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: 8,
                        padding: '.5rem .75rem',
                        cursor: 'pointer',
                        marginBottom: '0.75rem'
                    }}
                    title="Retour au menu"
                >
                    ← Retour
                </button>
                <h1 style={{marginBottom: 0}}>Historique des cours ajoutés</h1>
            </div>
            {showInfoPanel && (
            <div style={{
                background: "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)",
                border: "1px solid var(--border-color)",
                borderRadius: 16,
                padding: "1.5rem",
                marginBottom: "1.5rem",
                boxShadow: "var(--shadow-sm)",
                position: "relative"
            }}>
                <button
                    onClick={handleCloseInfoPanel}
                    style={{
                        position: "absolute",
                        top: "0.75rem",
                        right: "0.75rem",
                        background: "transparent",
                        border: "none",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "1.25rem",
                        lineHeight: 1,
                        padding: "0.25rem",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "4px",
                        transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-primary)";
                        e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                    title="Fermer"
                    aria-label="Fermer"
                >
                    ×
                </button>
                <h2 style={{
                    color: "var(--text-primary)",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    margin: "0 0 0.75rem 0",
                    letterSpacing: "-0.01em",
                    paddingRight: "2rem"
                }}>
                    Vérification automatique
                </h2>
                <div style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    lineHeight: "1.6"
                }}>
                    <p style={{margin: "0 0 0.75rem 0"}}>
                        Les modifications de l'emploi du temps sont détectées automatiquement :
                    </p>
                    <ul style={{
                        margin: 0,
                        paddingLeft: "1.25rem",
                        listStyle: "none"
                    }}>
                        <li style={{marginBottom: "0.5rem", position: "relative", paddingLeft: "1.25rem"}}>
                            <span style={{
                                position: "absolute",
                                left: 0,
                                color: "var(--primary-color)"
                            }}>•</span>
                            <strong>9h-19h</strong> : toutes les <strong>20 minutes</strong>
                        </li>
                        <li style={{marginBottom: "0.5rem", position: "relative", paddingLeft: "1.25rem"}}>
                            <span style={{
                                position: "absolute",
                                left: 0,
                                color: "var(--primary-color)"
                            }}>•</span>
                            <strong>1h-7h</strong> : aucune vérification (pause nocturne)
                        </li>
                        <li style={{marginBottom: "0", position: "relative", paddingLeft: "1.25rem"}}>
                                <span style={{
                                    position: "absolute",
                                    left: 0,
                                    color: "var(--primary-color)"
                                }}>•</span>
                            <strong>Le reste du temps</strong> : toutes les <strong>heures</strong>
                        </li>
                    </ul>
                </div>
            </div>
            )}
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


