// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import "./TestModeIndicator.css";

export default function TestModeIndicator({ currentVersion, isNative }) {
    const [isTestMode, setIsTestMode] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setIsTestMode(false);
            return;
        }

        // Afficher l'indicateur UNIQUEMENT pour l'APK de test (canal de build),
        // peu importe la bascule locale destinée aux updates.
        const channel = (typeof window !== 'undefined' && window.__APP_CHANNEL) || process.env.NEXT_PUBLIC_ENV || 'prod';
        const isTestChannel = channel === 'test';
        setIsTestMode(isTestChannel);
    }, [currentVersion, isNative]);

    if (!isTestMode) {
        return null;
    }

    return (
        <div className="test-mode-indicator">
            <span className="test-mode-text">Version test</span>
        </div>
    );
}


