"use client";
import {useState, useEffect, useRef} from "react";
import "./SettingsMenu.css";
import Toast from "./Toast";
import {useDevMode} from "../utils/env";

export default function SettingsMenu({
                                         onOpenChange,
                                         compactMode,
                                         isMobile = false,
                                         isNative = false,
                                         currentVersion = null,
                                         onCheckUpdates = null,
                                         showTimeLabels = true,
                                         onToggleTimeLabels = null,
                                         hide15MinSpacing = false,
                                         onToggle15MinSpacing = null,
                                         showTimeRemaining = true,
                                         onToggleTimeRemaining = null
                                     }) {
    const [isOpen, setIsOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [version, setVersion] = useState(currentVersion || null);
    const copyrightClickCount = useRef(0);
    const copyrightClickTimeout = useRef(null);
    const devMode = useDevMode();
    // Le bouton update reste visible sur mobile/native
    const showUpdateButton = devMode ? true : (isMobile || isNative);

    // Récupérer la version depuis l'API ou utiliser currentVersion
    useEffect(() => {
        if (currentVersion) {
            setVersion(currentVersion);
        } else if (!isNative && typeof window !== 'undefined') {
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
    }, [isNative, currentVersion]);

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
                className="settings-button filter-buttonm"
                onClick={() => setIsOpen(!isOpen)}
                title="Paramètres"
            >
                <img src="/settings.svg" alt="Paramètres" width="22" height="22" aria-hidden="true"/>
            </button>

            {isOpen && (
                <>
                    <div className="settings-overlay" onClick={() => setIsOpen(false)}/>
                    <div className="settings-menu">
                        <div className="settings-header">
                            <h3>Paramètres</h3>
                            <button className="settings-close" onClick={() => setIsOpen(false)}>✕</button>
                        </div>

                        <div className="settings-content">
                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={showTimeLabels}
                                        onChange={(e) => onToggleTimeLabels && onToggleTimeLabels(e.target.checked)}
                                    />
                                    <span>Afficher les heures</span>
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
                                    <span>Masquer les pauses de 15 minutes</span>
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
                                    <span>Afficher le temps restant du cours</span>
                                </label>
                            </div>

                            {/* Canal supprimé: interface épurée */}

                            {(devMode || isNative || isMobile) && (
                                <div className="setting-item setting-button-item">
                                    <button
                                        className="settings-action check-updates-button"
                                        onClick={() => {
                                            if (onCheckUpdates) {
                                                onCheckUpdates();
                                                setIsOpen(false);
                                            }
                                        }}
                                    >
                                        <span className="button-icon">🔄</span>
                                        <div className="button-content">
                                            <span className="button-label">Update</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            <div className="setting-item setting-button-item">
                                <a
                                    href={"https://belbaz.vercel.app/contact"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="settings-action contact-button"
                                >
                                    <span className="button-icon">✉️</span>
                                    <span className="button-label">Contact</span>
                                </a>
                            </div>

                            <div className="setting-item copyright-item">
                                <div className="copyright-line">
                                    <span
                                        className="copyright-text"
                                        onClick={handleCopyrightClick}
                                    >
                                        © {new Date().getFullYear()} EDT CNAM
                                    </span>
                                </div>
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
