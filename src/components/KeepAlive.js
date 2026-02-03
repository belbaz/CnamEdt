"use client";

import { useEffect } from 'react';

export default function KeepAlive() {
    useEffect(() => {
        // Ping immédiat au montage
        // fetch('/api/galao/ping').catch(() => {});

        const interval = setInterval(() => {
            fetch('/api/galao/ping').catch(() => { });
            console.log("[KeepAlive] Ping Galao envoyé pour maintenir la session");
        }, 1000 * 60 * 15); // Toutes les 15 minutes

        return () => clearInterval(interval);
    }, []);

    return null;
}
