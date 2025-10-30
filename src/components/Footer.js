"use client";
import './Footer.css';
import { useCapacitor } from '@/hooks/useCapacitor';
import { useState, useEffect } from 'react';

export default function Footer() {
    const { isNative } = useCapacitor();
    const [version, setVersion] = useState("1.1.31");
    
    // Récupérer la version depuis l'API (seulement si pas native)
    useEffect(() => {
        if (isNative) {
            return; // Ne pas faire le fetch si native
        }
        
        fetch('/api/version')
            .then(res => res.json())
            .then(data => {
                if (data.version) {
                    setVersion(data.version);
                }
            })
            .catch(() => {
                // En cas d'erreur, garder la version par défaut
            });
    }, [isNative]);
    
    // Ne pas afficher dans l'app native
    if (isNative) {
        return null;
    }
    
    return (
        <footer className="app-footer">
            <div className="app-footer-content">
                <span className="app-footer-text">EDT EICNAM</span>
                <span className="app-footer-separator">•</span>
                <span className="app-footer-version">Version {version}</span>
            </div>
        </footer>
    );
}
