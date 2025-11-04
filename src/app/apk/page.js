"use client";
import { useState, useEffect } from 'react';
import './page.css';

/**
 * Page de téléchargement manuel de l'APK
 * Accessible via /apk
 * Affiche un lien direct pour télécharger l'APK
 */
export default function ApkManualDownloadPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [apkUrl, setApkUrl] = useState(null);
    const [apkVersion, setApkVersion] = useState(null);

    useEffect(() => {
        const fetchApkInfo = async () => {
            try {
                // Récupérer la version pour l'affichage uniquement
                const apiUrl = `/api/version`;
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error("Impossible de récupérer les informations de version");
                }
                const data = await response.json();
                // Utiliser directement /api/download/apk sans paramètre version
                // Le backend prendra automatiquement la dernière version
                setApkUrl('/api/download/apk');
                setApkVersion(data.version);
            } catch (e) {
                setError(e.message || 'Erreur inconnue');
            } finally {
                setLoading(false);
            }
        };

        fetchApkInfo();
    }, []);

    const handleBackHome = () => {
        window.location.href = '/';
    };

    return (
        <div className="apk-page">
            <div className="apk-container">
                <div className="apk-header">
                    <div className="apk-icon-wrapper">
                        📱
                    </div>
                    <h1 className="apk-title">Application Android</h1>
                    <p className="apk-subtitle">Téléchargez l'APK pour installer l'application</p>
                </div>

                <p className="apk-description">
                    Cliquez sur le lien ci-dessous pour télécharger l'application sur votre appareil Android.
                </p>

                {error && (
                    <div className="apk-error">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="apk-loading">
                        <span className="apk-loading-spinner"></span>
                        <span>Chargement...</span>
                    </div>
                )}

                {!loading && !error && apkUrl && (
                    <div className="apk-button-group">
                        <a
                            href={apkUrl}
                            download={`edt_cnam_v${apkVersion || 'latest'}.apk`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="apk-button apk-button-primary apk-download-link"
                        >
                            <span>⬇️</span>
                            <span>Télécharger l'APK</span>
                            {apkVersion && (
                                <span className="apk-version-badge">v{apkVersion}</span>
                            )}
                        </a>
                    </div>
                )}

                <button
                    className="apk-button apk-button-secondary apk-back-button"
                    onClick={handleBackHome}
                >
                    ← Retour à l'accueil
                </button>
            </div>
        </div>
    );
}


