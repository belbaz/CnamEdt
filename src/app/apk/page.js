"use client";
import { useState } from 'react';
import '../download/page.css';

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
            const isTestChannel = (process.env.NEXT_PUBLIC_APP_CHANNEL || 'prod') === 'test';
            let testMode = isTestChannel;
            if (typeof window !== 'undefined') {
                const toggleValue = localStorage.getItem('updateTestMode');
                if (toggleValue === 'true') testMode = true;
                if (toggleValue === 'false') testMode = false;
            }
            const apiUrl = `/api/version${testMode ? '?test=true' : ''}`;
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
        <div className="download-page">
            <div className="download-container">
                <div className="download-icon">📱</div>
                <h1 className="download-title">Télécharger l'application Android (APK)</h1>
                <p className="download-description">
                    Appuyez sur le bouton ci-dessous pour lancer le téléchargement de l'APK.
                </p>

                {error && (
                    <p className="download-description download-error">{error}</p>
                )}

                <button
                    className="download-button download-button-primary"
                    onClick={handleDownload}
                    disabled={isDownloading}
                >
                    {isDownloading ? 'Téléchargement…' : "Télécharger l'APK"}
                </button>

                {apkUrl && !error && !isDownloading && (
                    <div className="download-info">
                        <p>Si le téléchargement ne démarre pas :</p>
                        <button
                            className="download-button download-button-secondary"
                            onClick={() => window.open(apkUrl, '_blank')}
                        >
                            Télécharger manuellement
                        </button>
                    </div>
                )}

                <button
                    className="download-button download-button-secondary"
                    onClick={handleBackHome}
                >
                    Retour à l'accueil
                </button>
            </div>
        </div>
    );
}


