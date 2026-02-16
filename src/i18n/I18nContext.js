"use client";
import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';
import frTranslations from './translations/fr.json';
import enTranslations from './translations/en.json';

const translations = {
  fr: frTranslations,
  en: enTranslations
};

const I18nContext = createContext({
  language: 'fr',
  setLanguage: () => {},
  t: (key) => key
});

// Fonction pour obtenir la langue initiale de manière synchrone
function getInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'fr'; // SSR : toujours français par défaut
  }
  
  // D'abord, essayer de lire depuis window.__INITIAL_LANGUAGE__ (défini par le script inline)
  if (window.__INITIAL_LANGUAGE__ && (window.__INITIAL_LANGUAGE__ === 'fr' || window.__INITIAL_LANGUAGE__ === 'en')) {
    return window.__INITIAL_LANGUAGE__;
  }
  
  try {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      return savedLanguage;
    }
  } catch (e) {
    // Erreur silencieuse si localStorage n'est pas disponible
  }
  
  // Site démo : anglais par défaut (demo-edt.vercel.app)
  const isDemoSite = window.location?.hostname === 'demo-edt.vercel.app' ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MODE_DEMO === 'true');
  if (isDemoSite) {
    return 'en';
  }
  
  return 'fr';
}

export function I18nProvider({ children }) {
  // Pour l'hydratation SSR, commencer toujours avec 'fr' pour correspondre au serveur
  // La langue sera mise à jour immédiatement après le montage côté client
  const [language, setLanguageState] = useState('fr');
  const [isMounted, setIsMounted] = useState(false);

  // Charger la langue depuis window.__INITIAL_LANGUAGE__ ou localStorage de manière synchrone
  // Utiliser useLayoutEffect pour que la mise à jour se fasse avant le premier paint
  useLayoutEffect(() => {
    const savedLanguage = getInitialLanguage();
    if (savedLanguage !== language) {
      setLanguageState(savedLanguage);
    }
    setIsMounted(true);
    
    // Révéler le contenu une fois la langue chargée (évite le flash de langue)
    // On utilise requestAnimationFrame pour s'assurer que le DOM est à jour
    requestAnimationFrame(() => {
      document.body.classList.add('i18n-ready');
    });
  }, []);

  // Mettre à jour l'attribut lang du HTML de manière synchrone
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Sauvegarder la langue dans localStorage quand elle change
  const setLanguage = (lang) => {
    if (lang === 'fr' || lang === 'en') {
      setLanguageState(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang);
      }
    }
  };

  // Fonction de traduction avec support des clés imbriquées (ex: "settings.title")
  // Pendant l'hydratation, utiliser 'fr' pour correspondre au serveur
  // Après le montage, utiliser la langue sauvegardée
  const t = (key) => {
    const keys = key.split('.');
    // Utiliser 'fr' pendant l'hydratation pour correspondre au serveur
    // Après le montage, utiliser la langue sauvegardée (qui sera mise à jour immédiatement)
    const langToUse = isMounted ? language : 'fr';
    let value = translations[langToUse];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Si la clé n'existe pas, retourner la clé elle-même
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

