import "./global.css";

export default function RootLayout({children}) {
    return (
        <html lang="fr">
        <head><title></title></head>
        <body>{children}</body>
        </html>
    );
}

