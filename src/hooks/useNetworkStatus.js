"use client";
import { useEffect, useRef, useState } from "react";
import { useCapacitor } from "@/hooks/useCapacitor";
import { Network } from '@capacitor/network';
/**
 * Cross-platform network status hook.
 * - Web: uses navigator.onLine + light fetch probe
 * - Mobile (Capacitor): uses @capacitor/network for reliable status
 */
export function useNetworkStatus() {
    const { isNative } = useCapacitor();
    const [isOnline, setIsOnline] = useState(true);
    const pollingIntervalRef = useRef(null);
    const lastOfflineNotifiedRef = useRef(0);

    useEffect(() => {
        let removeNetworkListener = null;
        let cancelled = false;

        const setStatus = (online) => {
            if (!cancelled) setIsOnline(online);
        };

        const setupWeb = () => {
            const checkRealConnection = async () => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    await fetch('/api/version', { method: 'HEAD', cache: 'no-cache', signal: controller.signal });
                    clearTimeout(timeoutId);
                    setStatus(true);
                } catch {
                    setStatus(false);
                }
            };

            const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
            setStatus(initialOnline);
            if (initialOnline) checkRealConnection();

            const onOnline = () => setStatus(true);
            const onOffline = () => setStatus(false);
            window.addEventListener('online', onOnline);
            window.addEventListener('offline', onOffline);

            if (!pollingIntervalRef.current) {
                pollingIntervalRef.current = setInterval(checkRealConnection, 10000);
            }

            removeNetworkListener = () => {
                window.removeEventListener('online', onOnline);
                window.removeEventListener('offline', onOffline);
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            };
        };

        const setupNative = async () => {
            try {
                const status = await Network.getStatus();
                setStatus(!!status?.connected);

                const listener = Network.addListener('networkStatusChange', (st) => {
                    setStatus(!!st?.connected);
                });
                removeNetworkListener = () => listener.remove();
            } catch (e) {
                // Fallback to web behavior if plugin unavailable
                setupWeb();
            }
        };

        if (isNative) setupNative();
        else setupWeb();

        return () => {
            cancelled = true;
            if (removeNetworkListener) removeNetworkListener();
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [isNative]);

    /**
     * Helper: trigger a Capacitor Local Notification once when offline.
     */
    const notifyOfflineMobileOnce = async (title = 'Mode hors ligne', body = "Certaines données peuvent être indisponibles.") => {
        if (!isNative) return false;
        const now = Date.now();
        if (now - lastOfflineNotifiedRef.current < 60_000) return false; // debounce 60s
        try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            const perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') {
                const req = await LocalNotifications.requestPermissions();
                if (req.display !== 'granted') return false;
            }
            await LocalNotifications.schedule({
                notifications: [{ id: 10001, title, body, smallIcon: 'ic_stat_name' }]
            });
            lastOfflineNotifiedRef.current = now;
            return true;
        } catch {
            return false;
        }
    };

    return { isOnline, notifyOfflineMobileOnce };
}


