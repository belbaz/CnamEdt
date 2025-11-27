'use client';

import { useState, useEffect } from 'react';
import Spinner from "@/components/Spinner";
import styles from './page.module.css';

/**
 * Page pour afficher le contenu brut du fichier ICS
 * Affiche les événements avec date, prof, cours, emplacement
 * Permet de télécharger le fichier ICS
 */
export default function RawICSPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [events, setEvents] = useState([]);
    const [rawContent, setRawContent] = useState('');
    const [source, setSource] = useState('');

    useEffect(() => {
        fetchRawICS();
    }, []);

    const fetchRawICS = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch('/api/raw-ics', {
                headers: {
                    'Accept': 'application/json',
                },
                cache: 'no-cache'
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            setRawContent(data.content);
            setSource(data.source);
            
            // Parser les événements
            const parsedEvents = parseICSContent(data.content);
            setEvents(parsedEvents);
            
        } catch (err) {
            console.error('[Raw ICS] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Parse le contenu ICS et extrait les événements avec leurs champs importants
     */
    const parseICSContent = (icsContent) => {
        const events = [];
        const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
        let match;

        while ((match = eventRegex.exec(icsContent)) !== null) {
            const eventContent = match[1];
            
            // Extraire les champs
            const summary = extractField(eventContent, 'SUMMARY');
            const dtstart = extractField(eventContent, 'DTSTART');
            const dtend = extractField(eventContent, 'DTEND');
            const location = extractField(eventContent, 'LOCATION');
            const description = extractField(eventContent, 'DESCRIPTION');
            const uid = extractField(eventContent, 'UID');

            // Parser les dates
            const startDate = parseICALDate(dtstart);
            const endDate = parseICALDate(dtend);

            // Extraire le prof de la description (généralement format: "Prof: NOM")
            let prof = '';
            if (description) {
                const profMatch = description.match(/Prof(?:esseur)?[:\s]+([^\n]+)/i);
                if (profMatch) {
                    prof = profMatch[1].trim();
                }
            }

            events.push({
                uid: uid || `event-${events.length}`,
                summary: summary || 'Sans titre',
                start: startDate,
                end: endDate,
                location: location || 'Non spécifié',
                description: description || '',
                prof: prof || 'Non spécifié'
            });
        }

        // Trier par date de début
        events.sort((a, b) => a.start - b.start);
        
        return events;
    };

    /**
     * Extrait un champ du contenu d'un événement ICS
     */
    const extractField = (content, fieldName) => {
        // Gérer les champs sur plusieurs lignes (continuation avec espace au début)
        const regex = new RegExp(`${fieldName}[^:]*:([\\s\\S]*?)(?=\\n[A-Z]|$)`, 'i');
        const match = content.match(regex);
        if (!match) return '';
        
        // Nettoyer les continuations de ligne
        let value = match[1].trim();
        value = value.replace(/\n\s+/g, '');
        
        // Décoder les caractères échappés
        value = value.replace(/\\n/g, '\n');
        value = value.replace(/\\,/g, ',');
        value = value.replace(/\\;/g, ';');
        
        return value;
    };

    /**
     * Parse une date au format ICAL (yyyyMMddTHHmmss)
     */
    const parseICALDate = (str) => {
        if (!str) return null;
        
        // Nettoyer la chaîne (enlever TZID etc.)
        const dateStr = str.replace(/.*:/, '').trim();
        
        const year = dateStr.substr(0, 4);
        const month = dateStr.substr(4, 2);
        const day = dateStr.substr(6, 2);
        const hour = dateStr.substr(9, 2) || '00';
        const minute = dateStr.substr(11, 2) || '00';
        const second = dateStr.substr(13, 2) || '00';
        
        return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    };

    /**
     * Formate une date pour l'affichage
     */
    const formatDate = (date) => {
        if (!date) return 'Date invalide';
        
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('fr-FR', options);
    };

    /**
     * Télécharge le fichier ICS
     */
    const downloadICS = () => {
        if (!rawContent) return;

        const blob = new Blob([rawContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edt_eicnam_${new Date().toISOString().split('T')[0]}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <Spinner size="large" variant="border" />
                    <p>Chargement du fichier ICS...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <h2>❌ Erreur</h2>
                    <p>{error}</p>
                    <button onClick={fetchRawICS} className={styles.retryButton}>
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>📅 Contenu du fichier ICS</h1>
                <p className={styles.source}>Source: {source}</p>
                <div className={styles.actions}>
                    <button onClick={downloadICS} className={styles.downloadButton}>
                        📥 Télécharger le fichier ICS
                    </button>
                    <button onClick={fetchRawICS} className={styles.refreshButton}>
                        🔄 Actualiser
                    </button>
                </div>
            </header>

            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <span className={styles.statNumber}>{events.length}</span>
                    <span className={styles.statLabel}>Événements</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statNumber}>{(rawContent.length / 1024).toFixed(2)} Ko</span>
                    <span className={styles.statLabel}>Taille du fichier</span>
                </div>
            </div>

            <div className={styles.eventsContainer}>
                <h2>Événements ({events.length})</h2>
                
                {events.length === 0 ? (
                    <p className={styles.noEvents}>Aucun événement trouvé dans le fichier ICS</p>
                ) : (
                    <div className={styles.eventsList}>
                        {events.map((event, index) => (
                            <div key={event.uid || index} className={styles.eventCard}>
                                <div className={styles.eventHeader}>
                                    <h3 className={styles.eventTitle}>{event.summary}</h3>
                                    <span className={styles.eventIndex}>#{index + 1}</span>
                                </div>
                                
                                <div className={styles.eventDetails}>
                                    <div className={styles.eventField}>
                                        <span className={styles.fieldLabel}>📅 Date de début:</span>
                                        <span className={styles.fieldValue}>{formatDate(event.start)}</span>
                                    </div>
                                    
                                    <div className={styles.eventField}>
                                        <span className={styles.fieldLabel}>🕐 Date de fin:</span>
                                        <span className={styles.fieldValue}>{formatDate(event.end)}</span>
                                    </div>
                                    
                                    <div className={styles.eventField}>
                                        <span className={styles.fieldLabel}>👨‍🏫 Professeur:</span>
                                        <span className={styles.fieldValue}>{event.prof}</span>
                                    </div>
                                    
                                    <div className={styles.eventField}>
                                        <span className={styles.fieldLabel}>📍 Emplacement:</span>
                                        <span className={styles.fieldValue}>{event.location}</span>
                                    </div>

                                    {event.description && (
                                        <div className={styles.eventField}>
                                            <span className={styles.fieldLabel}>📝 Description:</span>
                                            <span className={styles.fieldValue}>{event.description}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

