// @ts-nocheck
"use client";
import {useState, useEffect, useRef} from "react";
import "./SettingsMenu.css";
import Toast from "./Toast";
import {useDevMode} from "../utils/env";
import {useI18n} from "../i18n/I18nContext";

const TABS = {
    DISPLAY: 'display',
    COLORS: 'colors',
    CONTACT: 'contact'
};

// Composant séparé pour le slider d'opacité
function SliderOpacity({ value, onChange, labelKey = 'colorIntensity', min = 0, max = 100 }) {
    const { t } = useI18n();
    const [localValue, setLocalValue] = useState(Math.round(value * 100));
    
    useEffect(() => {
        const rounded = Math.round(value * 100);
        // S'assurer que la valeur est dans les limites
        const clamped = Math.max(min, Math.min(max, rounded));
        setLocalValue(clamped);
        // Si la valeur était hors limites, la corriger
        if (rounded !== clamped && onChange) {
            onChange(clamped / 100);
        }
    }, [value, min, max, onChange]);
    
    const handleChange = (e) => {
        const newValue = parseInt(e.target.value, 10);
        const clampedValue = Math.max(min, Math.min(max, newValue));
        setLocalValue(clampedValue);
        if (onChange) {
            onChange(clampedValue / 100);
        }
    };
    
    return (
        <div className="setting-item slider-item">
            <div className="slider-label">
                <span>{t(`settings.${labelKey}`)}</span>
                <span className="slider-value">{localValue}%</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={5}
                value={localValue}
                onChange={handleChange}
                className="slider"
            />
        </div>
    );
}

