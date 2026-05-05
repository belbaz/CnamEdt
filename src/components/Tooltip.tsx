// @ts-nocheck
"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Navbar.css";

export default function Tooltip({ children, text, show, enabled = true, scrollContainerRef = null }) {
    const tooltipRef = useRef(null);
    const wrapperRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0, placement: "top", arrowLeft: "50%" });
    /** Évite un flash en (0,0) avant la mesure synchrone dans useLayoutEffect */
    const [positionReady, setPositionReady] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useLayoutEffect(() => {
        if (!show || !enabled || !isMounted) {
            setPositionReady(false);
            return;
        }

        const updatePosition = () => {
            const wrapEl = wrapperRef.current;
            const tipEl = tooltipRef.current;
            if (!wrapEl || !tipEl) return;

            const wrapperRect = wrapEl.getBoundingClientRect();
            const margin = 8;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let tooltipRect = tipEl.getBoundingClientRect();

            if (tooltipRect.width > viewportWidth - 2 * margin) {
                tipEl.style.maxWidth = `${viewportWidth - 2 * margin}px`;
            } else {
                tipEl.style.maxWidth = "";
            }
            void tipEl.offsetHeight;
            tooltipRect = tipEl.getBoundingClientRect();

            const buttonCenterX = wrapperRect.left + wrapperRect.width / 2;

            let top = wrapperRect.bottom + margin;
            let left = wrapperRect.left + wrapperRect.width / 2 - tooltipRect.width / 2;
            let placement = "bottom";

            if (left < margin) {
                left = margin;
            }

            if (left + tooltipRect.width > viewportWidth - margin) {
                left = viewportWidth - tooltipRect.width - margin;
            }

            if (top + tooltipRect.height > viewportHeight - margin) {
                top = wrapperRect.top - tooltipRect.height - margin;
                placement = "top";
            }

            if (top < margin) {
                top = margin;
                placement = "top";
            }

            const finalTooltipWidth = tooltipRect.width;
            const arrowPosition = buttonCenterX - left;
            const arrowLeft = Math.max(12, Math.min(arrowPosition, finalTooltipWidth - 12));

            setPosition({ top, left, placement, arrowLeft: `${arrowLeft}px` });
            setPositionReady(true);
        };

        updatePosition();

        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);

        if (scrollContainerRef && scrollContainerRef.current) {
            scrollContainerRef.current.addEventListener("scroll", updatePosition);
        }

        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
            if (scrollContainerRef && scrollContainerRef.current) {
                scrollContainerRef.current.removeEventListener("scroll", updatePosition);
            }
            setPositionReady(false);
        };
    }, [show, enabled, isMounted, text, scrollContainerRef]);

    return (
        <div className="tooltip-wrapper" ref={wrapperRef}>
            {children}
            {show && enabled && isMounted &&
                createPortal(
                    <div
                        ref={tooltipRef}
                        className={`tooltip tooltip-${position.placement}`}
                        style={{
                            top: `${position.top}px`,
                            left: `${position.left}px`,
                            position: "fixed",
                            "--arrow-left": position.arrowLeft,
                            visibility: positionReady ? "visible" : "hidden",
                            animation: positionReady ? undefined : "none",
                        }}
                    >
                        {text}
                    </div>,
                    document.body
                )}
        </div>
    );
}
