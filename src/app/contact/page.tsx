// @ts-nocheck
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UAParser } from 'ua-parser-js';
import Spinner from "@/components/Spinner";

function ContactRedirectContent() {
    const searchParams = useSearchParams();
    const [userInfo, setUserInfo] = useState(null);
    const [clientInfo, setClientInfo] = useState(null);
    const [version, setVersion] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const collectAndRedirect = async () => {
            try {
                // Récupérer le paramètre "from" pour savoir d'où on vient
                const from = searchParams?.get('from') || 'unknown';

                // Récupérer les informations utilisateur
                let user = null;
                try {
                    const userResponse = await fetch('/api/user', { cache: 'no-store' });
                    if (userResponse.ok) {
                        user = await userResponse.json();
                        setUserInfo(user);
                    }
                } catch (error) {
                    console.warn('[Contact] Erreur récupération user:', error);
                }

                // Récupérer l'IP
                let ipAddress = 'unknown';
                try {
                    const ipResponse = await fetch('/api/client-info', { cache: 'no-store' });
                    if (ipResponse.ok) {
                        const ipData = await ipResponse.json();
                        ipAddress = ipData.ip || 'unknown';
                        setClientInfo(ipData);
                    }
                } catch (error) {
                    console.warn('[Contact] Erreur récupération IP:', error);
                }

                // Récupérer la version
                try {
                    const versionResponse = await fetch('/api/version', { cache: 'no-store' });
                    if (versionResponse.ok) {
                        const versionData = await versionResponse.json();
                        setVersion(versionData.version);
                    }
                } catch (error) {
                    console.warn('[Contact] Erreur récupération version:', error);
                }

                // Collecter les informations techniques (comme dans AnalyticsCollector)
                const parser = new UAParser();
                const ua = parser.getResult();

                // Détecter le type d'appareil
                const deviceType = (() => {
                    const type = ua.device.type;
                    if (type === 'mobile') return 'mobile';
                    if (type === 'tablet') return 'tablet';
                    if (type === undefined || type === null) {
                        const width = window.screen.width || window.innerWidth;
                        if (width < 768) return 'mobile';
                        if (width < 1024) return 'tablet';
                        return 'desktop';
                    }
                    return 'desktop';
                })();

                // Détecter si PWA installée
                const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator.standalone === true);

                // Récupérer la version du site
                const siteVersion = version ||
                    window.__APP_VERSION ||
                    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_VERSION) ||
                    'unknown';

                // Construire le contexte avec toutes les infos
                const contextParts = [
                    `page: ${from}`
                ];

                // Informations utilisateur
                if (user && user.email) {
                    const userName = user.name || user.lastName
                        ? `${user.lastName || ''} ${user.name || ''}`.trim()
                        : 'Utilisateur';
                    contextParts.push(`User: ${userName} (${user.email})`);
                    if (user.role) {
                        contextParts.push(`Role: ${user.role}`);
                    }
                    if (user.id) {
                        contextParts.push(`UserID: ${user.id}`);
                    }
                } else {
                    contextParts.push("User: guest");
                }

                // Informations IP et réseau
                contextParts.push(`IP: ${ipAddress}`);

                // Informations techniques (comme analytics)
                contextParts.push(`App: v${siteVersion}`);
                contextParts.push(`Device: ${deviceType}`);
                if (ua.device.model || ua.device.vendor) {
                    const deviceName = `${ua.device.vendor || ''} ${ua.device.model || ''}`.trim() || 'unknown';
                    contextParts.push(`DeviceName: ${deviceName}`);
                }
                if (ua.browser.name) {
                    contextParts.push(`Browser: ${ua.browser.name}${ua.browser.version ? ` ${ua.browser.version}` : ''}`);
                }
                if (ua.os.name) {
                    contextParts.push(`OS: ${ua.os.name}${ua.os.version ? ` ${ua.os.version}` : ''}`);
                }
                if (navigator.language || navigator.userLanguage) {
                    contextParts.push(`Lang: ${navigator.language || navigator.userLanguage}`);
                }
                if (window.screen.width && window.screen.height) {
                    contextParts.push(`Screen: ${window.screen.width}x${window.screen.height}`);
                }
                if (window.innerWidth && window.innerHeight) {
                    contextParts.push(`Viewport: ${window.innerWidth}x${window.innerHeight}`);
                }
                if (isPWA) {
                    contextParts.push("PWA: installed");
                }
                if (window.innerWidth < 768) {
                    contextParts.push("Platform: mobile");
                }
                if (typeof window !== 'undefined' && window.location) {
                    contextParts.push(`URL: ${window.location.href}`);
                    if (document.referrer) {
                        contextParts.push(`Referrer: ${document.referrer}`);
                    }
                }
                if (navigator.userAgent) {
                    contextParts.push(`UA: ${navigator.userAgent.substring(0, 100)}...`);
                }
                contextParts.push(`Date: ${new Date().toISOString()}`);

                const contextValue = contextParts.join(" | ");

                // Créer et soumettre le formulaire
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = 'https://belbaz.vercel.app/api/contact-redirect';
                form.style.display = 'none';

                const sourceInput = document.createElement('input');
                sourceInput.type = 'hidden';
                sourceInput.name = 'source';
                sourceInput.value = 'myedt.vercel.app';
                form.appendChild(sourceInput);

                const contextInput = document.createElement('input');
                contextInput.type = 'hidden';
                contextInput.name = 'context';
                contextInput.value = contextValue;
                form.appendChild(contextInput);

                document.body.appendChild(form);
                form.submit();
            } catch (error) {
                console.error('[Contact] Erreur lors de la redirection:', error);
                setIsLoading(false);
            }
        };

        collectAndRedirect();
    }, [searchParams, version]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem'
        }}>
            <Spinner size="large" variant="border" />
            <p style={{ marginTop: '1rem', fontSize: '1rem' }}>Redirection vers le formulaire de contact...</p>
        </div>
    );
}

function ContactRedirectFallback() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem'
        }}>
            <Spinner size="large" variant="border" />
            <p style={{ marginTop: '1rem', fontSize: '1rem' }}>Chargement...</p>
        </div>
    );
}

export default function ContactPage() {
    return (
        <Suspense fallback={<ContactRedirectFallback />}>
            <ContactRedirectContent />
        </Suspense>
    );
}


