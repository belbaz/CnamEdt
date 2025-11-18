import "./global.css";

export const metadata = {
    title: "Edt EICNAM",
    description: "Consultez votre emploi du temps EICNAM",
};

export default function RootLayout({children}) {
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
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0"/>
            <link rel="preconnect" href="https://fonts.googleapis.com"/>
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                  rel="stylesheet"/>
            <script
                dangerouslySetInnerHTML={{__html: `
                    (function() {
                        try {
                            // Exposer le canal et la version au runtime (renforcé pour Capacitor/file:)
                            window.__APP_CHANNEL = ${JSON.stringify(process.env.NEXT_PUBLIC_ENV || 'prod')};
                            window.__APP_VERSION = ${JSON.stringify(process.env.NEXT_PUBLIC_APP_VERSION || '')};
                        } catch (e) {}
                    })();
                `}}
            />
            <script
                dangerouslySetInnerHTML={{__html: `
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
                dangerouslySetInnerHTML={{__html: `
                    (function() {
                        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                            // Ne pas enregistrer dans Capacitor natif
                            var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
                            // Enregistrer le Service Worker même en localhost (pour tester le mode hors ligne)
                            var host = (typeof location !== 'undefined') ? location.hostname : '';
                            var isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
                            
                            if (!isNative) {
                                window.addEventListener('load', function() {
                                    navigator.serviceWorker.register('/sw.js')
                                        .then(function(registration) {
                                            console.log('[SW] Service Worker enregistré:', registration.scope);
                                        })
                                        .catch(function(err) {
                                            console.warn('[SW] Erreur enregistrement Service Worker:', err);
                                        });
                                });
                            }
                        }
                    })();
                `}}
            />
        </head>
        <body>{children}</body>
        </html>
    );
}

