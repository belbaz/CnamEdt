import "./global.css";
import AnalyticsCollector from "@/components/AnalyticsCollector";
import CookieConsent from "@/components/CookieConsent";
import LanguageSetter from "@/components/LanguageSetter";
import { I18nProvider } from "@/i18n/I18nContext";

const activeCacheEnv = process.env.NEXT_PUBLIC_ACTIVE_CACHE ?? process.env.ACTIVE_CACHE ?? 'true';
const IS_CACHE_ENABLED = String(activeCacheEnv).toLowerCase() !== 'false';

export const metadata = {
    title: "Edt EICNAM",
    description: "Consultez votre emploi du temps EICNAM",
};

export default function RootLayout({ children }) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <head>
                {/* Style critique pour éviter le flash de langue - cache le body jusqu'à ce que la langue soit chargée */}
                <style dangerouslySetInnerHTML={{__html: `
                    body:not(.i18n-ready) { opacity: 0 !important; }
                    body.i18n-ready { opacity: 1; }
                `}} />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="48x48" href="/favicon/favicon-48x48.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="192x192" href="/favicon/android-chrome-192x192.png" />
                <link rel="icon" type="image/png" sizes="512x512" href="/favicon/android-chrome-512x512.png" />
                <link rel="shortcut icon" href="/favicon/favicon.ico" />
                <link rel="manifest" href="/manifest.webmanifest" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
                <meta name="screen-orientation" content="portrait" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                    (function() {
                        // Verrouiller l'orientation en mode portrait sur mobile
                        if (typeof window !== 'undefined' && 'screen' in window && 'orientation' in window.screen) {
                            try {
                                if (window.screen.orientation && window.screen.orientation.lock) {
                                    window.screen.orientation.lock('portrait').catch(function(err) {
                                        // Ignorer les erreurs (certains navigateurs ne supportent pas)
                                    });
                                }
                            } catch (e) {
                                // API non disponible, ignorer
                            }
                        }
                    })();
                `}}
                />
                
                {/* Meta tags iOS pour PWA */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="EDT EICNAM" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="theme-color" content="#111827" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                    rel="stylesheet" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                    (function() {
                        try {
                            // Exposer le canal et la version au runtime (renforcé pour Capacitor/file:)
                            window.__APP_CHANNEL = ${JSON.stringify(process.env.NEXT_PUBLIC_ENV || 'prod')};
                            window.__APP_VERSION = ${JSON.stringify(process.env.NEXT_PUBLIC_APP_VERSION || '')};
                            window.__ACTIVE_CACHE = ${JSON.stringify(IS_CACHE_ENABLED)};
                        } catch (e) {}
                    })();
                `}}
                />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                    (function() {
                        try {
                            // Définir la langue de manière synchrone pour éviter le flash
                            var savedLanguage = localStorage.getItem('language');
                            if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
                                document.documentElement.lang = savedLanguage;
                                // Exposer la langue pour que React puisse l'utiliser immédiatement
                                window.__INITIAL_LANGUAGE__ = savedLanguage;
                            } else {
                                document.documentElement.lang = 'fr';
                                window.__INITIAL_LANGUAGE__ = 'fr';
                            }
                            
                            // Dark mode
                            var cookieMatch = document.cookie.match(/(?:^|; )darkMode=([^;]+)/);
                            var fromCookie = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
                            var fromStorage = localStorage.getItem('darkMode');
                            var dark = fromCookie != null ? (fromCookie === 'true') : (fromStorage === 'true');
                            if (dark) {
                                document.documentElement.classList.add('dark-mode');
                            } else {
                                document.documentElement.classList.remove('dark-mode');
                            }
                        } catch (e) {
                            // En cas d'erreur, définir les valeurs par défaut
                            document.documentElement.lang = 'fr';
                            window.__INITIAL_LANGUAGE__ = 'fr';
                        }
                    })();
                `}}
                />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                    (function() {
                        // Le Service Worker est maintenant géré par PWAUpdateChecker
                        // Ce script vérifie seulement si le cache doit être désactivé
                        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                            var cacheEnabled = (typeof window.__ACTIVE_CACHE !== 'undefined') ? !!window.__ACTIVE_CACHE : true;
                            
                            if (!cacheEnabled) {
                                // Désactiver le cache si demandé
                                window.addEventListener('load', function() {
                                    navigator.serviceWorker.getRegistrations()
                                        .then(function(registrations) {
                                            registrations.forEach(function(registration) {
                                                registration.unregister().catch(function(err) {
                                                    console.warn('[SW] Erreur deregister Service Worker:', err);
                                                });
                                            });
                                        })
                                        .catch(function(err) {
                                            console.warn('[SW] Impossible de récupérer les Service Workers:', err);
                                        });
                                    
                                    if ('caches' in window) {
                                        caches.keys()
                                            .then(function(names) {
                                                return Promise.all(names.map(function(name) { return caches.delete(name); }));
                                            })
                                            .catch(function(err) {
                                                console.warn('[SW] Suppression des caches impossible:', err);
                                            });
                                    }
                                    
                                    try {
                                        localStorage.removeItem('events');
                                        localStorage.removeItem('subjectColors');
                                        localStorage.removeItem('lastUpdateTimestamp');
                                    } catch (e) {}
                                });
                            }
                        }
                    })();
                `}}
                />
            </head>
            <body suppressHydrationWarning>
                <I18nProvider>
                    <LanguageSetter />
                    <AnalyticsCollector />
                    <CookieConsent />
                    {children}
                </I18nProvider>
            </body>
        </html>
    );
}

