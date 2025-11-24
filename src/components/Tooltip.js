"use client";
import { useEffect, useRef, useState } from "react";
import "./Navbar.css";

export default function Tooltip({ children, text, show, enabled = true }) {
    const tooltipRef = useRef(null);
    const wrapperRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top', arrowLeft: '50%' });

    useEffect(() => {
        if (!show || !enabled || !tooltipRef.current || !wrapperRef.current) return;

        const updatePosition = () => {
            // Vérifier que les refs existent avant d'accéder à leurs propriétés
            if (!tooltipRef.current || !wrapperRef.current) return;
            
            const wrapperRect = wrapperRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const margin = 8;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Calculer la position du centre du bouton (ne change pas)
            const buttonCenterX = wrapperRect.left + (wrapperRect.width / 2);
            
            // Position par défaut : au-dessus, centré
            let top = wrapperRect.top - tooltipRect.height - margin;
            let left = wrapperRect.left + (wrapperRect.width / 2) - (tooltipRect.width / 2);
            let placement = 'top';
            
            // Ajuster horizontalement si ça dépasse à gauche
            if (left < margin) {
                left = margin;
            }

            // Ajuster horizontalement si ça dépasse à droite
            if (left + tooltipRect.width > viewportWidth - margin) {
                left = viewportWidth - tooltipRect.width - margin;
            }

            // Si ça dépasse en haut, mettre en dessous
            if (top < margin) {
                top = wrapperRect.bottom + margin;
                placement = 'bottom';
            }

            // Si ça dépasse toujours en bas, coller en haut de l'écran
            if (top + tooltipRect.height > viewportHeight - margin) {
                top = margin;
                placement = 'top';
            }

            // Si le tooltip est trop large, le centrer et réduire la largeur
            let finalTooltipWidth = tooltipRect.width;
            if (tooltipRect.width > viewportWidth - 2 * margin) {
                left = margin;
                tooltipRef.current.style.maxWidth = `${viewportWidth - 2 * margin}px`;
                // Attendre que le tooltip soit redimensionné pour recalculer
                finalTooltipWidth = Math.min(tooltipRect.width, viewportWidth - 2 * margin);
            }

            // Calculer la position de la flèche pour pointer vers le centre du bouton
            // La flèche doit être à la position du centre du bouton moins la position gauche du tooltip
            const arrowPosition = buttonCenterX - left;
            // Limiter la flèche entre 12px et finalTooltipWidth - 12px pour éviter qu'elle sorte du tooltip
            const arrowLeft = Math.max(12, Math.min(arrowPosition, finalTooltipWidth - 12));

            setPosition({ top, left, placement, arrowLeft: `${arrowLeft}px` });
        };

        // Attendre que le tooltip soit rendu pour calculer sa position
        const timeoutId = setTimeout(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(updatePosition);
            });
        }, 10);

        // Réajuster au scroll et resize
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [show, enabled]);

    return (
        <div className="tooltip-wrapper" ref={wrapperRef}>
            {children}
            {show && enabled && (
                <div
                    ref={tooltipRef}
                    className={`tooltip tooltip-${position.placement}`}
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        position: 'fixed',
                        '--arrow-left': position.arrowLeft,
                    }}
                >
                    {text}
                </div>
            )}
        </div>
    );
}

