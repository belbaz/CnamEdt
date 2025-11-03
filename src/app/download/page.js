"use client";
import { useEffect, useState } from 'react';
import './page.css';

/**
 * Page de téléchargement direct de l'APK
 * Accessible via /download
 * Télécharge automatiquement l'APK ou redirige vers l'URL si le téléchargement auto échoue
 */
export default function DownloadPage() {
    const [downloading, setDownloading] = useState(true);
    const [error, setError] = useState(null);
    const [apkUrl, setApkUrl] = useState(null);

    useEffect(() => {
        const downloadAPK = async () => {
            try {
                // Récupérer l'URL de l'APK depuis l'API version
                // Vérifier si le mode test est activé (canal ou bascule)
                const isTestChannel = (process.env.NEXT_PUBLIC_APP_CHANNEL || 'prod') === 'test';
                const toggleTest = typeof window !== 'undefined' && localStorage.getItem('updateTestMode') === 'true';
                const testMode = isTestChannel || toggleTest;
                const apiUrl = `/api/version${testMode ? '?test=true' : ''}`;
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    throw new Error('Impossible de récupérer les informations de version');
                }

                const data = await response.json();
                const url = data.url;
                
                setApkUrl(url);
                
                console.log('[Download Page] Téléchargement de:', url);

                // Créer un élément <a> pour déclencher le téléchargement
                const link = document.createElement('a');
                link.href = url;
                link.download = `edt_cnam_v${data.version}.apk`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                
                // Déclencher le téléchargement
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('[Download Page] Téléchargement déclenché');
                
                setDownloading(false);
            } catch (err) {
                console.error('[Download Page] Erreur:', err);
                setError(err.message);
                setDownloading(false);
            }
        };

        // Attendre un court instant avant de déclencher le téléchargement
        const timer = setTimeout(downloadAPK, 500);

        return () => clearTimeout(timer);
    }, []);

    const handleManualDownload = () => {
        if (apkUrl) {
            window.open(apkUrl, '_blank');
        }
    };

    const handleBackHome = () => {
        window.location.href = '/';
    };

    return (
        <div className="download-page">
            <div className="download-container">
                {downloading && !error && (
                    <>
                        <div className="download-icon">📥</div>
                        <h1 className="download-title">Téléchargement en cours...</h1>
                        <p className="download-description">
                            Le téléchargement de l'APK devrait commencer automatiquement.
                        </p>
                        <div className="download-spinner">
                            <div className="spinner"></div>
                        </div>
                    </>
                )}

                {!downloading && !error && (
                    <>
                        <div className="download-icon">✅</div>
                        <h1 className="download-title">Téléchargement démarré !</h1>
                        <p className="download-description">
                            Le fichier APK est en cours de téléchargement.
                        </p>
                        <div className="download-info">
                            <p>💡 Si le téléchargement n'a pas démarré :</p>
                            <button 
                                className="download-button download-button-primary"
                                onClick={handleManualDownload}
                            >
                                Télécharger manuellement
                            </button>
                        </div>
                        <div className="download-steps">
                            <h3>📱 Étapes d'installation :</h3>
                            <ol>
                                <li>Ouvrez le fichier APK téléchargé</li>
                                <li>Autorisez l'installation depuis des sources inconnues si demandé</li>
                                <li>Suivez les instructions à l'écran</li>
                            </ol>
                        </div>
                        <button 
                            className="download-button download-button-secondary"
                            onClick={handleBackHome}
                        >
                            Retour à l'accueil
                        </button>
                    </>
                )}

                {error && (
                    <>
                        <div className="download-icon">❌</div>
                        <h1 className="download-title">Erreur de téléchargement</h1>
                        <p className="download-description download-error">
                            {error}
                        </p>
                        {apkUrl && (
                            <button 
                                className="download-button download-button-primary"
                                onClick={handleManualDownload}
                            >
                                Réessayer le téléchargement
                            </button>
                        )}
                        <button 
                            className="download-button download-button-secondary"
                            onClick={handleBackHome}
                        >
                            Retour à l'accueil
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

