// @ts-nocheck
"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { getColorIndexForSubject } from "@/utils/eventUtils";
import {useI18n} from "../i18n/I18nContext";
import "./SubjectHoursModal.css";

export default function SubjectHoursModal({ isOpen, onClose, subjectHours = [], subjectColors = {} }) {
    const { t } = useI18n();
    // Bloquer le scroll et appliquer le blur sur le body quand la modale est ouverte
    useEffect(() => {
        if (isOpen) {
            // Ajouter la classe pour forcer le background gradient
            document.body.classList.add('modal-open');
            document.documentElement.classList.add('modal-open');
            
            // Bloquer le scroll sans modifier la position actuelle (comme EventModal)
            const previousBodyOverflow = document.body.style.overflow;
            const previousHtmlOverflow = document.documentElement.style.overflow;
            
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            
            // Appliquer le blur sur tous les enfants directs du body (sauf la modale)
            const bodyChildren = Array.from(document.body.children);
            bodyChildren.forEach(child => {
                if (child && !child.classList.contains('subject-hours-modal-overlay')) {
                    child.style.setProperty('filter', 'blur(4px)', 'important');
                    child.style.setProperty('transition', 'filter 0.2s ease', 'important');
                }
            });
            
            return () => {
                // Retirer la classe
                document.body.classList.remove('modal-open');
                document.documentElement.classList.remove('modal-open');
                
                // Restaurer l'overflow précédent (la position de scroll n'a jamais été modifiée)
                document.body.style.overflow = previousBodyOverflow;
                document.documentElement.style.overflow = previousHtmlOverflow;
                
                // Retirer le blur de tous les enfants
                const bodyChildren = Array.from(document.body.children);
                bodyChildren.forEach(child => {
                    if (child) {
                        child.style.removeProperty('filter');
                        child.style.removeProperty('transition');
                    }
                });
            };
        }
    }, [isOpen]);

    // Fermer avec la touche Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

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

    if (!isOpen) return null;

    const totalHours = subjectHours.length > 0 
        ? subjectHours.reduce((sum, item) => sum + (item.hours || 0), 0)
        : 0;
    const totalCompleted = subjectHours.length > 0
        ? subjectHours.reduce((sum, item) => sum + (item.completed || 0), 0)
        : 0;

    const modalContent = (
        <div className="subject-hours-modal-overlay" onClick={onClose}>
            <div className="subject-hours-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="subject-hours-modal-header">
                    <h2 className="subject-hours-modal-title">{t('subjectHours.modalTitle')}</h2>
                    <button 
                        className="subject-hours-modal-close" 
                        onClick={onClose}
                        aria-label={t('common.close')}
                    >
                        ✕
                    </button>
                </div>
                
                <div className="subject-hours-modal-body">
                    {subjectHours.length === 0 ? (
                        <div className="subject-hours-empty">
                            <p>{t('common.notAvailable')}</p>
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
                                <span className="subject-hours-total-label">{t('subjectHours.totalHours')}</span>
                                <span className="subject-hours-total-value">{formatHoursHM(totalCompleted)} / {formatHoursHM(totalHours)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    // Utiliser createPortal pour rendre la modale directement dans le body
    if (typeof window !== 'undefined') {
        return createPortal(modalContent, document.body);
    }

    return null;
}

