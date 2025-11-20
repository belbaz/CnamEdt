"use client";
import {useState, useEffect} from "react";
import MapViewer from "@/components/MapViewer/MapViewer";
import {
    formatDurationHM,
    getSubjectHoursStats,
    formatHoursDecimal,
    extractCourseIdFromSummary,
    extractCourseType,
    parseLocationMeta,
    getAcademicYearParts
} from "@/utils/eventModalUtils";
import {getEventTitle} from "@/utils/eventUtils";
import {areNoteEntriesEqual, parseStoredNoteValue, sanitizeNoteEntries} from "@/utils/noteEntries";
import styles from "@/app/page.module.css";

export default function EventModal({
    selectedEvent,
    onClose,
    onShowMap,
    showMap,
    allEvents,
    progressionExpanded,
    setProgressionExpanded,
    courseNotes,
    notesAuthenticated,
    refreshNotes,
    devMode
}) {
    const [editingNoteEntries, setEditingNoteEntries] = useState([]);
    const [originalNoteEntries, setOriginalNoteEntries] = useState([]);
    const [savingNote, setSavingNote] = useState(false);
    const [isModalEditingNotes, setIsModalEditingNotes] = useState(false);

    const extractNoteEntries = (record) => {
        if (!record) return [];
        return Array.isArray(record?.entries)
            ? record.entries
            : parseStoredNoteValue(record?.notes);
    };

    // Initialiser le contenu de la note quand selectedEvent change
    useEffect(() => {
        if (selectedEvent && selectedEvent.uid) {
            const courseNote = courseNotes ? courseNotes.get(selectedEvent.uid) : null;
            const entries = extractNoteEntries(courseNote);
            setEditingNoteEntries(entries.length ? [...entries] : []);
            setOriginalNoteEntries(entries);
            setIsModalEditingNotes(false);
        } else {
            setEditingNoteEntries([]);
            setOriginalNoteEntries([]);
            setIsModalEditingNotes(false);
        }
    }, [selectedEvent, courseNotes]);

    // Fermer la modale avec la touche Échap
    useEffect(() => {
        if (!selectedEvent) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedEvent, onClose]);

    if (!selectedEvent) return null;

    const selectedEventLocationMeta = parseLocationMeta(selectedEvent.location);
    const {matiere} = getEventTitle(selectedEvent) || {};
    const hoursStats = getSubjectHoursStats(matiere, allEvents, selectedEvent);

    // Gestion des notes
    const modalHasChanges = !areNoteEntriesEqual(editingNoteEntries, originalNoteEntries);
    const sanitizedModalEntries = sanitizeNoteEntries(editingNoteEntries);
    const savedModalEntries = sanitizeNoteEntries(originalNoteEntries);

    const handleEntryChange = (index, value) => {
        setEditingNoteEntries((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleAddEntry = () => {
        if (!isModalEditingNotes) {
            setIsModalEditingNotes(true);
        }
        setEditingNoteEntries((prev) => [...prev, ""]);
    };

    const handleRemoveEntry = (index) => {
        setEditingNoteEntries((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleStartEditing = () => {
        setIsModalEditingNotes(true);
        if (editingNoteEntries.length === 0) {
            setEditingNoteEntries([""]);
        }
    };

    const handleCancelEditing = () => {
        setEditingNoteEntries(originalNoteEntries);
        setIsModalEditingNotes(false);
    };

    const handleSaveNote = async () => {
        if (!selectedEvent || !selectedEvent.uid) return;

        try {
            setSavingNote(true);
            const res = await fetch("/api/agenda", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    course_uid: selectedEvent.uid,
                    notes: sanitizedModalEntries,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la sauvegarde");
            }

            setOriginalNoteEntries(sanitizedModalEntries);
            setIsModalEditingNotes(false);
            if (refreshNotes) {
                refreshNotes();
            }
        } catch (err) {
            console.error("[EventModal] Erreur sauvegarde note:", err);
            alert("Erreur lors de la sauvegarde : " + err.message);
        } finally {
            setSavingNote(false);
        }
    };

    return (
        <>
            {showMap && selectedEvent && (
                <MapViewer
                    location={selectedEvent.location}
                    onClose={() => onShowMap(false)}
                />
            )}
            <div className="event-modal-layer" aria-modal="true" role="dialog">
                <div className="event-modal-overlay" onClick={onClose}/>
                <div className="event-modal">
                    <div className="event-modal-header">
                        <div className="event-modal-title">
                            {selectedEvent.summary || selectedEvent.description || 'Cours'}
                            {/* Badge Examen si présent dans la description */}
                            {selectedEvent.description && selectedEvent.description.toUpperCase().includes("EXAMEN") && (
                                <span className="exam-badge-modal" title="Examen">
                                    📝 EXAMEN
                                </span>
                            )}
                        </div>
                        <button className="event-modal-close" aria-label="Fermer"
                                onClick={onClose}>✕
                        </button>
                    </div>
                    <div className="event-modal-content">
                        {/* Section Informations principales */}
                        <div className="modal-section">
                            <div className="pop-row">
                                <span>⏰</span>
                                <span>{new Date(selectedEvent.start).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })} - {new Date(selectedEvent.end).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</span>
                            </div>
                            {formatDurationHM(selectedEvent.start, selectedEvent.end) && (
                                <div className="pop-row">
                                    <span>⏳</span>
                                    <span>Durée : {formatDurationHM(selectedEvent.start, selectedEvent.end)}</span>
                                </div>
                            )}
                            {(() => {
                                const courseType = extractCourseType(selectedEvent);
                                const courseId = extractCourseIdFromSummary(selectedEvent.summary || selectedEvent.description || '');
                                const {prof: extractedProf} = getEventTitle(selectedEvent) || {};
                                const profName = extractedProf || selectedEvent.prof;
                                return (
                                    <>
                                        {courseId && (
                                            <div className="pop-row">
                                                <span>🎓</span>
                                                <span>UE : {courseId}</span>
                                            </div>
                                        )}
                                        {courseType && (
                                            <div className="pop-row">
                                                <span>📘</span>
                                                <span>{courseType}</span>
                                            </div>
                                        )}
                                        <div className="pop-row">
                                            <span>👤</span>
                                            <span>Professeur : {profName || "?"}</span>
                                        </div>
                                    </>
                                );
                            })()}
                            <div className="pop-row location-row">
                                <span>{selectedEventLocationMeta?.isVisio ? '🎥' : '🚪'}</span>
                                <span>
                                    {selectedEventLocationMeta?.isVisio
                                        ? selectedEventLocationMeta.display
                                        : `Salle : ${selectedEventLocationMeta ? selectedEventLocationMeta.display : "?"}`}
                                </span>
                                {selectedEventLocationMeta?.isVisio ? (
                                    <span className="site-badge visio-badge">VISIO</span>
                                ) : selectedEventLocationMeta?.siteInfo ? (
                                    <span
                                        className="site-badge"
                                        style={{
                                            backgroundColor: selectedEventLocationMeta.siteInfo.color,
                                            color: 'white'
                                        }}
                                    >
                                        {selectedEventLocationMeta.siteInfo.site}
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        {/* Section Progression */}
                        {hoursStats && hoursStats.total > 0 && (() => {
                            const progressionKey = selectedEvent?.uid || 'default';
                            const isExpanded = progressionExpanded.get(progressionKey) || false;

                            const toggleExpanded = () => {
                                const newMap = new Map(progressionExpanded);
                                newMap.set(progressionKey, !isExpanded);
                                setProgressionExpanded(newMap);
                            };

                            return (
                                <div className="modal-section">
                                    <div className="hours-stats-compact">
                                        <div
                                            className="hours-stats-header"
                                            onClick={toggleExpanded}
                                            style={{cursor: 'pointer'}}
                                        >
                                            <span className="hours-stats-icon">📊</span>
                                            <span className="hours-stats-label">Progression</span>
                                            <span className={`hours-stats-chevron ${isExpanded ? 'expanded' : ''}`}>▼</span>
                                        </div>
                                        {isExpanded && (
                                            <div className="hours-stats-content">
                                                <div className="hours-stats-bar-wrapper">
                                                    <div className="hours-stats-bar">
                                                        <div
                                                            className="hours-stats-bar-fill"
                                                            style={{width: `${hoursStats.percentage}%`}}
                                                        />
                                                    </div>
                                                    <span
                                                        className="hours-stats-bar-percent">{hoursStats.percentage}%</span>
                                                </div>
                                                <div className="hours-stats-details">
                                                    <span
                                                        className="hours-stats-completed">{formatHoursDecimal(hoursStats.completed)} / {formatHoursDecimal(hoursStats.total)}</span>
                                                    {hoursStats.remaining > 0 && (
                                                        <>
                                                            <span className="hours-stats-dot">•</span>
                                                            <span
                                                                className="hours-stats-remaining">{formatHoursDecimal(hoursStats.remaining)} restantes après ce cours</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Section Notes Agenda */}
                        {selectedEvent.uid && (
                            <div className="modal-section">
                                <div className="modal-notes-header">
                                    <div className="modal-notes-title">
                                        <h3>Notes de l&apos;agenda</h3>
                                    </div>
                                </div>
                                {!notesAuthenticated ? (
                                    // Mode lecture seule pour utilisateurs non connectés
                                    <div className="modal-note-view">
                                        {savedModalEntries.length === 0 ? (
                                            <div className="modal-notes-empty">
                                                <p className="modal-note-view-text">Aucune note disponible</p>
                                                <p
                                                    className="modal-note-view-text"
                                                    style={{ fontSize: '0.9em', color: '#666', marginTop: '0.5em' }}
                                                >
                                                    <a href="/login" className={styles.notesUnauthLink}>
                                                        Connectez-vous
                                                    </a>pour ajouter des notes
                                                </p>
                                            </div>
                                        ) : (
                                            (() => {
                                                const courseNote = courseNotes?.get(selectedEvent.uid);
                                                const modificationHistory = courseNote?.modification_history || [];

                                                // Récupérer la dernière personne (modification ou création)
                                                const lastPerson = modificationHistory.length > 0
                                                    ? modificationHistory[modificationHistory.length - 1]
                                                    : null;

                                                const formatDateTime = (dateString) => {
                                                    if (!dateString) return '';
                                                    const date = new Date(dateString);
                                                    return date.toLocaleDateString('fr-FR', {
                                                        day: 'numeric',
                                                        month: 'numeric',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
                                                };

                                                return (
                                                    <div>
                                                        {savedModalEntries.map((entry, index) => (
                                                            <div key={`${selectedEvent.uid}-view-${index}`}>
                                                                <div className="modal-note-view-card">
                                                                    <p className="modal-note-view-text">{entry}</p>
                                                                </div>
                                                                {lastPerson && (
                                                                    <div className="modal-note-last-person">
                                                                        {lastPerson.user_name || 'Utilisateur inconnu'}
                                                                        {lastPerson.timestamp && ` - ${formatDateTime(lastPerson.timestamp)}`}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <p
                                                            className="modal-note-view-text"
                                                            style={{ fontSize: '0.9em', color: '#666', marginTop: '1em', fontStyle: 'italic' }}
                                                        >
                                                            Connectez-vous pour modifier ces notes
                                                            <a href="/login" className={styles.notesUnauthLink}>
                                                                Connexion
                                                            </a>{" "}
                                                        </p>
                                                    </div>
                                                );
                                            })()
                                        )}
                                    </div>
                                ) : !isModalEditingNotes && savedModalEntries.length === 0 ? (
                                    // Utilisateur connecté, aucune note
                                    <div className="modal-notes-empty">
                                        <p className="modal-note-view-text">Aucune note</p>
                                        <button
                                            type="button"
                                            className="modal-note-add"
                                            onClick={() => {
                                                setIsModalEditingNotes(true);
                                                setEditingNoteEntries([""]);
                                            }}
                                            disabled={savingNote}
                                        >
                                            + Ajouter une note
                                        </button>
                                    </div>
                                ) : isModalEditingNotes ? (
                                    // Mode édition pour utilisateurs connectés
                                    <div className="modal-notes-list">
                                        {editingNoteEntries.length === 0 ? (
                                            <div className="modal-notes-empty">
                                                <p>Aucune note en cours d'édition.</p>
                                                <button
                                                    type="button"
                                                    className="modal-note-add"
                                                    onClick={handleAddEntry}
                                                    disabled={savingNote}
                                                >
                                                    + Ajouter une note
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {editingNoteEntries.map((entry, index) => (
                                                    <div key={`${selectedEvent.uid}-${index}`}
                                                         className="modal-note-entry">
                                                        <div className="modal-note-header">
                                                            <span>Note {index + 1}</span>
                                                            <button
                                                                type="button"
                                                                className="modal-note-remove"
                                                                onClick={() => handleRemoveEntry(index)}
                                                                disabled={savingNote}
                                                            >
                                                                Supprimer
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            value={entry}
                                                            onChange={(e) => handleEntryChange(index, e.target.value)}
                                                            className="modal-note-textarea"
                                                            placeholder="Ajoutez vos notes..."
                                                            rows={3}
                                                        />
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    className="modal-note-add secondary"
                                                    onClick={handleAddEntry}
                                                    disabled={savingNote}
                                                >
                                                    + Ajouter une note
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    // Mode lecture pour utilisateurs connectés (avec possibilité de modifier)
                                    <div className="modal-note-view">
                                        {(() => {
                                            const courseNote = courseNotes?.get(selectedEvent.uid);
                                            const modificationHistory = courseNote?.modification_history || [];

                                            // Récupérer la dernière personne (modification ou création)
                                            const lastPerson = modificationHistory.length > 0
                                                ? modificationHistory[modificationHistory.length - 1]
                                                : null;

                                            const formatDateTime = (dateString) => {
                                                if (!dateString) return '';
                                                const date = new Date(dateString);
                                                return date.toLocaleDateString('fr-FR', {
                                                    day: 'numeric',
                                                    month: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                });
                                            };

                                            return (
                                                <div>
                                                    {savedModalEntries.map((entry, index) => (
                                                        <div key={`${selectedEvent.uid}-view-${index}`}>
                                                            <div className="modal-note-view-card">
                                                                <p className="modal-note-view-text">{entry}</p>
                                                            </div>
                                                            {lastPerson && (
                                                                <div className="modal-note-last-person">
                                                                    {lastPerson.user_name || 'Utilisateur inconnu'}
                                                                    {lastPerson.timestamp && ` - ${formatDateTime(lastPerson.timestamp)}`}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                                {/* Actions uniquement pour utilisateurs connectés */}
                                {notesAuthenticated && (
                                    <>
                                        {isModalEditingNotes ? (
                                            <div className="modal-notes-actions">
                                                <button
                                                    type="button"
                                                    className="modal-note-cancel"
                                                    onClick={handleCancelEditing}
                                                    disabled={savingNote}
                                                >
                                                    Annuler
                                                </button>
                                                {modalHasChanges && (
                                                    <button
                                                        onClick={handleSaveNote}
                                                        disabled={savingNote}
                                                        className="modal-note-save"
                                                    >
                                                        {savingNote
                                                            ? "Enregistrement..."
                                                            : sanitizedModalEntries.length === 0
                                                                ? "Enregistrer (supprimer)"
                                                                : "Enregistrer"}
                                                    </button>
                                                )}
                                            </div>
                                        ) : savedModalEntries.length > 0 ? (
                                            <div className="modal-note-view-actions">
                                                <button
                                                    type="button"
                                                    className="modal-note-add"
                                                    onClick={handleStartEditing}
                                                    disabled={savingNote}
                                                >
                                                    ✏️ Modifier
                                                </button>
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Section Actions */}
                        <div className="modal-section modal-actions">
                            {selectedEventLocationMeta?.hasPhysical && (
                                <button
                                    className="action-btn map-btn"
                                    onClick={() => onShowMap(true)}
                                    aria-label="Voir le plan"
                                >
                                    <span className="action-btn-icon">🗺️</span>
                                    <span className="action-btn-text">Voir le plan</span>
                                </button>
                            )}
                            {(() => {
                                const courseId = extractCourseIdFromSummary(selectedEvent.summary || selectedEvent.description || '');
                                if (!courseId) return null;
                                const [yearStart, yearEnd] = getAcademicYearParts(selectedEvent.start || Date.now());
                                const query = `${courseId} ${yearStart} ${yearEnd}`;
                                const moodleUrl = `https://par.moodle.lecnam.net/course/search.php?search=${encodeURIComponent(query)}`;
                                return (
                                    <a
                                        className="action-btn moodle-btn"
                                        href={moodleUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Ouvrir Moodle pour ${courseId}`}
                                    >
                                        <span className="action-btn-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" width="20"
                                                 height="20">
                                                <circle cx="28" cy="28" r="26" fill="white"/>
                                                <g transform="translate(4, 4)">
                                                    <path fill="#ffab40"
                                                          d="M33.5,16c-2.5,0-4.8,1-6.5,2.6C25.3,17,23,16,20.5,16c-5.2,0-9.5,4.3-9.5,9.5V37h6V24.5 c0-1.9,1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5V37h6V24.5c0-1.9,1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5V37h6V25.5C43,20.3,38.7,16,33.5,16z"/>
                                                    <path d="M5.5 16.2H6.5V32H5.5z"/>
                                                    <path fill="#424242"
                                                          d="M22,13c1.1,0.4,2.6,2,3,3c-1.8,1.7-2.6,2.9-3,6c-0.1,1.1-0.9,1.7-2,1c-3.1-1.9-6-2-8-2 c-1-1-0.5-3.7,0-5l6,1L22,13z"/>
                                                    <path fill="#616161" d="M18,17H4l11-7h14L18,17z"/>
                                                    <path fill="#424242"
                                                          d="M7.5,30c0-2.2-0.7-4-1.5-4s-1.5,1.8-1.5,4s0.7,4,1.5,4S7.5,32.2,7.5,30z"/>
                                                </g>
                                            </svg>
                                        </span>
                                        <span className="action-btn-text">Ouvrir Moodle</span>
                                    </a>
                                );
                            })()}
                        </div>

                        {/* Debug info */}
                        {devMode && selectedEvent.description && (
                            <div className="modal-section">
                                <div className="pop-desc">{selectedEvent.description}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

