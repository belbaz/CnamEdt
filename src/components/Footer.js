"use client";
import './Footer.css';
import {useCapacitor} from '@/hooks/useCapacitor';
import {useState, useEffect} from 'react';

export default function Footer() {
    const {isNative} = useCapacitor();
    const [version, setVersion] = useState("Loading ...");

    // Récupérer la version depuis l'API (seulement si pas native)
    useEffect(() => {
        if (isNative) {
            return; // Ne pas faire le fetch si native
        }

        const fetchVersion = () => {
            // Vérifier si le mode test est activé (canal ou bascule)
            const isTestChannel = (process.env.NEXT_PUBLIC_APP_CHANNEL || 'prod') === 'test';
            const toggleTest = typeof window !== 'undefined' && localStorage.getItem('updateTestMode') === 'true';
            const testMode = isTestChannel || toggleTest;
            const apiUrl = `/api/version${testMode ? '?test=true' : ''}`;
            
            fetch(apiUrl)
                .then(res => res.json())
                .then(data => {
                    if (data.version) {
                        setVersion(data.version);
                    }
                })
                .catch(() => {
                    // En cas d'erreur, garder la version par défaut
                });
        };

        fetchVersion();

        // Écouter les changements du mode test pour recharger la version
        const handleStorageChange = (e) => {
            if (e.key === 'updateTestMode') {
                fetchVersion();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [isNative]);

    // Ne pas afficher dans l'app native
    if (isNative) {
        return null;
    }

    return (
        <footer className="app-footer">
            <div className="app-footer-content">
                <span className="app-footer-text">EDT EICNAM</span>
                <span className="app-footer-separator">•</span>
                <span className="app-footer-version">Version {version}</span>
            </div>
        </footer>
    );
}
