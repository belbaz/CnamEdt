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

        // Canal de build (test/prod) + bascule locale
        const isTestChannel = (process.env.NEXT_PUBLIC_APP_CHANNEL || 'prod') === 'test';
        const updateTestMode = localStorage.getItem('updateTestMode') === 'true';
        setIsTestMode(isTestChannel || updateTestMode);
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

