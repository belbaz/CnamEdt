// @ts-nocheck
"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/i18n/I18nContext";
import { getDayCoursesTimeProgressPercent } from "@/utils/timelineUtils";
import "./AnimatedCourseProgressLabel.css";

const LERP = 0.2;
const SNAP = 0.0008;

function formatProgressPercent(value, language) {
    const locale = language === "en" ? "en-US" : "fr-FR";
    return (
        new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value) + "\u00a0%"
    );
}

/**
 * Progression des cours du jour (durée réelle + cours en cours), rAF + lerp.
 * textContent direct : pas de setState à chaque frame. Clé stable sur le contenu des events.
 */
export default function AnimatedCourseProgressLabel({ events, fallbackPercent = 0, className = "" }) {
    const { language } = useI18n();
    const spanRef = useRef(null);
    const smoothRef = useRef(null);
    const eventsRef = useRef(events);
    const fallbackRef = useRef(fallbackPercent);
    eventsRef.current = events;
    fallbackRef.current = fallbackPercent;

    const eventsSerialized =
        events?.length > 0
            ? [...events]
                  .map((e) => `${e.start}|${e.end_time || e.end}`)
                  .sort()
                  .join(";")
            : "";

    useLayoutEffect(() => {
        const el = spanRef.current;
        if (!el) return;
        const targetRaw = getDayCoursesTimeProgressPercent(eventsRef.current, new Date());
        const target = targetRaw != null ? targetRaw : fallbackPercent;
        const clamped = Math.min(100, Math.max(0, target));
        smoothRef.current = clamped;
        el.textContent = formatProgressPercent(clamped, language);
    }, [eventsSerialized, language, fallbackPercent]);

    useEffect(() => {
        let rafId = 0;
        let timeoutId = 0;
        let cancelled = false;
        smoothRef.current = null;

        const clearTimers = () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (timeoutId) clearTimeout(timeoutId);
            rafId = 0;
            timeoutId = 0;
        };

        const tick = () => {
            if (cancelled) return;
            if (typeof document !== "undefined" && document.hidden) {
                timeoutId = window.setTimeout(() => {
                    timeoutId = 0;
                    rafId = requestAnimationFrame(tick);
                }, 750);
                return;
            }

            const targetRaw = getDayCoursesTimeProgressPercent(eventsRef.current, new Date());
            const target = targetRaw != null ? targetRaw : fallbackRef.current;
            const clamped = Math.min(100, Math.max(0, target));

            if (smoothRef.current == null) {
                smoothRef.current = clamped;
            } else {
                const diff = clamped - smoothRef.current;
                if (Math.abs(diff) < SNAP) {
                    smoothRef.current = clamped;
                } else {
                    smoothRef.current += diff * LERP;
                }
            }

            const el = spanRef.current;
            if (el) {
                el.textContent = formatProgressPercent(smoothRef.current, language);
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => {
            cancelled = true;
            clearTimers();
        };
    }, [eventsSerialized, language]);

    return (
        <span
            ref={spanRef}
            className={`animated-course-progress-label ${className}`.trim()}
            aria-live="polite"
            aria-atomic="true"
        />
    );
}
