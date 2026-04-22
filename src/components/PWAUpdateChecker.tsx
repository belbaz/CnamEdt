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
 */
export default function PWAUpdateChecker() {
    const { t } = useI18n();
    const [visible, setVisible] = useState(false);
    const [reloading, setReloading] = useState(false);
    const registrationRef = useRef(null);

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
    }, []);

    const handleDismiss = useCallback(() => {
        setVisible(false);
    }, []);

    if (!visible) return null;

    return (
        <div className="pwa-update-notification" role="status">
            <div className="pwa-update-content">
                <div className="pwa-update-icon" aria-hidden>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M16 21h5v-5" />
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
