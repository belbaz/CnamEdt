"use client";
import { useState, useEffect } from "react";
import "./EasterEgg.css";

export default function EasterEgg({ isActive, onClose }) {
    const [confettis, setConfettis] = useState([]);

    useEffect(() => {
        if (!isActive) {
            setConfettis([]);
            return;
        }

        // Créer beaucoup de confettis colorés
        const confettiCount = 80;
        const colors = ['#ef4444', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#38bdf8', '#facc15'];
        const shapes = ['circle', 'square', 'triangle'];
        const newConfettis = [];
        
        for (let i = 0; i < confettiCount; i++) {
            const randomX = Math.random() * 100; // Pourcentage de la largeur
            const randomDelay = Math.random() * 0.5; // Début entre 0 et 0.5s
            const randomDuration = 2.5 + Math.random() * 1; // Durée entre 2.5 et 3.5s
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
            const randomSize = 8 + Math.random() * 8; // Taille entre 8 et 16px
            const randomRotation = Math.random() * 360; // Rotation initiale
            
            newConfettis.push({
                id: i,
                x: randomX,
                delay: randomDelay,
                duration: randomDuration,
                color: randomColor,
                shape: randomShape,
                size: randomSize,
                rotation: randomRotation
            });
        }
        
        setConfettis(newConfettis);

        // Fermer automatiquement après 4 secondes
        const timer = setTimeout(() => {
            onClose();
        }, 4000);

        return () => clearTimeout(timer);
    }, [isActive, onClose]);

    if (!isActive) return null;

    return (
        <div className="easter-egg-overlay">
            {confettis.map(confetti => {
                const style = {
                    left: `${confetti.x}%`,
                    '--delay': `${confetti.delay}s`,
                    '--duration': `${confetti.duration}s`,
                    '--color': confetti.color,
                    '--size': `${confetti.size}px`,
                    '--rotation': `${confetti.rotation}deg`
                };
                return (
                    <div
                        key={confetti.id}
                        className={`confetti confetti-${confetti.shape}`}
                        style={style}
                    />
                );
            })}
        </div>
    );
}
