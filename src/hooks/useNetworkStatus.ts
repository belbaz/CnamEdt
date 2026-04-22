// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Hook pour détecter le statut de la connexion réseau (web uniquement)
 */
export function useNetworkStatus() {
    // Initialiser directement avec navigator.onLine pour éviter le faux "online"
    // qui déclencherait fetchEvents() alors qu'on est hors-ligne
    const [isOnline, setIsOnline] = useState(() => {
        if (typeof navigator === 'undefined') return true;
        return navigator.onLine;
    });
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
                // Ping vers la route ICS pour vérifier la connexion
                // NOTE: HEAD n'est pas intercepté par le Service Worker (req.method !== 'GET')
                // → il va directement sur le réseau, ce qui est voulu pour un vrai ping
                await fetch('/api/fetch-ics', { 
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

        // Synchroniser avec navigator.onLine au cas où il aurait changé entre le render et l'effect
        const currentOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        setStatus(currentOnline);
        
        // Vérifier la connexion réelle au chargement (réseau vs cache SW)
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

