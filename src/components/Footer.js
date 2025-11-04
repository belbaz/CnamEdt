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
    const [hasNativeVersion, setHasNativeVersion] = useState(false);
    const [isTest, setIsTest] = useState(false);

    // Récupérer la version installée (natif) ou distante (web)
    useEffect(() => {
        // Déterminer test mode (canal + bascule)
        const computeIsTest = () => {
            const channel = (typeof window !== 'undefined' && window.__APP_CHANNEL) || process.env.NEXT_PUBLIC_APP_CHANNEL || 'prod';
            const isTestChannel = channel === 'test';
            if (typeof window !== 'undefined') {
                const toggleValue = localStorage.getItem('updateTestMode');
                if (toggleValue === 'true') return setIsTest(true);
                if (toggleValue === 'false') return setIsTest(false);
            }
            setIsTest(isTestChannel);
        };
        computeIsTest();

        // Essayer de récupérer la version native si disponible (même si la détection isNative est tardive)
        (async () => {
            try {
                const dynamicImport = new Function('m', 'return import(m)');
                const { App } = await dynamicImport('@capacitor/app');
                const info = await App.getInfo();
                if (info && info.version) {
                    setVersion(info.version);
                    setHasNativeVersion(true);
                }
            } catch (_) {
                // Pas de Capacitor: on reste sur la logique web plus bas
            }
        })();
        if (isNative) {
            return;
        }

        const fetchVersion = () => {
            const apiUrl = `/api/version${isTest ? '?test=true' : ''}`;
            
            fetch(apiUrl)
                .then(res => res.json())
                .then(data => {
                    if (data.version && !hasNativeVersion) {
                        setVersion(data.version);
                    }
                })
                .catch(() => {
                    // En cas d'erreur, garder la version par défaut
                });
        };

        fetchVersion();

        // Rafraîchir quand le toggle change, même dans le même onglet
        const handleStorageChange = (e) => {
            if (e.key === 'updateTestMode') {
                computeIsTest();
                fetchVersion();
            }
        };
        const handleCustomToggle = () => {
            computeIsTest();
            fetchVersion();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('updateTestModeChanged', handleCustomToggle);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('updateTestModeChanged', handleCustomToggle);
        };
    }, [isNative, isTest, hasNativeVersion]);

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
