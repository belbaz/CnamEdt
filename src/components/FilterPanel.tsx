// @ts-nocheck
"use client";
import {useState, useEffect, useRef} from "react";
import "./FilterPanel.css";
import HoverTooltip from "./HoverTooltip";

export default function FilterPanel({
                                        subjects = [],
                                        selectedSubjects = [],
                                        onSubjectsChange,
                                        showOnlyExams = false,
                                        onShowOnlyExamsChange,
                                        isVisible = false
                                    }) {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef(null);

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

    // Fermer le panneau si on clique à l'extérieur
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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

    const handleToggleSubject = (subject) => {
        const newSelected = selectedSubjects.includes(subject)
            ? selectedSubjects.filter(s => s !== subject)
            : [...selectedSubjects, subject];

        onSubjectsChange(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedSubjects.length === subjects.length) {
            onSubjectsChange([]);
        } else {
            onSubjectsChange([...subjects]);
        }
    };

    const activeFiltersCount = selectedSubjects.length;
    const hasActiveFilters = activeFiltersCount > 0 && activeFiltersCount < subjects.length;
    const hasAnyFilter = hasActiveFilters || showOnlyExams;

    if (!isVisible) {
        return null;
    }

    return (
        <>
            <HoverTooltip text="Filtrer les cours">
                <button
                    className={`filter-button ${hasAnyFilter ? 'has-filters' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Filtrer les cours"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                         aria-hidden="true">
                        <path d="M4 6h16M4 12h10M4 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="17" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                    {hasAnyFilter && (
                        <span className="filter-badge" aria-label={`Filtres actifs`}>
                            {activeFiltersCount + (showOnlyExams ? 1 : 0)}
                        </span>
                    )}
                </button>
            </HoverTooltip>

            {isOpen && (
                <>
                    <div className="filter-overlay" onClick={() => setIsOpen(false)}/>
                    <div className="filter-panel" ref={panelRef}>
                        <div className="filter-header">
                            <h3>Filtrer les cours</h3>
                            <button
                                className="filter-close"
                                onClick={() => setIsOpen(false)}
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="filter-content">
                            {subjects.length === 0 ? (
                                <div className="filter-empty">
                                    <p>Aucune matière disponible</p>
                                </div>
                            ) : (
                                <>
                                    <div className="filter-section-title">Filtrer par matières</div>
                                    <div className="filter-actions">
                                        <button
                                            className="filter-select-all"
                                            onClick={handleSelectAll}
                                        >
                                            {selectedSubjects.length === subjects.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                                        </button>
                                        {(hasActiveFilters || showOnlyExams) && (
                                            <button
                                                className="filter-clear"
                                                onClick={() => {
                                                    onSubjectsChange([]);
                                                    onShowOnlyExamsChange && onShowOnlyExamsChange(false);
                                                }}
                                            >
                                                Tout réinitialiser
                                            </button>
                                        )}
                                    </div>

                                    <div className="filter-list">
                                        {subjects.map((subject) => {
                                            const isSelected = selectedSubjects.includes(subject);
                                            return (
                                                <label
                                                    key={subject}
                                                    className={`filter-item ${isSelected ? 'selected' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSubject(subject)}
                                                    />
                                                    <span className="filter-item-label">{subject}</span>
                                                </label>
                                            );
                                        })}
                                        {/* Toggle Examens uniquement */}
                                        <div className="filter-exam-toggle">
                                            <label className="exam-toggle-label">
                                                <input
                                                    type="checkbox"
                                                    checked={showOnlyExams}
                                                    onChange={(e) => onShowOnlyExamsChange && onShowOnlyExamsChange(e.target.checked)}
                                                    className="exam-toggle-checkbox"
                                                />
                                                <span className="exam-toggle-text">Afficher uniquement les examens</span>
                                            </label>
                                        </div>
                                    </div>
                                    {hasActiveFilters && (
                                        <div className="filter-info">
                                            {activeFiltersCount} matière{activeFiltersCount > 1 ? 's' : ''} sélectionnée{activeFiltersCount > 1 ? 's' : ''}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}


