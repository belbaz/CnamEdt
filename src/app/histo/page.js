"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function HistoPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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
            <ul style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
            }}>
                {sortedEvents.map((row) => {
                    const startDate = new Date(row.start);
                    const endDate = new Date(row.end_time || row.end || row.start);
                    const matiere = formatEventSummary(row.summary);
                    return (
                        <li
                            key={row.event_key}
                            onClick={() => handleCourseClick(row.event_key, startDate)}
                            style={{
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-color)",
                                borderRadius: 12,
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
                                e.currentTarget.style.background = "var(--bg-secondary)";
                                e.currentTarget.style.borderColor = "var(--border-color)";
                                e.currentTarget.style.transform = "translateX(0)";
                            }}
                        >
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
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
                                    Ajouté le<br/>
                                    {new Date(row.first_seen).toLocaleString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
            )}
        </main>
    );
}


