import "./global.css";
import AnalyticsCollector from "@/components/AnalyticsCollector";

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
                            var cookieMatch = document.cookie.match(/(?:^|; )darkMode=([^;]+)/);
                            var fromCookie = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
                            var fromStorage = localStorage.getItem('darkMode');
                            var dark = fromCookie != null ? (fromCookie === 'true') : (fromStorage === 'true');
                            if (dark) {
                                document.documentElement.classList.add('dark-mode');
                            } else {
                                document.documentElement.classList.remove('dark-mode');
                            }
                        } catch (e) {}
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
            <body>
                <AnalyticsCollector />
                {children}
            </body>
        </html>
    );
}

