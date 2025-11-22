"use client";
import { useEffect, useRef } from 'react';
import { UAParser } from 'ua-parser-js';
import { useDevMode } from '@/utils/env';

const LOG_PREFIX = "[AnalyticsCollector]";

/**
 * Composant pour collecter et envoyer les métriques analytics
 * S'exécute automatiquement au chargement de la page
 */
export default function AnalyticsCollector() {
    const devMode = useDevMode();
    const sessionIdRef = useRef(null);
    const startTimeRef = useRef(Date.now());
    const hasSentRef = useRef(false);
    const siteVersionRef = useRef(null);

    // Fonction pour obtenir ou créer un ID de session
    const getOrCreateSessionId = async () => {
        // Vérifier d'abord dans les cookies
        if (typeof document !== 'undefined') {
            const cookies = document.cookie.split(';');
            const analyticsCookie = cookies.find(c => c.trim().startsWith('analytics_session_id='));
            if (analyticsCookie) {
                const sessionId = analyticsCookie.split('=')[1];
                sessionIdRef.current = sessionId;
                return sessionId;
            }
        }

        // Sinon, récupérer depuis l'API
        try {
            const response = await fetch('/api/analytics', {
                method: 'GET',
                cache: 'no-store'
            });
            if (response.ok) {
                const data = await response.json();
                sessionIdRef.current = data.session_id;
                return data.session_id;
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} Erreur récupération session ID:`, error);
        }

        // Fallback: générer un UUID simple
        return generateSimpleUUID();
    };

    // Générer un UUID simple (fallback)
    const generateSimpleUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // Fonction pour collecter les métriques
    const collectMetrics = () => {
        if (typeof window === 'undefined') return null;

        // Parser User Agent
        const parser = new UAParser();
        const ua = parser.getResult();

        // Détecter le type d'appareil
        const deviceType = (() => {
            const type = ua.device.type;
            if (type === 'mobile') return 'mobile';
            if (type === 'tablet') return 'tablet';
            if (type === undefined || type === null) {
                // Détection manuelle basée sur la taille d'écran
                const width = window.screen.width || window.innerWidth;
                if (width < 768) return 'mobile';
                if (width < 1024) return 'tablet';
                return 'desktop';
            }
            return 'desktop';
        })();

        // Récupérer la version du site
        // Essayer dans l'ordre : ref (depuis API), window.__APP_VERSION, package.json, ou 'unknown'
        const siteVersion = siteVersionRef.current || 
                          window.__APP_VERSION || 
                          (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_VERSION) || 
                          'unknown';

        return {
            user_agent: navigator.userAgent,
            device_name: ua.device.model || ua.device.vendor || 'unknown',
            device_type: deviceType,
            os_name: ua.os.name || 'unknown',
            os_version: ua.os.version || 'unknown',
            browser_name: ua.browser.name || 'unknown',
            browser_version: ua.browser.version || 'unknown',
            browser_language: navigator.language || navigator.userLanguage || 'unknown',
            screen_width: window.screen.width || null,
            screen_height: window.screen.height || null,
            viewport_width: window.innerWidth || null,
            viewport_height: window.innerHeight || null,
            site_version: siteVersion,
            page_url: window.location.href,
            referrer: document.referrer || null
        };
    };

    // Fonction pour calculer le temps passé sur la page
    const calculateTimeOnPage = () => {
        if (!startTimeRef.current) return 0;
        return Math.floor((Date.now() - startTimeRef.current) / 1000); // en secondes
    };

    // Fonction pour envoyer les analytics
    const sendAnalytics = async (isPageUnload = false) => {
        // Ne pas tracker en mode dev (sauf si explicitement autorisé)
        const allowDevMode = typeof window !== 'undefined' && 
            (window.location.search.includes('allow_analytics=true') || 
             localStorage.getItem('allow_analytics') === 'true');
        
        if (devMode && !allowDevMode) {
            return;
        }

        // Ne pas tracker les pages admin/analytics
        if (typeof window !== 'undefined' && window.location.pathname.includes('/admin/analytics')) {
            return;
        }

        if (hasSentRef.current && !isPageUnload) return; // Ne pas envoyer plusieurs fois sauf au unload

        try {
            const sessionId = sessionIdRef.current || await getOrCreateSessionId();
            if (!sessionId) {
                console.warn(`${LOG_PREFIX} Impossible d'obtenir un session ID`);
                return;
            }

            const metrics = collectMetrics();
            if (!metrics) {
                console.warn(`${LOG_PREFIX} Impossible de collecter les métriques`);
                return;
            }

            const timeOnPage = calculateTimeOnPage();

            const payload = {
                session_id: sessionId,
                ...metrics,
                time_on_page: timeOnPage
            };

            // Utiliser sendBeacon pour le unload (plus fiable)
            // Note: sendBeacon ne supporte pas les headers, donc on envoie directement le JSON stringifié
            if (isPageUnload && navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                const success = navigator.sendBeacon('/api/analytics', blob);
                if (success) {
                    console.log(`${LOG_PREFIX} Analytics envoyés via sendBeacon`);
                } else {
                    console.warn(`${LOG_PREFIX} Échec envoi via sendBeacon`);
                }
            } else {
                // Sinon, utiliser fetch normal
                const response = await fetch('/api/analytics', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    keepalive: true // Important pour les requêtes en background
                });

                if (response.ok) {
                    // console.log(`${LOG_PREFIX} Analytics envoyés avec succès`);
                    hasSentRef.current = true;
                } else {
                    console.warn(`${LOG_PREFIX} Erreur envoi analytics:`, response.status);
                }
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} Erreur envoi analytics:`, error);
        }
    };

    useEffect(() => {
        // Ne pas tracker en mode dev (sauf si explicitement autorisé pour les tests)
        const allowDevMode = typeof window !== 'undefined' && 
            (window.location.search.includes('allow_analytics=true') || 
             localStorage.getItem('allow_analytics') === 'true');
        
        if (devMode && !allowDevMode) {
            console.log(`${LOG_PREFIX} Mode dev détecté - tracking désactivé. Pour tester, ajoutez ?allow_analytics=true à l'URL ou localStorage.setItem('allow_analytics', 'true')`);
            return;
        }
        
        if (devMode && allowDevMode) {
            console.log(`${LOG_PREFIX} Mode dev mais analytics autorisés pour les tests`);
        }

        // Ne pas tracker les pages admin/analytics
        if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            if (currentPath.includes('/admin/analytics')) {
                console.log(`${LOG_PREFIX} Page admin/analytics détectée - tracking désactivé`);
                return; // Ne pas initialiser le tracking sur cette page
            }
        }

        // Initialiser le session ID
        getOrCreateSessionId().then(sessionId => {
            if (sessionId) {
                sessionIdRef.current = sessionId;
            }
        });

        // Récupérer la version du site depuis l'API
        const fetchSiteVersion = async () => {
            try {
                const response = await fetch('/api/version', {
                    method: 'GET',
                    cache: 'no-store'
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.version) {
                        siteVersionRef.current = data.version;
                    }
                }
            } catch (error) {
                console.warn(`${LOG_PREFIX} Impossible de récupérer la version depuis l'API:`, error);
            }
        };
        fetchSiteVersion();

        // Vérifier si on peut tracker (pas en mode dev OU autorisé pour les tests)
        const canTrack = !devMode || (typeof window !== 'undefined' && 
            (window.location.search.includes('allow_analytics=true') || 
             localStorage.getItem('allow_analytics') === 'true'));

        // Envoyer les analytics après un court délai (pour laisser le temps au DOM de charger et à la version d'être récupérée)
        const initialTimeout = setTimeout(() => {
            if (canTrack) {
                sendAnalytics();
            }
        }, 3000); // 3 secondes après le chargement (pour laisser le temps à la version d'être récupérée)

        // Envoyer les analytics toutes les 30 secondes (pour mettre à jour le temps sur page)
        const interval = setInterval(() => {
            if (canTrack) {
                sendAnalytics();
            }
        }, 30000);

        // Envoyer les analytics au unload de la page
        const handleBeforeUnload = () => {
            sendAnalytics(true);
        };

        // Envoyer les analytics lors du changement de visibilité (tab change, etc.)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                sendAnalytics(true);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            // Dernier envoi au cleanup (seulement si on peut tracker)
            const canTrack = !devMode || (typeof window !== 'undefined' && 
                (window.location.search.includes('allow_analytics=true') || 
                 localStorage.getItem('allow_analytics') === 'true'));
            if (canTrack) {
                sendAnalytics(true);
            }
        };
    }, [devMode]);

    // Ce composant ne rend rien
    return null;
}

