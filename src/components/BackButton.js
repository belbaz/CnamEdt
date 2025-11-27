"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./BackButton.module.css";

/**
 * Composant BackButton - Bouton retour standardisé et réutilisable
 * @param {string} href - URL de destination (optionnel, par défaut router.back())
 * @param {string} className - Classe CSS supplémentaire (optionnel)
 * @param {string} title - Attribut title pour l'accessibilité (optionnel)
 * @param {function} onClick - Fonction onClick personnalisée (optionnel, remplace href si fourni)
 */
export default function BackButton({ 
    href = null,
    className = "",
    title = "Retour",
    onClick = null
}) {
    const router = useRouter();
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = () => {
        // Déclencher l'animation
        setIsAnimating(true);
        
        // Réinitialiser l'animation après qu'elle soit terminée
        setTimeout(() => {
            setIsAnimating(false);
        }, 400);

        // Exécuter l'action immédiatement (l'animation se joue en parallèle)
        if (onClick) {
            onClick();
        } else if (href) {
            router.push(href);
        } else {
            router.back();
        }
    };

    return (
        <button
            className={`${styles.backButton} ${isAnimating ? styles.animating : ''} ${className}`}
            onClick={handleClick}
            title={title}
            aria-label={title}
        >
            <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <path 
                    d="M19 12H5M5 12l6-6M5 12l6 6" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />
            </svg>
        </button>
    );
}

