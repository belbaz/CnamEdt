"use client";
import {useState, useMemo} from "react";
import {getEventTitle} from "@/utils/eventUtils";
import SubjectHoursModal from "./SubjectHoursModal";
import {useI18n} from "../i18n/I18nContext";
import "./SubjectHoursInfo.css";

export default function SubjectHoursInfo({allEvents = [], subjectColors = {}}) {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);

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

    if (allEvents.length === 0 || subjectHours.length === 0) {
        return null;
    }

    return (
        <>
            <button
                className="subject-hours-info-button"
                onClick={() => setIsOpen(true)}
                title={t('subjectHours.title')}
                aria-label={t('subjectHours.title')}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
            </button>

            <SubjectHoursModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                subjectHours={subjectHours}
                subjectColors={subjectColors}
            />
        </>
    );
}
