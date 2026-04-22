// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nContext";
import "./PWAUpdateChecker.css";

const CACHE_ENV = process.env.NEXT_PUBLIC_ACTIVE_CACHE ?? process.env.ACTIVE_CACHE ?? "true";
const IS_CACHE_ENABLED_BUILD = String(CACHE_ENV).toLowerCase() !== "false";

function isCacheEnabledClient() {
    if (typeof window === "undefined") return false;
    return typeof window.__ACTIVE_CACHE !== "undefined"
        ? !!window.__ACTIVE_CACHE
        : IS_CACHE_ENABLED_BUILD;
}

/**
 * Bannière « nouvelle version » lorsqu’un Service Worker est en attente
 * (installé mais pas encore actif — public/sw.js attend SKIP_WAITING).
 * Production uniquement (aligné sur ServiceWorkerRegister).
 */
export default function PWAUpdateChecker() {
    const { t } = useI18n();
    const [visible, setVisible] = useState(false);
    const [reloading, setReloading] = useState(false);
    const registrationRef = useRef(null);

    const refreshRegistration = useCallback(async () => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
        if (process.env.NODE_ENV !== "production") return;
        if (!isCacheEnabledClient()) return;

        try {
            const reg = await navigator.serviceWorker.getRegistration();
            registrationRef.current = reg;
            if (!reg) {
                setVisible(false);
                return;
            }
            await reg.update();
            setVisible(!!reg.waiting);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
        if (process.env.NODE_ENV !== "production") return;
        if (!isCacheEnabledClient()) return;

        refreshRegistration();
        const interval = setInterval(refreshRegistration, 60_000);
        const onFocus = () => refreshRegistration();
        window.addEventListener("focus", onFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", onFocus);
        };
    }, [refreshRegistration]);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
        if (process.env.NODE_ENV !== "production") return;
        if (!isCacheEnabledClient()) return;

        let reg = null;

        const onUpdateFound = () => {
            const installing = reg?.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                    registrationRef.current = reg;
                    setVisible(!!reg.waiting);
                }
            });
        };

        navigator.serviceWorker.getRegistration().then((r) => {
            reg = r;
            registrationRef.current = r;
            if (r) r.addEventListener("updatefound", onUpdateFound);
        });

        return () => {
            if (reg) reg.removeEventListener("updatefound", onUpdateFound);
        };
    }, []);

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
