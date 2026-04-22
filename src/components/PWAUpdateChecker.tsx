// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nContext";
import "./PWAUpdateChecker.css";

const CACHE_ENV = process.env.NEXT_PUBLIC_ACTIVE_CACHE ?? process.env.ACTIVE_CACHE ?? "true";
const IS_CACHE_ENABLED_BUILD = String(CACHE_ENV).toLowerCase() !== "false";

const UPDATE_CHECK_INTERVAL_MS = 30_000;

function isCacheEnabledClient() {
    if (typeof window === "undefined") return false;
    return typeof window.__ACTIVE_CACHE !== "undefined"
        ? !!window.__ACTIVE_CACHE
        : IS_CACHE_ENABLED_BUILD;
}

/**
 * Bannière quand un nouveau Service Worker est installé mais pas encore actif (registration.waiting).
 * En prod, évite les courses updatefound / reg.update() et pousse des contrôles réguliers.
 *
 * En développement uniquement : ?pwaUpdate=true dans l’URL force l’affichage (aperçu UI, pas de vrai SW).
 */
export default function PWAUpdateChecker() {
    const { t } = useI18n();
    const [visible, setVisible] = useState(false);
    /** Aperçu local : http://localhost:3000/?pwaUpdate=true */
    const [devUrlPreview, setDevUrlPreview] = useState(false);
    const [reloading, setReloading] = useState(false);
    const registrationRef = useRef(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (process.env.NODE_ENV !== "development") return;
        const q = new URLSearchParams(window.location.search);
        if (q.get("pwaUpdate") === "true") setDevUrlPreview(true);
    }, []);

    const applyWaitingVisibility = useCallback((reg) => {
        if (!reg) return;
        registrationRef.current = reg;
        setVisible(!!reg.waiting);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
        if (process.env.NODE_ENV !== "production") return;
        if (!isCacheEnabledClient()) return;

        let cancelled = false;
        /** @type {ServiceWorkerRegistration | null} */
        let regForCleanup = null;
        /** @type {ReturnType<typeof setInterval> | null} */
        let intervalId = null;
        let onUpdateFound = null;
        let onFocus = null;
        let onVisible = null;

        const runUpdateCheck = async (reg) => {
            if (cancelled || !reg) return;
            try {
                await reg.update();
            } catch {
                /* ignore */
            }
            applyWaitingVisibility(reg);
        };

        const watchInstalling = (reg, worker) => {
            if (!worker) return;
            const bump = () => {
                if (cancelled) return;
                if (worker.state === "installed" && navigator.serviceWorker.controller) {
                    applyWaitingVisibility(reg);
                }
            };
            worker.addEventListener("statechange", bump);
            bump();
        };

        (async () => {
            const reg = await navigator.serviceWorker.getRegistration();
            if (cancelled || !reg) return;

            regForCleanup = reg;
            registrationRef.current = reg;

            onUpdateFound = () => {
                watchInstalling(reg, reg.installing);
            };
            reg.addEventListener("updatefound", onUpdateFound);

            if (reg.installing) {
                watchInstalling(reg, reg.installing);
            }

            applyWaitingVisibility(reg);
            await runUpdateCheck(reg);

            onFocus = () => runUpdateCheck(reg);
            window.addEventListener("focus", onFocus);

            onVisible = () => {
                if (document.visibilityState === "visible") runUpdateCheck(reg);
            };
            document.addEventListener("visibilitychange", onVisible);

            intervalId = setInterval(() => runUpdateCheck(reg), UPDATE_CHECK_INTERVAL_MS);
        })();

        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
            if (onFocus) window.removeEventListener("focus", onFocus);
            if (onVisible) document.removeEventListener("visibilitychange", onVisible);
            if (regForCleanup && onUpdateFound) {
                regForCleanup.removeEventListener("updatefound", onUpdateFound);
            }
        };
    }, [applyWaitingVisibility]);

    const handleReload = useCallback(() => {
        const reg = registrationRef.current;
        const isDevPreview =
            process.env.NODE_ENV === "development" && devUrlPreview && !reg?.waiting;

        if (isDevPreview) {
            setReloading(true);
            window.location.reload();
            return;
        }

        if (!reg?.waiting) return;

        setReloading(true);

        let done = false;
        const onControllerChange = () => {
            if (done) return;
            done = true;
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

        try {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
        } catch {
            setReloading(false);
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        }
    }, [devUrlPreview]);

    const handleDismiss = useCallback(() => {
        setVisible(false);
        setDevUrlPreview(false);
        if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
            const url = new URL(window.location.href);
            if (url.searchParams.get("pwaUpdate") === "true") {
                url.searchParams.delete("pwaUpdate");
                window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
            }
        }
    }, []);

    if (!visible && !devUrlPreview) return null;

    return (
        <div className="pwa-update-notification" role="status">
            <div className="pwa-update-content">
                <div className="pwa-update-icon" aria-hidden>
                    {/* Même picto que UpdateBanner (rechargement / mise à jour) — ids uniques si les deux sont au DOM */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={48} height={48}>
                        <radialGradient
                            id="pwaUpdateGradA"
                            cx="28.686"
                            cy="21.073"
                            r="17.032"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop offset=".683" stopColor="#c24717" />
                            <stop offset=".756" stopColor="#bb4417" />
                            <stop offset=".862" stopColor="#a83b18" />
                            <stop offset=".987" stopColor="#892c1a" />
                            <stop offset="1" stopColor="#852a1a" />
                        </radialGradient>
                        <path
                            fill="url(#pwaUpdateGradA)"
                            d="M32.002,8.271l0.162-0.496c0.33-1.011-0.184-2.12-1.18-2.493 C21.73,1.815,11.12,5.639,6.348,14.597c-3.137,5.89-3.031,12.643-0.305,18.212l5.354-2.71c-1.876-3.885-1.937-8.582,0.246-12.681 c3.363-6.314,10.947-9.173,18.085-7.811C30.717,9.795,31.69,9.228,32.002,8.271z"
                        />
                        <radialGradient
                            id="pwaUpdateGradB"
                            cx="-243.314"
                            cy="-250.927"
                            r="17.032"
                            gradientTransform="rotate(180 -112 -112)"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop offset=".683" stopColor="#c24717" />
                            <stop offset=".756" stopColor="#bb4417" />
                            <stop offset=".862" stopColor="#a83b18" />
                            <stop offset=".987" stopColor="#892c1a" />
                            <stop offset="1" stopColor="#852a1a" />
                        </radialGradient>
                        <path
                            fill="url(#pwaUpdateGradB)"
                            d="M15.998,39.729l-0.162,0.496c-0.33,1.011,0.184,2.12,1.18,2.493 c9.253,3.467,19.864-0.357,24.635-9.315c3.137-5.89,3.031-12.643,0.305-18.212l-5.354,2.71c1.876,3.885,1.937,8.582-0.246,12.681 c-3.363,6.314-10.947,9.173-18.085,7.811C17.283,38.205,16.31,38.772,15.998,39.729z"
                        />
                        <linearGradient
                            id="pwaUpdateGradC"
                            x1="12.838"
                            x2="34.961"
                            y1="7.678"
                            y2="40.027"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop offset="0" stopColor="#fed100" />
                            <stop offset="1" stopColor="#e36001" />
                        </linearGradient>
                        <path
                            fill="url(#pwaUpdateGradC)"
                            d="M10,24c0,2.004,0.436,4.006,1.291,5.861l2.48-1.26c0.699-0.355,1.478,0.312,1.235,1.057 l-2.439,7.482c-0.214,0.656-0.919,1.014-1.575,0.8L3.51,35.501c-0.745-0.243-0.824-1.265-0.126-1.62l2.563-1.303 c-3.528-7.427-2.235-16.574,3.911-22.72C13.763,5.953,18.881,4,24,4C24,4,10,10,10,24z M44.49,12.499l-7.482-2.439 c-0.656-0.214-1.361,0.145-1.575,0.8l-2.439,7.482c-0.243,0.745,0.536,1.412,1.235,1.057l2.48-1.26C37.564,19.994,38,21.996,38,24 c0,14-14,20-14,20c5.119,0,10.237-1.952,14.142-5.857c6.146-6.146,7.439-15.293,3.911-22.72l2.563-1.303 C45.315,13.765,45.235,12.742,44.49,12.499z"
                        />
                    </svg>
                </div>
                <div className="pwa-update-text">
                    <strong>{t("pwaUpdate.newVersion")}</strong>
                    <span>{t("pwaUpdate.reloadMessage")}</span>
                </div>
                <div className="pwa-update-actions">
                    <button
                        type="button"
                        className="pwa-update-button pwa-update-button-secondary"
                        onClick={handleDismiss}
                        disabled={reloading}
                    >
                        {t("pwaUpdate.later")}
                    </button>
                    <button
                        type="button"
                        className="pwa-update-button pwa-update-button-primary"
                        onClick={handleReload}
                        disabled={reloading}
                    >
                        {reloading ? t("pwaUpdate.reloading") : t("pwaUpdate.reload")}
                    </button>
                </div>
            </div>
        </div>
    );
}
