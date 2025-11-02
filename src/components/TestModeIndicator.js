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

        // Vérifier si le mode test est activé (5 clics sur copyright)
        const updateTestMode = localStorage.getItem('updateTestMode') === 'true';
        
        // Pour mobile uniquement, vérifier aussi si c'est une version test installée
        if (isNative) {
            const storedTestVersion = localStorage.getItem('isTestVersion') === 'true';
            const versionContainsTest = currentVersion?.toLowerCase().includes('test');
            setIsTestMode(updateTestMode || storedTestVersion || versionContainsTest);
        } else {
            // Pour le web, afficher seulement si le mode test est activé via copyright
            setIsTestMode(updateTestMode);
        }
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

