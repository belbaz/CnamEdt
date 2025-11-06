"use client";
import {useState, useEffect, useRef, useMemo} from "react";
import {createPortal} from "react-dom";
import {getEventTitle, getColorIndexForSubject} from "@/utils/eventUtils";
import "./SubjectHoursInfo.css";

export default function SubjectHoursInfo({allEvents = [], subjectColors = {}}) {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef(null);

    // Formater des heures décimales en format lisible (ex: 1h30, 45min)
    const formatHoursHM = (decimalHours) => {
        if (decimalHours == null || isNaN(decimalHours)) return "";
        const totalMinutes = Math.round(decimalHours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h > 0 && m === 0) return `${h}h`;
        if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
        return `${m}min`;
    };

    // Calculer les heures par matière (total et déjà effectuées)
    const subjectHours = useMemo(() => {
        const hoursBySubject = {};
        const now = new Date();
        
        allEvents.forEach(event => {
            const {matiere} = getEventTitle(event);
            if (!matiere || matiere === ":") return;
            
            const start = new Date(event.start);
            const endDate = event.end_time || event.end;
            if (!endDate) return;
            
            const end = new Date(endDate);
            
            // Vérifier que les dates sont valides
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
            
            const durationMs = end.getTime() - start.getTime();
            
            // Ignorer les durées négatives ou nulles
            if (durationMs <= 0) return;
            
            const durationHours = durationMs / (1000 * 60 * 60); // Convertir en heures
            
            if (!hoursBySubject[matiere]) {
                hoursBySubject[matiere] = {
                    total: 0,
                    completed: 0
                };
            }
            
            hoursBySubject[matiere].total += durationHours;
            
            // Si le cours est déjà passé (la date de fin est dans le passé)
            if (end.getTime() < now.getTime()) {
                hoursBySubject[matiere].completed += durationHours;
            }
        });
        
        // Convertir en tableau avec pourcentage de complétion
        return Object.entries(hoursBySubject)
            .map(([subject, {total, completed}]) => {
                // Garder le calcul du pourcentage sur les valeurs exactes (pas arrondies)
                const percentage = total > 0 ? Math.round(((completed / total) * 100) * 10) / 10 : 0;
                
                return {
                    subject,
                    // Conserver aussi les valeurs brutes pour d'autres calculs si besoin
                    hours: total,
                    completed: completed,
                    percentage
                };
            })
            .sort((a, b) => b.percentage - a.percentage);
    }, [allEvents]);

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

    // Ne pas bloquer le scroll pour cette modale (on peut scroller la page)

    const totalHours = subjectHours.reduce((sum, item) => sum + item.hours, 0);
    const totalCompleted = subjectHours.reduce((sum, item) => sum + item.completed, 0);

    if (allEvents.length === 0 || subjectHours.length === 0) {
        return null;
    }

    return (
        <div>
            <button
                className="subject-hours-info-button"
                onClick={() => setIsOpen(!isOpen)}
                title="Voir les heures par matière"
                aria-label="Voir les heures par matière"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
            </button>

            {isOpen && typeof window !== 'undefined' && createPortal(
                <>
                    <div className="subject-hours-overlay" onClick={() => setIsOpen(false)}/>
                    <div className="subject-hours-panel" ref={panelRef}>
                        <div className="subject-hours-header">
                            <h3>Heures par matière</h3>
                            <button 
                                className="subject-hours-close" 
                                onClick={() => setIsOpen(false)}
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="subject-hours-content">
                            {subjectHours.length === 0 ? (
                                <div className="subject-hours-empty">
                                    <p>Aucune donnée disponible</p>
                                </div>
                            ) : (
                                <>
                                    <div className="subject-hours-list">
                                        {subjectHours.map(({subject, hours, completed, percentage}) => {
                                            const colorIndex = getColorIndexForSubject(subject, subjectColors);
                                            return (
                                                <div key={subject} className="subject-hours-item">
                                                    <div className="subject-hours-item-header">
                                                        <span className="subject-hours-item-name">{subject}</span>
                                                        <div className="subject-hours-item-values">
                                                            <span className="subject-hours-item-value">{formatHoursHM(completed)} / {formatHoursHM(hours)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="subject-hours-item-bar-container">
                                                        <div className="subject-hours-item-bar">
                                                            <div 
                                                                className="subject-hours-item-bar-fill"
                                                                data-index={colorIndex}
                                                                style={{width: `${percentage}%`}}
                                                            />
                                                        </div>
                                                        <div className="subject-hours-item-bar-percent-below">{percentage}%</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="subject-hours-total">
                                        <span className="subject-hours-total-label">Total</span>
                                        <span className="subject-hours-total-value">{formatHoursHM(totalCompleted)} / {formatHoursHM(totalHours)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}

