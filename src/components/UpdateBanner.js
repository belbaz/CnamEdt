"use client";
import {useState, useEffect, useCallback} from 'react';
import {useI18n} from '@/i18n/I18nContext';
import './UpdateBanner.css';

// Helper pour lire un cookie
function getCookie(name) {
    if (typeof document === 'undefined') {
        return null;
    }
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

// Helper pour définir un cookie
function setCookie(name, value, days = 7) {
    if (typeof document === 'undefined') {
        return;
    }
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Composant pour afficher une bannière de rechargement
 * S'affiche si :
 * - NEXT_PUBLIC_IS_UPDATE=true (variable d'environnement)
 * - Le cookie isUpdate existe
 * - window.isUpdate est défini
 * - Le paramètre URL ?isUpdate=true est présent
 */
export default function UpdateBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [isHiding, setIsHiding] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const {t} = useI18n();

    useEffect(() => {
        // Vérifier après l'hydratation pour éviter les erreurs SSR
        if (typeof window === 'undefined') return;

        // Vérifier la variable d'environnement NEXT_PUBLIC_IS_UPDATE
        const isUpdateFromEnv = typeof process !== 'undefined' &&
            process.env &&
            process.env.NEXT_PUBLIC_IS_UPDATE === 'true';

        // Si la variable d'environnement est définie, définir le cookie
        if (isUpdateFromEnv) {
            setCookie('isUpdate', 'true');
        }

        // Vérifier le cookie isUpdate
        const cookieValue = getCookie('isUpdate');
        const isUpdateFromCookie = cookieValue === 'true' || cookieValue !== null;

        // Vérifier aussi si isUpdate est défini globalement (window.isUpdate)
        const isUpdateFromGlobal = typeof window.isUpdate !== 'undefined' && window.isUpdate === true;

        // Vérifier aussi dans l'URL (paramètre ?isUpdate=true)
        const urlParams = new URLSearchParams(window.location.search);
        const isUpdateFromUrl = urlParams.get('isUpdate') === 'true';

        // Afficher la bannière si l'une des conditions est vraie
        if (isUpdateFromEnv || isUpdateFromCookie || isUpdateFromGlobal || isUpdateFromUrl) {
            setIsVisible(true);
        }
    }, []);

    const handleReload = useCallback(() => {
        setIsReloading(true);
        // Recharger la page
        window.location.reload();
    }, []);

    const handleDismiss = useCallback(() => {
        // Démarrer l'animation de sortie
        setIsHiding(true);
        // Supprimer le cookie si présent
        if (typeof document !== 'undefined') {
            document.cookie = 'isUpdate=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
        // Masquer complètement après la fin de l'animation
        setTimeout(() => {
            setIsVisible(false);
        }, 300); // Durée de l'animation slideOutBanner
    }, []);

    if (!isVisible) return null;

    return (
        <div className={`update-banner ${isHiding ? 'hiding' : ''}`}>
            <div className="update-banner-content">
                <div className="update-banner-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px">
                        <radialGradient id="U82P9tORUQOQwN6q6fq4Ja" cx="28.686" cy="21.073" r="17.032"
                                        gradientUnits="userSpaceOnUse">
                            <stop offset=".683" stopColor="#c24717"></stop>
                            <stop offset=".756" stopColor="#bb4417"></stop>
                            <stop offset=".862" stopColor="#a83b18"></stop>
                            <stop offset=".987" stopColor="#892c1a"></stop>
                            <stop offset="1" stopColor="#852a1a"></stop>
                        </radialGradient>
                        <path fill="url(#U82P9tORUQOQwN6q6fq4Ja)"
                              d="M32.002,8.271l0.162-0.496c0.33-1.011-0.184-2.12-1.18-2.493 C21.73,1.815,11.12,5.639,6.348,14.597c-3.137,5.89-3.031,12.643-0.305,18.212l5.354-2.71c-1.876-3.885-1.937-8.582,0.246-12.681 c3.363-6.314,10.947-9.173,18.085-7.811C30.717,9.795,31.69,9.228,32.002,8.271z"></path>
                        <radialGradient id="U82P9tORUQOQwN6q6fq4Jb" cx="-243.314" cy="-250.927" r="17.032"
                                        gradientTransform="rotate(180 -112 -112)" gradientUnits="userSpaceOnUse">
                            <stop offset=".683" stopColor="#c24717"></stop>
                            <stop offset=".756" stopColor="#bb4417"></stop>
                            <stop offset=".862" stopColor="#a83b18"></stop>
                            <stop offset=".987" stopColor="#892c1a"></stop>
                            <stop offset="1" stopColor="#852a1a"></stop>
                        </radialGradient>
                        <path fill="url(#U82P9tORUQOQwN6q6fq4Jb)"
                              d="M15.998,39.729l-0.162,0.496c-0.33,1.011,0.184,2.12,1.18,2.493 c9.253,3.467,19.864-0.357,24.635-9.315c3.137-5.89,3.031-12.643,0.305-18.212l-5.354,2.71c1.876,3.885,1.937,8.582-0.246,12.681 c-3.363,6.314-10.947,9.173-18.085,7.811C17.283,38.205,16.31,38.772,15.998,39.729z"></path>
                        <linearGradient id="U82P9tORUQOQwN6q6fq4Jc" x1="12.838" x2="34.961" y1="7.678" y2="40.027"
                                        gradientUnits="userSpaceOnUse">
                            <stop offset="0" stopColor="#fed100"></stop>
                            <stop offset="1" stopColor="#e36001"></stop>
                        </linearGradient>
                        <path fill="url(#U82P9tORUQOQwN6q6fq4Jc)"
                              d="M10,24c0,2.004,0.436,4.006,1.291,5.861l2.48-1.26c0.699-0.355,1.478,0.312,1.235,1.057 l-2.439,7.482c-0.214,0.656-0.919,1.014-1.575,0.8L3.51,35.501c-0.745-0.243-0.824-1.265-0.126-1.62l2.563-1.303 c-3.528-7.427-2.235-16.574,3.911-22.72C13.763,5.953,18.881,4,24,4C24,4,10,10,10,24z M44.49,12.499l-7.482-2.439 c-0.656-0.214-1.361,0.145-1.575,0.8l-2.439,7.482c-0.243,0.745,0.536,1.412,1.235,1.057l2.48-1.26C37.564,19.994,38,21.996,38,24 c0,14-14,20-14,20c5.119,0,10.237-1.952,14.142-5.857c6.146-6.146,7.439-15.293,3.911-22.72l2.563-1.303 C45.315,13.765,45.235,12.742,44.49,12.499z"></path>
                    </svg>
                </div>
                <div className="update-banner-text">
                    <strong>{t('updateBanner.title')}</strong>
                    <span>{t('updateBanner.message')}</span>
                </div>
                <div className="update-banner-actions">
                    <button
                        className="update-banner-button update-banner-button-secondary"
                        onClick={handleDismiss}
                        disabled={isReloading}
                    >
                        {t('updateBanner.later')}
                    </button>
                    <button
                        className="update-banner-button update-banner-button-primary"
                        onClick={handleReload}
                        disabled={isReloading}
                    >
                        {isReloading ? t('updateBanner.reloading') : t('updateBanner.reload')}
                    </button>

                </div>
            </div>
        </div>
    );
}

