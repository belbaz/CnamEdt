"use client";

import { useEffect } from 'react';

export default function KeepAlive() {
    useEffect(() => {
        // Ping immédiat au montage pour s'assurer que la session est active
        fetch('/api/galao/ping').catch(() => {});

        // Ping toutes les minutes pour maintenir la session PHP 5.2 de Galao
        const interval = setInterval(() => {
            fetch('/api/galao/ping').catch(() => { });
            console.log("[KeepAlive] Ping Galao envoyé pour maintenir la session");
        }, 1000 * 60); // Toutes les minutes

        return () => clearInterval(interval);
    }, []);

    return null;
}
