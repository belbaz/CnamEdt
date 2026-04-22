// @ts-nocheck
"use client";

import { useEffect } from "react";

const CACHE_ENV = process.env.NEXT_PUBLIC_ACTIVE_CACHE ?? process.env.ACTIVE_CACHE ?? "true";
const IS_CACHE_ENABLED_BUILD = String(CACHE_ENV).toLowerCase() !== "false";

/**
 * Enregistre public/sw.js pour le mode PWA / offline (app shell + cache API).
 *
 * En `next dev`, le Service Worker n’est **pas** utilisé : Turbopack change souvent les URLs des
 * chunks `_next/static/...`. Hors ligne, le SW ne trouve pas ces fichiers dans le cache et renvoie
 * 503 pour tout le JS/CSS → page cassée. En prod (`next build` + `next start`), les noms de
 * chunks sont stables pour un build donné et le mode hors ligne est cohérent.
 */
export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        // Développement : pas d’enregistrement + désinscription d’un SW résiduel (ex. après npm start)
        if (process.env.NODE_ENV === "development") {
            (async () => {
                try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map((r) => r.unregister()));
                } catch (e) {
                    console.warn("[SW] Désinscription (mode dev) :", e);
                }
            })();
            console.info(
                "[SW] Mode dev : Service Worker désactivé (Turbopack). " +
                    "Pour tester le hors-ligne : npm run build puis npm start."
            );
            return;
        }

        const cacheEnabled =
            typeof window.__ACTIVE_CACHE !== "undefined"
                ? !!window.__ACTIVE_CACHE
                : IS_CACHE_ENABLED_BUILD;

        if (!cacheEnabled) {
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js", {
                    scope: "/",
                    // Ne pas utiliser le cache HTTP pour décider si sw.js a changé (sinon prod « figée »)
                    updateViaCache: "none",
                });
                if (cancelled) return;
                console.log("[SW] Service Worker enregistré, scope :", registration.scope);
            } catch (e) {
                console.warn("[SW] Impossible d’enregistrer le Service Worker :", e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return null;
}
