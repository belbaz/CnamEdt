// @ts-nocheck
"use client";

import {useEffect, useState} from "react";
import {usePathname} from "next/navigation";
import {useI18n} from "@/i18n/I18nContext";
import "./CookieConsent.css";

export default function CookieConsent() {
    const { t } = useI18n();
    const [visible, setVisible] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        // Ne jamais afficher la bannière sur la page de politique de confidentialité
        if (!pathname || pathname.startsWith("/politique-confidentialite")) {
            setVisible(false);
            return;
        }

        try {
            const stored = localStorage.getItem("cookieConsent");
            // On considère que seule la valeur "accepted" masque durablement la bannière.
            // Si l'utilisateur a refusé ou n'a jamais choisi, on ré-affiche la bannière.
            if (stored !== "accepted") {
                setVisible(true);
            }
        } catch (e) {
            // En cas de blocage du stockage, on ne force pas l'affichage en boucle
        }
    }, [pathname]);

    const handleAccept = () => {
        try {
            localStorage.setItem("cookieConsent", "accepted");
        } catch (e) {
            // Erreur silencieuse, l'acceptation restera valable pour la session courante
        }
        setVisible(false);
    };

    const handleDecline = () => {
        try {
            // On ne mémorise pas le refus : la bannière réapparaîtra au prochain chargement.
            // Si une ancienne valeur existe, on l'efface pour rester cohérent.
            localStorage.removeItem("cookieConsent");
        } catch (e) {
            // Erreur silencieuse
        }
        setVisible(false);
    };

    if (!visible) {
        return null;
    }

    return (
        <div className="cookie-consent-banner" role="dialog" aria-live="polite"
             aria-label="Bannière de consentement aux cookies">
            <div className="cookie-consent-content">
                <p className="cookie-consent-text">
                    {t('cookieConsent.text')}
                    <br />
                    {t('cookieConsent.noTracking')}
                    <br />
                    {t('cookieConsent.moreInfo')}{" "}
                    <a href="/politique-confidentialite" className="cookie-consent-link">
                        {t('cookieConsent.privacyPolicy')}
                    </a>.
                </p>
                <div className="cookie-consent-actions">
                    <button
                        type="button"
                        className="cookie-btn-secondary"
                        onClick={handleDecline}
                    >
                        {t('cookieConsent.decline')}
                    </button>
                    <button
                        type="button"
                        className="cookie-btn-primary"
                        onClick={handleAccept}
                    >
                        {t('cookieConsent.accept')}
                    </button>
                </div>
            </div>
        </div>
    );
}


