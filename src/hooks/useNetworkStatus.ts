// @ts-nocheck
"use client";
import { useLayoutEffect, useRef, useState } from "react";

/** Timeout HEAD si le navigateur prétend être en ligne (détecte « faux en ligne » / SW) */
const HEAD_PROBE_MS = 2200;

/**
 * Détection réseau pour l’app EDT :
 * - Si le navigateur annonce hors ligne → on débloque tout de suite (pas d’attente HEAD).
 * - Sinon → un HEAD court vers /api/fetch-ics (hors SW) valide la vraie connectivité.
 *
 * `connectivityReady` indique que cette première décision est faite (évite la fausse branche « en ligne »).
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [connectivityReady, setConnectivityReady] = useState(false);
    const abortRef = useRef(null);

    useLayoutEffect(() => {
        if (typeof window === "undefined" || typeof navigator === "undefined") {
            setConnectivityReady(true);
            return;
        }

        let cancelled = false;

        const setReady = () => {
            if (!cancelled) setConnectivityReady(true);
        };

        const setStatus = (online) => {
            if (!cancelled) setIsOnline(online);
        };

        const checkRealConnection = async () => {
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
            const controller = new AbortController();
            abortRef.current = controller;
            let timeoutId = 0;
            try {
                timeoutId = window.setTimeout(() => controller.abort(), HEAD_PROBE_MS);
                await fetch("/api/fetch-ics", {
                    method: "HEAD",
                    cache: "no-cache",
                    signal: controller.signal,
                });
                setStatus(true);
            } catch {
                setStatus(false);
            } finally {
                if (timeoutId) window.clearTimeout(timeoutId);
                abortRef.current = null;
                setReady();
            }
        };

        const onOffline = () => {
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
            setStatus(false);
            setReady();
        };

        const onOnline = () => {
            setStatus(true);
            window.setTimeout(() => {
                if (!cancelled) void checkRealConnection();
            }, 400);
        };

        // Hors ligne annoncé : affichage immédiat du cache EDT (pas de sonde bloquante).
        if (!navigator.onLine) {
            setStatus(false);
            setReady();
        } else {
            setStatus(true);
            void checkRealConnection();
        }

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);

        return () => {
            cancelled = true;
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
        };
    }, []);

    return { isOnline, connectivityReady };
}
