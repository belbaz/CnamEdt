// @ts-nocheck
"use client";
import { useState, useEffect, useCallback } from "react";
import { parseStoredNoteValue } from "@/utils/noteEntries";
import { useI18n } from "@/i18n/I18nContext";

/**
 * Hook pour charger et gérer les notes des cours
 * Retourne une Map<course_uid, note> pour accès rapide
 */
export function useCourseNotes() {
    const { language } = useI18n();
    const [notes, setNotes] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    const loadNotes = useCallback(async () => {
        try {
            setLoading(true);
            const lang = language || (typeof localStorage !== 'undefined' ? localStorage.getItem('language') : null) || 'fr';
            const res = await fetch(`/api/agenda?lang=${encodeURIComponent(lang)}`, {
                cache: "no-store",
            });

            if (!res.ok) {
                // Erreur serveur
                console.warn("[useCourseNotes] Erreur chargement notes:", res.status);
                setAuthenticated(false);
                setNotes(new Map());
                setLoading(false);
                return;
            }

            const data = await res.json();

            // Mettre à jour l'état d'authentification
            setAuthenticated(data.authenticated || false);

            // Convertir en Map pour accès rapide (même si non authentifié, on peut avoir des notes publiques)
            const notesMap = new Map();
            if (data.notes && Array.isArray(data.notes)) {
                data.notes.forEach((note) => {
                    const normalizedNote = {
                        ...note,
                        entries: Array.isArray(note?.entries)
                            ? note.entries
                            : parseStoredNoteValue(note?.notes),
                        labels: Array.isArray(note?.labels) ? note.labels : (note?.labels ? [note.labels] : []),
                        entry_labels: note?.entry_labels || {},
                    };
                    notesMap.set(note.course_uid, normalizedNote);
                });
            }
            setNotes(notesMap);
        } catch (error) {
            // Erreur réseau ou autre
            console.warn("[useCourseNotes] Erreur:", error);
            setAuthenticated(false);
            setNotes(new Map());
        } finally {
            setLoading(false);
        }
    }, [language]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    return {
        notes,
        loading,
        authenticated,
        refresh: loadNotes,
    };
}


