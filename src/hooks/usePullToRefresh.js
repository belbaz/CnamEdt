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
        let startX = 0;
        let currentY = 0;
        let currentX = 0;
        let isPulling = false;
        let isScrollableChild = false;

        // Fonction pour vérifier si un élément ou ses parents sont scrollables verticalement
        const getScrollParent = (node) => {
            if (node == null) {
                return null;
            }

            if (node === document.body || node === document.documentElement) {
                return null;
            }

            const overflowY = window.getComputedStyle(node).overflowY;
            const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

            if (isScrollable && node.scrollHeight > node.clientHeight) {
                return node;
            }

            return getScrollParent(node.parentNode);
        };

        const handleTouchStart = (e) => {
            // Réinitialiser l'état
            isPulling = false;
            isScrollableChild = false;

            // Vérifier si on touche un élément scrollable qui n'est pas en haut
            let target = e.target;
            let scrollParent = getScrollParent(target);

            // Si on est dans un conteneur scrollable et qu'il n'est pas tout en haut,
            // on ne doit jamais déclencher le pull-to-refresh
            if (scrollParent && scrollParent.scrollTop > 0) {
                isScrollableChild = true;
                return;
            }

            // Démarrer le pull uniquement si on est en haut de la page
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                startX = e.touches[0].clientX;
                isPulling = true;
                // On ne bloque pas encore le scroll, on attend de voir la direction du geste
            }
        };

        const handleTouchMove = (e) => {
            if (!isPulling || window.scrollY > 0 || isScrollableChild) {
                isPulling = false;
                return;
            }

            currentY = e.touches[0].clientY;
            currentX = e.touches[0].clientX;

            const diffY = currentY - startY;
            const diffX = currentX - startX;

            // Si le mouvement est plus horizontal que vertical, ce n'est pas un pull-to-refresh
            // C'est probablement un swipe ou un scroll horizontal
            if (Math.abs(diffX) > Math.abs(diffY)) {
                isPulling = false;
                return;
            }

            // Si on tire vers le bas, empêcher le scroll normal
            if (diffY > 0) {
                // Ajouter une résistance pour l'effet visuel (optionnel, ici on bloque juste)
                if (e.cancelable) {
                    e.preventDefault();
                }
                document.body.style.overscrollBehaviorY = 'contain';
            }
        };

        const handleTouchEnd = (e) => {
            if (!isPulling) return;

            const diffY = currentY - startY;

            // Si on a tiré assez (120px), déclencher le refresh
            if (diffY > 120) {
                onRefresh();
            }

            document.body.style.overscrollBehaviorY = 'auto';
            isPulling = false;
            startY = 0;
            startX = 0;
            currentY = 0;
            currentX = 0;
        };

        // Utiliser { passive: false } pour touchmove pour pouvoir faire preventDefault
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
