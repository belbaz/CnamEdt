"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Hook pour détecter le statut de la connexion réseau (web uniquement)
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const pollingIntervalRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        const setStatus = (online) => {
            if (!cancelled) setIsOnline(online);
        };

        const checkRealConnection = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                await fetch('/api/version', { 
                    method: 'HEAD', 
                    cache: 'no-cache', 
                    signal: controller.signal 
                });
                clearTimeout(timeoutId);
                setStatus(true);
            } catch {
                setStatus(false);
            }
        };

        // État initial
        const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        setStatus(initialOnline);
        
        // Vérifier une fois au chargement
        checkRealConnection();

        // Écouter les événements online/offline
        const onOnline = () => {
            setStatus(true);
            // Vérifier la connexion réelle après un court délai
            setTimeout(checkRealConnection, 1000);
        };
        
        const onOffline = () => setStatus(false);

        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        return () => {
            cancelled = true;
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, []);

    return { isOnline };
}
