import { useState, useEffect, useCallback } from 'react';

// Cache global partagé entre tous les composants
const fileCountsGlobalCache = {
    data: null,
    key: '',
    timestamp: 0
};

/**
 * Hook personnalisé pour récupérer les compteurs de fichiers avec mise en cache
 * 
 * Optimisations :
 * 1. Cache global partagé entre tous les composants
 * 2. Validation du cache pendant 5 minutes
 * 3. Évite les requêtes multiples pour les mêmes UIDs
 * 
 * @param {Array<string>} uids - Liste des UIDs de cours
 * @param {number} delay - Délai en ms avant de lancer la requête (optionnel, défaut: 0)
 * @returns {Object} - { fileCounts: {}, isLoading: boolean, error: null|Error }
 */
export function useFileCounts(uids = [], delay = 0) {
    const [fileCounts, setFileCounts] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchFileCounts = useCallback(async () => {
        if (!uids || uids.length === 0) {
            setFileCounts({});
            return;
        }

        // Créer une clé de cache basée sur les UIDs triés
        const cacheKey = [...uids].sort().join(',');
        
        // Vérifier le cache global (valide pendant 5 minutes)
        if (fileCountsGlobalCache.key === cacheKey) {
            const cacheAge = Date.now() - fileCountsGlobalCache.timestamp;
            if (cacheAge < 5 * 60 * 1000) { // 5 minutes
                setFileCounts(fileCountsGlobalCache.data || {});
                return;
            }
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setFileCounts(fileCountsGlobalCache.key === cacheKey ? fileCountsGlobalCache.data || {} : {});
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/files/batch-counts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ course_uids: uids })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                const counts = data.counts || {};
                setFileCounts(counts);
                
                // Mettre à jour le cache global
                fileCountsGlobalCache.data = counts;
                fileCountsGlobalCache.key = cacheKey;
                fileCountsGlobalCache.timestamp = Date.now();
            } else {
                throw new Error(data.error || 'Erreur inconnue');
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const likelyOffline =
                msg.includes('Failed to fetch') ||
                msg.includes('NetworkError') ||
                msg.includes('INTERNET_DISCONNECTED') ||
                msg.includes('Load failed');
            if (!likelyOffline) {
                console.error("[useFileCounts] Erreur chargement compteurs fichiers:", err);
            }
            setError(err instanceof Error ? err : new Error(String(err)));
            setFileCounts({});
        } finally {
            setIsLoading(false);
        }
    }, [uids]);

    useEffect(() => {
        // Si un délai est spécifié, attendre avant de lancer la requête
        if (delay > 0) {
            const timeoutId = setTimeout(() => {
                fetchFileCounts();
            }, delay);
            return () => clearTimeout(timeoutId);
        } else {
            fetchFileCounts();
        }
    }, [fetchFileCounts, delay]);

    return { fileCounts, isLoading, error };
}

/**
 * Fonction pour invalider manuellement le cache
 * Utile après l'upload ou la suppression d'un fichier
 */
export function invalidateFileCountsCache() {
    fileCountsGlobalCache.data = null;
    fileCountsGlobalCache.key = '';
    fileCountsGlobalCache.timestamp = 0;
}
