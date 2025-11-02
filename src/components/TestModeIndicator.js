"use client";
import { useState, useEffect } from "react";
import "./TestModeIndicator.css";

export default function TestModeIndicator({ currentVersion, isNative }) {
    const [isTestMode, setIsTestMode] = useState(false);

    useEffect(() => {
        if (!isNative || !currentVersion) {
            setIsTestMode(false);
            return;
        }

        // Vérifier dans localStorage si on a enregistré que c'est une version test
        // Sinon, vérifier si la version contient "test"
        const storedTestMode = typeof window !== 'undefined' && 
                              localStorage.getItem('isTestVersion') === 'true';
        const versionContainsTest = currentVersion.toLowerCase().includes('test');
        
        setIsTestMode(storedTestMode || versionContainsTest);
    }, [currentVersion, isNative]);

    if (!isNative || !isTestMode) {
        return null;
    }

    return (
        <div className="test-mode-indicator">
            <span className="test-mode-text">Mode : version test</span>
        </div>
    );
}

