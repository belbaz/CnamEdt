'use client';

import { useEffect, useState } from 'react';
import BackButton from "@/components/BackButton";
import Spinner from "@/components/Spinner";

export default function MonitoringPage() {
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStatus = async () => {
        setLoading(true);
        setError(null);

        try {
            // Appeler l'API de test
            const response = await fetch('/api/test-update');
            const data = await response.json();

            if (response.ok) {
                setTestData(data);
            } else {
                setError(data.error || 'Erreur inconnue');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();

        // Rafraîchir toutes les 30 secondes
        const interval = setInterval(fetchStatus, 30000);

        return () => clearInterval(interval);
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'full',
            timeStyle: 'medium',
            timeZone: 'Europe/Paris'
        }).format(date);
    };

    const getTimeSince = (dateString) => {
        if (!dateString) return 'N/A';
        const now = new Date();
        const then = new Date(dateString);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
        if (diffHours > 0) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
        if (diffMins > 0) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
        return 'À l\'instant';
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '30px',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>
                        🤖 Monitoring Automatisation
                    </h1>
                    <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '16px' }}>
                        Système de mise à jour automatique de l'EDT CNAM
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '30px' }}>
                    {loading && !testData && (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Spinner size="large" variant="border" />
                            <p style={{ marginTop: '20px', color: '#666' }}>Chargement...</p>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            background: '#fee',
                            border: '2px solid #fcc',
                            borderRadius: '10px',
                            padding: '20px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ fontSize: '20px', marginBottom: '10px' }}>❌ Erreur</div>
                            <div style={{ color: '#c33' }}>{error}</div>
                        </div>
                    )}

                    {testData && (
                        <>
                            {/* Status Card */}
                            <div style={{
                                background: testData.success ? '#e8f5e9' : '#ffebee',
                                border: `2px solid ${testData.success ? '#4caf50' : '#f44336'}`,
                                borderRadius: '15px',
                                padding: '25px',
                                marginBottom: '25px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '10px' }}>
                                    {testData.success ? '✅' : '❌'}
                                </div>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: testData.success ? '#2e7d32' : '#c62828'
                                }}>
                                    {testData.message}
                                </div>
                            </div>

                            {/* Info Cards */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '20px',
                                marginBottom: '25px'
                            }}>
                                {/* Dernière mise à jour */}
                                <div style={{
                                    background: '#f5f5f5',
                                    borderRadius: '12px',
                                    padding: '20px'
                                }}>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#666',
                                        marginBottom: '8px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase'
                                    }}>
                                        📅 Dernière vérification
                                    </div>
                                    <div style={{
                                        fontSize: '16px',
                                        color: '#333',
                                        fontWeight: '500'
                                    }}>
                                        {testData.timestamp ? formatDate(testData.timestamp) : 'N/A'}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#999',
                                        marginTop: '5px'
                                    }}>
                                        {testData.timestamp ? getTimeSince(testData.timestamp) : 'N/A'}
                                    </div>
                                </div>

                                {/* Action */}
                                <div style={{
                                    background: '#f5f5f5',
                                    borderRadius: '12px',
                                    padding: '20px'
                                }}>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#666',
                                        marginBottom: '8px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase'
                                    }}>
                                        ⚙️ Action effectuée
                                    </div>
                                    <div style={{
                                        fontSize: '18px',
                                        color: '#333',
                                        fontWeight: '500'
                                    }}>
                                        {testData.action === 'created' ? 'Création' : 'Mise à jour'}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#999',
                                        marginTop: '5px'
                                    }}>
                                        Table: test_edt
                                    </div>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div style={{
                                background: '#e3f2fd',
                                border: '2px solid #90caf9',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>
                                    ℹ️ Comment ça marche ?
                                </div>
                                <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#555' }}>
                                    <li>L'API <code>/api/test-update</code> est appelée automatiquement toutes les heures</li>
                                    <li>Le timestamp est enregistré dans la table <code>test_edt</code></li>
                                    <li>Cette page se rafraîchit automatiquement toutes les 30 secondes</li>
                                    <li>Si le timestamp n'a pas changé depuis plus de 2 heures, vérifiez les logs Vercel</li>
                                </ul>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={fetchStatus}
                                    disabled={loading}
                                    style={{
                                        flex: '1',
                                        minWidth: '150px',
                                        padding: '15px 25px',
                                        background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        transition: 'transform 0.2s',
                                    }}
                                    onMouseEnter={(e) => !loading && (e.target.style.transform = 'scale(1.05)')}
                                    onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                                >
                                    {loading ? '⏳ Chargement...' : '🔄 Rafraîchir'}
                                </button>

                                <BackButton href="/dashboard" label="Retour au dashboard" title="Retour au dashboard" />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px',
                    background: '#f5f5f5',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px'
                }}>
                    <p style={{ margin: 0 }}>
                        📚 Consultez <code>AUTOMATISATION_GUIDE.md</code> pour plus d'informations
                    </p>
                </div>
            </div>
        </div>
    );
}

