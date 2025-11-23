"use client";
import { useEffect } from 'react';

/**
 * Hook pour le pull-to-refresh sur mobile (web)
 * Fonctionne sur tous les appareils tactiles
 */
export function usePullToRefresh(onRefresh) {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let startY = 0;
        let currentY = 0;
        let isPulling = false;

        const handleTouchStart = (e) => {
            // Démarrer le pull uniquement si on est en haut de la page
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
                document.body.style.overscrollBehaviorY = 'contain';
            }
        };

        const handleTouchMove = (e) => {
            if (!isPulling || window.scrollY > 0) {
                isPulling = false;
                return;
            }

            currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            // Si on tire vers le bas, empêcher le scroll normal
            if (diff > 0) {
                e.preventDefault();
            }
        };

        const handleTouchEnd = (e) => {
            if (!isPulling) return;

            const diff = currentY - startY;

            // Si on a tiré assez (120px), déclencher le refresh
            if (diff > 120) {
                onRefresh();
            }

            document.body.style.overscrollBehaviorY = 'auto';
            isPulling = false;
            startY = 0;
            currentY = 0;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.body.style.overscrollBehaviorY = 'auto';
        };
    }, [onRefresh]);
}
