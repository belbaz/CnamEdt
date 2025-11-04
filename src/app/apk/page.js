"use client";
import { useState } from 'react';
import './page.css';

/**
 * Page de téléchargement manuel de l'APK
 * Accessible via /apk
 * Affiche un bouton pour lancer explicitement le téléchargement
 */
export default function ApkManualDownloadPage() {
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);
    const [apkUrl, setApkUrl] = useState(null);

    const handleDownload = async () => {
        setError(null);
        setIsDownloading(true);
        try {
            const apiUrl = `/api/version`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error("Impossible de récupérer l'URL de l'APK");
            }
            const data = await response.json();
            const url = data.url;
            setApkUrl(url);

            const link = document.createElement('a');
            link.href = url;
            link.download = `edt_cnam_v${data.version}.apk`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            setError(e.message || 'Erreur inconnue');
        } finally {
            setIsDownloading(false);
        }
    };

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
                    Cliquez sur le bouton ci-dessous pour télécharger l'application sur votre appareil Android.
                </p>

                {error && (
                    <div className="apk-error">
                        {error}
                    </div>
                )}

                <div className="apk-button-group">
                    <button
                        className="apk-button apk-button-primary"
                        onClick={handleDownload}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <>
                                <span className="apk-loading-spinner"></span>
                                <span>Téléchargement en cours...</span>
                            </>
                        ) : (
                            <>
                                <span>⬇️</span>
                                <span>Télécharger l'APK</span>
                            </>
                        )}
                    </button>

                    {apkUrl && !error && !isDownloading && (
                        <div className="apk-info-card">
                            <p>Le téléchargement ne démarre pas ?</p>
                            <button
                                className="apk-button apk-button-secondary"
                                onClick={() => window.open(apkUrl, '_blank')}
                            >
                                Ouvrir dans un nouvel onglet
                            </button>
                        </div>
                    )}
                </div>

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


