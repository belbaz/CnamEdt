"use client";
import './Footer.css';
import {useState, useEffect} from 'react';

export default function Footer() {
    const [version, setVersion] = useState("Loading ...");

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const res = await fetch('/api/version');
                const data = await res.json();
                if (data.version) {
                    setVersion(data.version);
                } else {
                    setVersion("Unknown");
                }
            } catch (err) {
                console.error("Failed to fetch version:", err);
                setVersion("Error");
            }
        };

        fetchVersion();
    }, []); // ← exécute une seule fois au montage

    return (
        <footer className="app-footer">
            <div className="app-footer-content">
                <span className="app-footer-text">EDT EICNAM</span>
                <span className="app-footer-separator">•</span>
                {process.env.NEXT_PUBLIC_ENV === "DEV" ? (
                    <span className="app-footer-dev">DEVops</span>
                ) : (<></>)}
                <span className="app-footer-version">Version {version}</span>
            </div>
        </footer>
    );
}
