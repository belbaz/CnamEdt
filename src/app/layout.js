import "./global.css";
import {cookies} from "next/headers";

export const metadata = {
    title: "Mon Emploi du Temps - EICNAM",
    description: "Consultez votre emploi du temps EICNAM",
};

export default function RootLayout({children}) {
    const cookieStore = cookies();
    const darkModeCookie = cookieStore.get('darkMode')?.value;
    const isDark = darkModeCookie === 'true';
    return (
        <html lang="fr" className={isDark ? 'dark-mode' : undefined}>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0"/>
            <link rel="preconnect" href="https://fonts.googleapis.com"/>
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                  rel="stylesheet"/>
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
        </head>
        <body>{children}</body>
        </html>
    );
}

