// @ts-nocheck
"use client";
import { useEffect } from 'react';

/**
 * Hook pour le pull-to-refresh sur mobile (web)
 * Fonctionne sur tous les appareils tactiles et sur toutes les divs
 */
export function usePullToRefresh(onRefresh) {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let startY = 0;
        let startX = 0;
        let currentY = 0;
        let currentX = 0;
        let isPulling = false;
        let touchTarget = null;
        let touchStartScrollTop = 0;

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

        // Vérifier si on peut déclencher le pull-to-refresh depuis cette position
        const canPullToRefresh = (target) => {
            // Vérifier le scroll de la page principale
            if (window.scrollY > 10) {
                return false;
            }

            // Vérifier si on est dans un conteneur scrollable
            const scrollParent = getScrollParent(target);
            if (scrollParent) {
                // Permettre le pull-to-refresh seulement si le conteneur est en haut
                return scrollParent.scrollTop <= 10;
            }

            return true;
        };

        const handleTouchStart = (e) => {
            touchTarget = e.target;
            const touch = e.touches[0];
            
            // Vérifier si on peut déclencher le pull-to-refresh
            if (!canPullToRefresh(touchTarget)) {
                isPulling = false;
                return;
            }

            // Enregistrer la position de départ et le scroll actuel
            startY = touch.clientY;
            startX = touch.clientX;
            
            const scrollParent = getScrollParent(touchTarget);
            touchStartScrollTop = scrollParent ? scrollParent.scrollTop : window.scrollY;
            
            isPulling = true;
        };

        const handleTouchMove = (e) => {
            if (!isPulling) return;

            const touch = e.touches[0];
            currentY = touch.clientY;
            currentX = touch.clientX;

            const diffY = currentY - startY;
            const diffX = currentX - startX;

            // Vérifier qu'on n'a pas scrollé pendant le geste
            const scrollParent = getScrollParent(touchTarget);
            const currentScrollTop = scrollParent ? scrollParent.scrollTop : window.scrollY;
            
            if (Math.abs(currentScrollTop - touchStartScrollTop) > 5) {
                // L'utilisateur a scrollé, annuler le pull-to-refresh
                isPulling = false;
                return;
            }

            // Si le mouvement est plus horizontal que vertical, ce n'est pas un pull-to-refresh
            if (Math.abs(diffX) > Math.abs(diffY) * 1.5) {
                isPulling = false;
                return;
            }

            // Si on tire vers le bas et qu'on est bien en haut, empêcher le scroll normal
            if (diffY > 10) {
                // Vérifier qu'on est toujours en haut
                if (canPullToRefresh(touchTarget)) {
                    if (e.cancelable) {
                        e.preventDefault();
                    }
                    document.body.style.overscrollBehaviorY = 'contain';
                } else {
                    isPulling = false;
                }
            }
        };

        const handleTouchEnd = (e) => {
            if (!isPulling) {
                document.body.style.overscrollBehaviorY = 'auto';
                return;
            }

            const diffY = currentY - startY;

            // Si on a tiré assez (100px), déclencher le refresh
            if (diffY > 100 && canPullToRefresh(touchTarget)) {
                onRefresh();
            }

            document.body.style.overscrollBehaviorY = 'auto';
            isPulling = false;
            startY = 0;
            startX = 0;
            currentY = 0;
            currentX = 0;
            touchTarget = null;
            touchStartScrollTop = 0;
        };

        // Utiliser { passive: false } pour touchmove pour pouvoir faire preventDefault
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchcancel', handleTouchEnd);
            document.body.style.overscrollBehaviorY = 'auto';
        };
    }, [onRefresh]);
}