export default function SettingsMenu({
                                         onOpenChange,
                                         compactMode,
                                         isMobile = false,
                                         isPWAInstalled = false,
                                         currentVersion = null,
                                         showTimeLabels = true,
                                         onToggleTimeLabels = null,
                                         hide15MinSpacing = false,
                                         onToggle15MinSpacing = null,
                                         showTimeRemaining = true,
                                         onToggleTimeRemaining = null,
                                         showTooltips = true,
                                         onToggleTooltips = null,
                                         colorPosition = 'background',
                                         onColorPositionChange = null,
                                         colorBackgroundOpacity = 0.6,
                                         onColorBackgroundOpacityChange = null,
                                         timePassedOverlayIntensity = 0.5,
                                         onTimePassedOverlayIntensityChange = null
                                     }) {
    const { t, language, setLanguage } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(TABS.DISPLAY);
    const [toastMessage, setToastMessage] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [version, setVersion] = useState(currentVersion || null);
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [showColorPositionDropdown, setShowColorPositionDropdown] = useState(false);
    const copyrightClickCount = useRef(0);
    const copyrightClickTimeout = useRef(null);
    const languageSelectorRef = useRef(null);
    const colorPositionSelectorRef = useRef(null);
    const devMode = useDevMode();
    
    // Fermer la dropdown de langue quand on clique en dehors
    useEffect(() => {
        if (!showLanguageDropdown) return;
        
        const handleClickOutside = (event) => {
            if (languageSelectorRef.current && !languageSelectorRef.current.contains(event.target)) {
                setShowLanguageDropdown(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showLanguageDropdown]);

    // Fermer la dropdown de position de couleur quand on clique en dehors
    useEffect(() => {
        if (!showColorPositionDropdown) return;
        
        const handleClickOutside = (event) => {
            if (colorPositionSelectorRef.current && !colorPositionSelectorRef.current.contains(event.target)) {
                setShowColorPositionDropdown(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showColorPositionDropdown]);
    
    // Le bouton update reste visible sur mobile/PWA
    const showUpdateButton = devMode ? true : (isMobile || isPWAInstalled);

    // Récupérer la version depuis l'API ou utiliser currentVersion
    useEffect(() => {
        if (currentVersion) {
            setVersion(currentVersion);
        } else if (!isPWAInstalled && typeof window !== 'undefined') {
            // Pour le web, récupérer depuis l'API (canal unique)
            const apiUrl = `/api/version`;
            fetch(apiUrl)
                .then(res => res.json())
                .then(data => {
                    if (data.version) {
                        setVersion(data.version);
                    }
                })
                .catch(() => {
                    // En cas d'erreur, garder null
                });
        }
    }, [isPWAInstalled, currentVersion]);


    useEffect(() => {
        if (typeof onOpenChange === 'function') {
            onOpenChange(isOpen);
        }
    }, [isOpen, onOpenChange]);

    // Fermer avec la touche Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Bloquer le scroll de la page quand la modale est ouverte
    // Fermer le menu de langue en cliquant à l'extérieur
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showLanguageDropdown && !event.target.closest('.language-selector-settings')) {
                setShowLanguageDropdown(false);
            }
        };

        if (showLanguageDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showLanguageDropdown]);

    useEffect(() => {
        if (isOpen) {
            // Sauvegarder la position du scroll actuelle
            const scrollY = window.scrollY;

            // Ajouter la classe pour forcer le background gradient
            document.body.classList.add('modal-open');

            // Bloquer le scroll
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';

            return () => {
                // Retirer la classe
                document.body.classList.remove('modal-open');

                // Restaurer le scroll quand la modale est fermée
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';

                // Restaurer la position du scroll
                window.scrollTo(0, scrollY);
            };
        }
    }, [isOpen]);

    // Désactiver l'easter egg: aucun basculement via copyright désormais
    const handleCopyrightClick = () => {
    };

    return (
        <>
            <button
                className="settings-button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={t('settings.title')}
            >
                <img src="/settings.svg" alt={t('settings.title')} width="22" height="22" aria-hidden="true"/>
            </button>

            {isOpen && (
                <>
                    <div className="settings-overlay" onClick={() => setIsOpen(false)}/>
                    <div className="settings-menu">
                        <div className="settings-header">
                            <h3>{t('settings.title')}</h3>
                            <button className="settings-close" onClick={() => setIsOpen(false)}>✕</button>
                        </div>

                        <div className="settings-content">
                            {/* Onglets */}
                            <div className="settings-tabs">
                                <button
                                    className={`settings-tab ${activeTab === TABS.DISPLAY ? 'active' : ''}`}
                                    onClick={() => setActiveTab(TABS.DISPLAY)}
                                >
                                    {t('settings.display')}
                                </button>
                                <button
                                    className={`settings-tab ${activeTab === TABS.COLORS ? 'active' : ''}`}
                                    onClick={() => setActiveTab(TABS.COLORS)}
                                >
                                    {t('settings.colors')}
                                </button>
                                <button
                                    className={`settings-tab ${activeTab === TABS.CONTACT ? 'active' : ''}`}
                                    onClick={() => setActiveTab(TABS.CONTACT)}
                                >
                                    {t('settings.contact')}
                                </button>
                            </div>

                            {/* Contenu des onglets */}
                            <div className="settings-tab-content">
                                {activeTab === TABS.DISPLAY && (
                                    <div className="settings-tab-panel">
                                        <div className="setting-item">
                                            <label>
                                                <span style={{marginRight: '0.5rem'}}>{t('settings.language')}</span>
                                            </label>
                                            <div className="language-selector-settings" ref={languageSelectorRef}>
                                                <button
                                                    type="button"
                                                    className="language-button-settings"
                                                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                                                    aria-expanded={showLanguageDropdown}
                                                    aria-haspopup="true"
                                                >
                                                    <span className="language-button-text-settings">
                                                        {language === 'fr' ? t('settings.languageFrench') : t('settings.languageEnglish')}
                                                    </span>
                                                    <span className="language-button-icon-settings">
                                                        {showLanguageDropdown ? '▲' : '▼'}
                                                    </span>
                                                </button>
                                                {showLanguageDropdown && (
                                                    <div className="language-dropdown-settings">
                                                        <button
                                                            type="button"
                                                            className={`language-option-settings ${language === 'fr' ? 'language-option-active-settings' : ''}`}
                                                            onClick={() => {
                                                                setLanguage('fr');
                                                                setShowLanguageDropdown(false);
                                                            }}
                                                        >
                                                                <span className="language-option-flag-settings">
                                                                    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        <rect width="8" height="18" fill="#1E40AF"/>
                                                                        <rect x="8" width="8" height="18" fill="#FFFFFF"/>
                                                                        <rect x="16" width="8" height="18" fill="#DC2626"/>
                                                                    </svg>
                                                                </span>
                                                            <span className="language-option-text-settings">{t('settings.languageFrench')}</span>
                                                            {language === 'fr' && <span className="language-option-check-settings">✓</span>}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`language-option-settings ${language === 'en' ? 'language-option-active-settings' : ''}`}
                                                            onClick={() => {
                                                                setLanguage('en');
                                                                setShowLanguageDropdown(false);
                                                            }}
                                                        >
                                                                <span className="language-option-flag-settings">
                                                                    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        <rect width="24" height="18" fill="#1E3A8A"/>
                                                                        <path d="M0 0L24 18M24 0L0 18" stroke="white" strokeWidth="2.4"/>
                                                                        <path d="M0 0L24 18M24 0L0 18" stroke="#DC2626" strokeWidth="1.6"/>
                                                                        <path d="M12 0V18M0 9H24" stroke="white" strokeWidth="3.2"/>
                                                                        <path d="M12 0V18M0 9H24" stroke="#DC2626" strokeWidth="2"/>
                                                                    </svg>
                                                                </span>
                                                            <span className="language-option-text-settings">{t('settings.languageEnglish')}</span>
                                                            {language === 'en' && <span className="language-option-check-settings">✓</span>}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="setting-item">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={showTimeLabels}
                                                    onChange={(e) => onToggleTimeLabels && onToggleTimeLabels(e.target.checked)}
                                                />
                                                <span>{t('settings.showTimeLabels')}</span>
                                            </label>
                                        </div>

                                        <div className="setting-item">
                                            <label htmlFor="hide15MinSpacing-checkbox">
                                                <input
                                                    id="hide15MinSpacing-checkbox"
                                                    type="checkbox"
                                                    checked={hide15MinSpacing}
                                                    onChange={(e) => onToggle15MinSpacing && onToggle15MinSpacing(e.target.checked)}
                                                />
                                                <span>{t('settings.hide15MinSpacing')}</span>
                                            </label>
                                        </div>

                                        <div className="setting-item">
                                            <label htmlFor="showTimeRemaining-checkbox">
                                                <input
                                                    id="showTimeRemaining-checkbox"
                                                    type="checkbox"
                                                    checked={showTimeRemaining}
                                                    onChange={(e) => onToggleTimeRemaining && onToggleTimeRemaining(e.target.checked)}
                                                />
                                                <span>{t('settings.showTimeRemaining')}</span>
                                            </label>
                                        </div>

                                        <div className="setting-item">
                                            <label htmlFor="showTooltips-checkbox">
                                                <input
                                                    id="showTooltips-checkbox"
                                                    type="checkbox"
                                                    checked={showTooltips}
                                                    onChange={(e) => onToggleTooltips && onToggleTooltips(e.target.checked)}
                                                />
                                                <span>{t('settings.showTooltips')}</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {activeTab === TABS.COLORS && (
                                    <div className="settings-tab-panel">
                                        <div className="setting-item">
                                            <label>
                                                <span style={{marginRight: '0.5rem'}}>{t('settings.colorPosition')}</span>
                                            </label>
                                            <div className="language-selector-settings" ref={colorPositionSelectorRef}>
                                                <button
                                                    type="button"
                                                    className="language-button-settings"
                                                    onClick={() => setShowColorPositionDropdown(!showColorPositionDropdown)}
                                                    aria-expanded={showColorPositionDropdown}
                                                    aria-haspopup="true"
                                                >
                                                    <span className="language-button-text-settings">
                                                        {colorPosition === 'top' ? t('settings.colorPositionTop') : t('settings.colorPositionBackground')}
                                                    </span>
                                                    <span className="language-button-icon-settings">
                                                        {showColorPositionDropdown ? '▲' : '▼'}
                                                    </span>
                                                </button>
                                                {showColorPositionDropdown && (
                                                    <div className="language-dropdown-settings">
                                                        <button
                                                            type="button"
                                                            className={`language-option-settings ${colorPosition === 'top' ? 'language-option-active-settings' : ''}`}
                                                            onClick={() => {
                                                                onColorPositionChange && onColorPositionChange('top');
                                                                setShowColorPositionDropdown(false);
                                                            }}
                                                        >
                                                            <span className="language-option-text-settings">{t('settings.colorPositionTop')}</span>
                                                            {colorPosition === 'top' && <span className="language-option-check-settings">✓</span>}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`language-option-settings ${colorPosition === 'background' ? 'language-option-active-settings' : ''}`}
                                                            onClick={() => {
                                                                onColorPositionChange && onColorPositionChange('background');
                                                                setShowColorPositionDropdown(false);
                                                            }}
                                                        >
                                                            <span className="language-option-text-settings">{t('settings.colorPositionBackground')}</span>
                                                            {colorPosition === 'background' && <span className="language-option-check-settings">✓</span>}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {colorPosition === 'background' && (
                                            <SliderOpacity 
                                                value={colorBackgroundOpacity} 
                                                onChange={onColorBackgroundOpacityChange} 
                                            />
                                        )}

                                        <SliderOpacity 
                                            value={timePassedOverlayIntensity} 
                                            onChange={onTimePassedOverlayIntensityChange}
                                            labelKey="timePassedOverlayIntensity"
                                            min={10}
                                            max={90}
                                        />
                                    </div>
                                )}

                                {activeTab === TABS.CONTACT && (
                                    <div className="settings-tab-panel">
                                        <div className="contact-intro">
                                            <p>{t('settings.contactIntroText1')}</p>
                                            <p>{t('settings.contactIntroText2')}</p>
                                        </div>

                                        <div className="setting-item setting-button-item">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    window.location.href = '/contact?from=edt-settings';
                                                }}
                                                className="settings-action contact-button"
                                            >
                                                <span className="button-icon">✉️</span>
                                                <span className="button-label">{t('common.contact')}</span>
                                            </button>
                                        </div>

                                        <div className="setting-item copyright-item">
                                            <div className="copyright-line">
                                                <span
                                                    className="copyright-text"
                                                    onClick={handleCopyrightClick}
                                                >
                                                    © {new Date().getFullYear()} EDT CNAM{version && ` • v${version}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <Toast
                message={toastMessage}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
        </>
    );
}

