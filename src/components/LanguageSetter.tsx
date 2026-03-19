// @ts-nocheck
"use client";
import { useEffect } from 'react';
import { useI18n } from '@/i18n/I18nContext';

/**
 * Composant pour mettre à jour l'attribut lang du HTML de manière synchrone
 * Doit être utilisé dans le layout pour éviter le flash de langue
 */
export default function LanguageSetter() {
    const { language } = useI18n();

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = language;
        }
    }, [language]);

    return null;
}


