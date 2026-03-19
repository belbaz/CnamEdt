// @ts-nocheck
"use client";

import {useI18n} from "@/i18n/I18nContext";
import styles from "./Spinner.module.css";

/**
 * Composant Spinner - Spinner de chargement réutilisable
 * @param {string} size - Taille du spinner: 'small' (16px), 'medium' (20px), 'large' (50px). Par défaut 'medium'
 * @param {string} variant - Variante: 'circular' (cercle SVG) ou 'border' (bordure CSS). Par défaut 'circular'
 * @param {string} className - Classe CSS supplémentaire (optionnel)
 * @param {string} ariaLabel - Label d'accessibilité (optionnel, par défaut traduit)
 */
export default function Spinner({ 
    size = 'medium',
    variant = 'circular',
    className = '',
    ariaLabel = null
}) {
    const { t } = useI18n();
    const defaultAriaLabel = ariaLabel || t('loading.default');
    const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];
    const variantClass = styles[variant];

    if (variant === 'circular') {
        const spinnerClassName = [styles.spinner, sizeClass, variantClass, className].filter(Boolean).join(' ');
        
        return (
            <div 
                className={spinnerClassName}
                role="status"
                aria-label={defaultAriaLabel}
                suppressHydrationWarning
            >
                <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <circle 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeDasharray="31.416" 
                        strokeDashoffset="31.416" 
                        opacity="0.3"
                    />
                    <circle 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeDasharray="31.416" 
                        strokeDashoffset="15.708" 
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        );
    }

    // Variant 'border' - spinner avec bordure CSS
    const borderSpinnerClassName = [styles.spinner, styles.border, sizeClass, className].filter(Boolean).join(' ');
    
    return (
        <div 
            className={borderSpinnerClassName}
            role="status"
            aria-label={defaultAriaLabel}
            suppressHydrationWarning
        >
            <div className={styles.borderSpinner}></div>
        </div>
    );
}


