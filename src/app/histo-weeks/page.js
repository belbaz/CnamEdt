"use client";

import { useEffect, useState } from "react";

export default function HistoWeeksPage() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/history-weeks', { cache: 'no-store' });
                const json = await res.json();
                if (!cancelled) setItems(Array.isArray(json.items) ? json.items : []);
            } catch {
                if (!cancelled) setItems([]);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <main style={{ maxWidth: 1000, margin: "0 auto", padding: "1rem" }}>
            <h1 style={{ marginBottom: ".5rem" }}>Historique hebdomadaire (ajouts par semaine)</h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Pour chaque semaine (lundi), on liste les cours ajoutés/supprimés.
            </p>

            {items.length === 0 && (
                <div style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    padding: "1rem"
                }}>
                    Aucun historique hebdomadaire pour le moment.
                </div>
            )}

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {items.map((row) => (
                    <li key={`${row.week_monday}-${row.created_at}`} style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 12,
                        padding: "0.9rem"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                            <div>
                                <strong>Semaine du {row.week_monday}</strong>
                                <div style={{ color: "var(--text-secondary)", fontSize: ".9rem" }}>
                                    Snapshot: {new Date(row.created_at).toLocaleString("fr-FR")}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                                <Badge color="#16a34a">+{row.added_keys?.length || 0} ajout(s)</Badge>
                                <Badge color="#dc2626">-{row.removed_keys?.length || 0} retrait(s)</Badge>
                            </div>
                        </div>

                        <div style={{ marginTop: ".75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <EventChangeList title="Ajoutés" keys={row.added_keys} events={row.events} accent="#10b981" emptyLabel="Aucun ajout" />
                            <EventChangeList title="Retirés" keys={row.removed_keys} events={row.events} accent="#ef4444" emptyLabel="Aucun retrait" />
                        </div>
                    </li>
                ))}
            </ul>
        </main>
    );
}

function Badge({ children, color }) {
    return (
        <span style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            color,
            borderRadius: 999,
            padding: ".25rem .5rem",
            fontWeight: 700,
            fontSize: ".8rem"
        }}>{children}</span>
    );
}

function EventChangeList({ title, keys = [], events = [], accent, emptyLabel }) {
    const lookup = new Map((events || []).map(e => [e.key, e]));
    return (
        <div style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            padding: ".75rem"
        }}>
            <div style={{ fontWeight: 700, marginBottom: ".4rem", color: "var(--text-primary)" }}>{title}</div>
            {(!keys || keys.length === 0) ? (
                <div style={{ color: "var(--text-secondary)", fontSize: ".9rem" }}>{emptyLabel}</div>
            ) : (
                <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                    {keys.map(k => {
                        const e = lookup.get(k);
                        if (!e) return (
                            <li key={k} style={{ color: "var(--text-secondary)", borderLeft: `3px solid ${accent}`, paddingLeft: ".5rem", margin: ".15rem 0" }}>{k}</li>
                        );
                        const time = new Date(e.start).toLocaleString("fr-FR", { weekday: 'long', hour: '2-digit', minute: '2-digit' });
                        return (
                            <li key={k} style={{ color: "var(--text-secondary)", borderLeft: `3px solid ${accent}`, paddingLeft: ".5rem", margin: ".15rem 0" }}>
                                <strong>{e.summary}</strong> — {time} — {e.location}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}


