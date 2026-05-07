// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useDevMode } from '@/utils/env';
import styles from './DevToolsButton.module.css';
import HoverTooltip from '@/components/HoverTooltip';

/**
 * Bouton flottant qui apparaît uniquement en mode développement
 * Ouvre un modal avec les outils de développement
 */
export default function DevToolsButton() {
    const devMode = useDevMode();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [simulateEdtChange, setSimulateEdtChange] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setSimulateEdtChange(localStorage.getItem('DEV_SIMULATE_EDT_CHANGE') === '1');
    }, [isModalOpen]);

    // Ne rien afficher si pas en mode dev
    if (!devMode) {
        return null;
    }

    const handleTestAPI = async (apiPath) => {
        setLoading(true);
        setTestResults(null);
        
        try {
            const res = await fetch(apiPath);
            const data = await res.json();
            
            setTestResults({
                success: res.ok,
                status: res.status,
                data: JSON.stringify(data, null, 2)
            });
        } catch (err) {
            setTestResults({
                success: false,
                status: 'Error',
                data: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClearCache = () => {
        if (typeof window !== 'undefined') {
            localStorage.clear();
            sessionStorage.clear();
            alert('✅ Cache vidé avec succès !');
            window.location.reload();
        }
    };

    const handleToggleSimulateEdtChange = () => {
        if (typeof window === 'undefined') return;
        const next = localStorage.getItem('DEV_SIMULATE_EDT_CHANGE') !== '1';
        if (next) {
            localStorage.setItem('DEV_SIMULATE_EDT_CHANGE', '1');
        } else {
            localStorage.removeItem('DEV_SIMULATE_EDT_CHANGE');
        }
        setSimulateEdtChange(next);
        alert(
            next
                ? 'Simulation activée : au prochain chargement, l’app se comportera comme si le cache était obsolète (overlay + sync). Rechargez la page /.'
                : 'Simulation désactivée.'
        );
    };

    const handleCopyEnv = () => {
        const envTemplate = `# Supabase
SUPABASE_URL=votre_url_supabase
SUPABASE_SERVICE_ROLE=votre_service_role_key
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key

# ICS URL
ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
NEXT_PUBLIC_ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics

# Environment
NEXT_PUBLIC_ENV=DEV
NEXT_PUBLIC_APP_VERSION=1.0.0`;

        navigator.clipboard.writeText(envTemplate);
        alert('📋 Template .env.local copié !');
    };

    const devPages = [
        { name: '📅 ICS Brut', path: '/raw-ics' },
        { name: '📜 Historique', path: '/histo' },
        { name: '🔐 Debug Hash', path: '/debug-hash' }
    ];

    const quickAPIs = [
        { name: 'Fetch ICS', path: '/api/fetch-ics' },
        { name: 'Test Update', path: '/api/test-update' },
        { name: 'History', path: '/api/history' },
        { name: 'Debug Hash', path: '/api/debug-hash' }
    ];

    return (
        <>
            <HoverTooltip text="Outils de développement">
            <button 
                className={styles.devButton}
                onClick={() => setIsModalOpen(true)}
                aria-label="Outils de développement"
            >
                🛠️
            </button>
            </HoverTooltip>

            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>🛠️ Outils Dev</h2>
                            <button 
                                className={styles.closeButton}
                                onClick={() => setIsModalOpen(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className={styles.modalContent}>
                            {/* Actions rapides */}
                            <section className={styles.section}>
                                <h3>⚡ Actions</h3>
                                <div className={styles.buttonGrid}>
                                    <button onClick={handleClearCache} className={styles.actionBtn}>
                                        🗑️ Vider cache
                                    </button>
                                    <button onClick={handleCopyEnv} className={styles.actionBtn}>
                                        📋 Copier .env
                                    </button>
                                    <button onClick={() => handleTestAPI('/api/fetch-ics')} className={styles.actionBtn}>
                                        🔄 Test ICS
                                    </button>
                                    <button onClick={() => handleTestAPI('/api/test-update')} className={styles.actionBtn}>
                                        🧪 Test Update
                                    </button>
                                    <HoverTooltip text="Force le chemin « hash obsolète » comme en prod quand l’ICS change">
                                    <button
                                        type="button"
                                        onClick={handleToggleSimulateEdtChange}
                                        className={styles.actionBtn}
                                    >
                                        {simulateEdtChange ? '✅ Simuler changement EDT (actif)' : '🔁 Simuler changement EDT'}
                                    </button>
                                    </HoverTooltip>
                                </div>
                                <p style={{ fontSize: 12, opacity: 0.85, marginTop: 8 }}>
                                    Ou variable <code>NEXT_PUBLIC_SIMULATE_EDT_CHANGE=true</code> dans <code>.env.local</code>.
                                </p>
                            </section>

                            {/* Résultats de test */}
                            {testResults && (
                                <section className={styles.section}>
                                    <h3>📊 Résultat</h3>
                                    <div className={[styles.testResult, testResults.success ? styles.success : styles.error].filter(Boolean).join(' ')}>
                                        <div className={styles.testHeader}>
                                            <span>{testResults.success ? '✅' : '❌'} {testResults.status}</span>
                                        </div>
                                        <pre className={styles.testData}>{testResults.data}</pre>
                                    </div>
                                </section>
                            )}

                            {/* Pages */}
                            <section className={styles.section}>
                                <h3>📱 Pages</h3>
                                <div className={styles.linkList}>
                                    {devPages.map((page) => (
                                        <a 
                                            key={page.path}
                                            href={page.path}
                                            className={styles.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {page.name} →
                                        </a>
                                    ))}
                                </div>
                            </section>

                            {/* APIs */}
                            <section className={styles.section}>
                                <h3>🔌 APIs</h3>
                                <div className={styles.linkList}>
                                    {quickAPIs.map((api) => (
                                        <a 
                                            key={api.path}
                                            href={api.path}
                                            className={styles.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {api.name} →
                                        </a>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


