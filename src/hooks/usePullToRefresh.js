"use client";
import { useEffect } from 'react';

/**
 * Hook pour le pull-to-refresh natif Android avec Capacitor
 */
export function usePullToRefresh(isNative, onRefresh) {
    useEffect(() => {
        if (!isNative || typeof window === 'undefined') return;

        // Utiliser le pull-to-refresh natif d'Android via CSS overscroll-behavior
        // et gérer manuellement le gesture
        
        let startY = 0;
        let currentY = 0;
        let isPulling = false;

        // Pas d'indicateur visuel - utilise le comportement natif Android

        const handleTouchStart = (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
                document.body.style.overscrollBehaviorY = 'contain';
            }
        };

        const handleTouchMove = (e) => {
            if (!isPulling || window.scrollY > 0) return;

            currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            // Juste détecter le pull, laisser Android gérer l'UI
            if (diff > 0) {
                // Ne rien faire visuellement, Android gère
            }
        };

        const handleTouchEnd = (e) => {
            if (!isPulling) return;

            const diff = currentY - startY;

            if (diff > 120) {
                // Trigger refresh
                onRefresh();
            }

            document.body.style.overscrollBehaviorY = 'auto';
            isPulling = false;
            startY = 0;
            currentY = 0;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isNative, onRefresh]);
}
