// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import "./TestModeIndicator.css";

export default function TestModeIndicator({ currentVersion }) {
    const [isTestMode, setIsTestMode] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setIsTestMode(false);
            return;
        }

        // Afficher l'indicateur UNIQUEMENT pour le canal de test
        const channel = (typeof window !== 'undefined' && window.__APP_CHANNEL) || process.env.NEXT_PUBLIC_ENV || 'prod';
        const isTestChannel = channel === 'test';
        setIsTestMode(isTestChannel);
    }, [currentVersion]);

    if (!isTestMode) {
        return null;
    }

    return (
        <div className="test-mode-indicator">
            <span className="test-mode-text">Version test</span>
        </div>
    );
}


