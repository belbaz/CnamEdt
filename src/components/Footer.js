"use client";
import './Footer.css';
import {useCapacitor} from '@/hooks/useCapacitor';
import {useState, useEffect} from 'react';

export default function Footer() {
    const {isNative} = useCapacitor();
    const [version, setVersion] = useState(
        typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_VERSION
            ? process.env.NEXT_PUBLIC_APP_VERSION
            : "Loading ..."
    );
    const [isTest, setIsTest] = useState(false);

    // Récupérer la version depuis l'API (seulement si pas native)
    useEffect(() => {
        // Déterminer test mode (canal + bascule)
        const computeIsTest = () => {
            const isTestChannel = (process.env.NEXT_PUBLIC_APP_CHANNEL || 'prod') === 'test';
            const toggleTest = typeof window !== 'undefined' && localStorage.getItem('updateTestMode') === 'true';
            setIsTest(isTestChannel || toggleTest);
        };
        computeIsTest();

        if (isNative) {
            return; // Ne pas faire le fetch si native
        }

        const fetchVersion = () => {
            const apiUrl = `/api/version${isTest ? '?test=true' : ''}`;
            
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
                computeIsTest();
                fetchVersion();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [isNative, isTest]);

    return (
        <footer className="app-footer">
            <div className="app-footer-content">
                <span className="app-footer-text">EDT EICNAM</span>
                <span className="app-footer-separator">•</span>
                <span className="app-footer-version">Version {version}</span>
                {isTest && (
                    <>
                        <span className="app-footer-separator">•</span>
                        <span className="app-footer-test">test</span>
                    </>
                )}
            </div>
        </footer>
    );
}
