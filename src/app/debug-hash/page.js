"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function DebugHashPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        
        (async () => {
            try {
                const res = await fetch('/api/debug-hash', { cache: 'no-store' });
                const json = await res.json();
                
                if (!cancelled) {
                    if (json.error) {
                        setError(json.error);
                    } else {
                        setData(json);
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        })();
        
        return () => {
            cancelled = true;
        };
    }, []);

    const handleRefresh = () => {
        setLoading(true);
        setError(null);
        setData(null);
        
        fetch('/api/debug-hash', { cache: 'no-store' })
            .then(res => res.json())
            .then(json => {
                if (json.error) {
                    setError(json.error);
                } else {
                    setData(json);
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    };

    return (
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "1rem" }}>
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
                <h1 style={{ marginBottom: 0 }}>🔍 Debug Hash ICS</h1>
            </div>
            
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Cette page compare le hash du fichier ICS actuel avec le dernier hash enregistré en base de données.
            </p>

            <button
                onClick={handleRefresh}
                disabled={loading}
                style={{
                    background: 'var(--accent-color, #4CAF50)',
                    border: 'none',
                    color: 'white',
                    borderRadius: 8,
                    padding: '.75rem 1.5rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    marginBottom: '1rem',
                    opacity: loading ? 0.6 : 1
                }}
            >
                {loading ? 'Chargement...' : '🔄 Rafraîchir'}
            </button>

            {loading && <LoadingSpinner />}

            {error && (
                <div style={{
                    background: '#fee',
                    border: '2px solid #c00',
                    borderRadius: 12,
                    padding: '1rem',
                    color: '#c00',
                    marginBottom: '1rem'
                }}>
                    <strong>❌ Erreur:</strong> {error}
                </div>
            )}

            {!loading && data && (
                <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    padding: '1.5rem'
                }}>
                    <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        marginBottom: '1rem',
                        color: data.hash_match ? '#4CAF50' : '#FF9800'
                    }}>
                        {data.message}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <strong style={{ color: 'var(--text-primary)' }}>Hash actuel (ICS téléchargé) :</strong>
                            <div style={{
                                fontFamily: 'monospace',
                                fontSize: '0.9rem',
                                background: 'var(--bg-tertiary)',
                                padding: '0.5rem',
                                borderRadius: 8,
                                marginTop: '0.5rem',
                                wordBreak: 'break-all',
                                color: 'var(--text-secondary)'
                            }}>
                                {data.current_hash}
                            </div>
                        </div>

                        <div>
                            <strong style={{ color: 'var(--text-primary)' }}>Dernier hash en base de données :</strong>
                            <div style={{
                                fontFamily: 'monospace',
                                fontSize: '0.9rem',
                                background: 'var(--bg-tertiary)',
                                padding: '0.5rem',
                                borderRadius: 8,
                                marginTop: '0.5rem',
                                wordBreak: 'break-all',
                                color: 'var(--text-secondary)'
                            }}>
                                {data.last_hash || 'Aucun hash enregistré'}
                            </div>
                        </div>

                        {data.last_timestamp && (
                            <div>
                                <strong style={{ color: 'var(--text-primary)' }}>Dernière sauvegarde :</strong>
                                <div style={{
                                    fontSize: '0.9rem',
                                    marginTop: '0.5rem',
                                    color: 'var(--text-secondary)'
                                }}>
                                    {new Date(data.last_timestamp).toLocaleString('fr-FR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <strong style={{ color: 'var(--text-primary)' }}>Taille du fichier ICS :</strong>
                            <div style={{
                                fontSize: '0.9rem',
                                marginTop: '0.5rem',
                                color: 'var(--text-secondary)'
                            }}>
                                {(data.ics_length / 1024).toFixed(2)} Ko
                            </div>
                        </div>

                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 8,
                            fontSize: '0.9rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <strong>💡 Explication :</strong>
                            <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                                <li>Si les hashs sont <strong style={{ color: '#4CAF50' }}>identiques</strong> : le fichier ICS n'a pas changé, donc aucun cours ne devrait être réinséré en base.</li>
                                <li>Si les hashs sont <strong style={{ color: '#FF9800' }}>différents</strong> : le fichier ICS a changé, le système va comparer chaque cours individuellement et n'insérer que les modifications.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

