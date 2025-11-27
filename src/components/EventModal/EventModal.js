"use client";
import { useState, useEffect } from "react";
import MapViewer from "@/components/MapViewer/MapViewer";
import CourseFiles from "@/components/CourseFiles/CourseFiles";
import {
    formatDurationHM,
    getSubjectHoursStats,
    formatHoursDecimal,
    extractCourseIdFromSummary,
    extractCourseType,
    parseLocationMeta,
    getAcademicYearParts
} from "@/utils/eventModalUtils";
import { getEventTitle } from "@/utils/eventUtils";
import { areNoteEntriesEqual, parseStoredNoteValue, sanitizeNoteEntries } from "@/utils/noteEntries";
import styles from "@/app/page.module.css";

export default function EventModal({
    selectedEvent,
    clickPosition = null,
    onClose,
    onShowMap,
    showMap,
    allEvents,
    progressionExpanded,
    setProgressionExpanded,
    courseNotes,
    notesAuthenticated,
    refreshNotes,
    devMode,
    userRole = null
}) {
    const [editingNoteEntries, setEditingNoteEntries] = useState([]);
    const [originalNoteEntries, setOriginalNoteEntries] = useState([]);
    const [savingNote, setSavingNote] = useState(false);
    const [isModalEditingNotes, setIsModalEditingNotes] = useState(false);
    const [entryLabels, setEntryLabels] = useState({}); // Labels par note : { "0": ["Contrôle"], "1": ["Devoir"] }
    const [originalEntryLabels, setOriginalEntryLabels] = useState({}); // Labels originaux pour détecter les modifications
    const [showLabelInputForEntry, setShowLabelInputForEntry] = useState(null); // Index de la note pour lequel l'input est ouvert (null si aucun)
    const [newLabelValue, setNewLabelValue] = useState(""); // Valeur du nouveau label

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
            
            // Charger les labels par note
            const entryLabelsData = courseNote?.entry_labels || {};
            setEntryLabels({ ...entryLabelsData });
            setOriginalEntryLabels({ ...entryLabelsData });
        } else {
            setEditingNoteEntries([]);
            setOriginalNoteEntries([]);
            setIsModalEditingNotes(false);
            setEntryLabels({});
            setOriginalEntryLabels({});
        }
        setShowLabelInputForEntry(null);
        setNewLabelValue("");
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
    const { matiere, splitGroup } = getEventTitle(selectedEvent) || {};
    const hoursStats = getSubjectHoursStats(matiere, allEvents, selectedEvent);

    // Gestion des notes
    // Vérifier si les entrées de notes ont changé
    const entriesChanged = !areNoteEntriesEqual(editingNoteEntries, originalNoteEntries);
    
    // Vérifier si les labels ont changé
    const labelsChanged = JSON.stringify(entryLabels) !== JSON.stringify(originalEntryLabels);
    
    // Il y a des modifications si les entrées OU les labels ont changé
    const modalHasChanges = entriesChanged || labelsChanged;
    
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
        if (userRole === 'visiteur') {
            alert("Les visiteurs ne peuvent pas créer ou modifier de notes");
            return;
        }
        if (!isModalEditingNotes) {
            setIsModalEditingNotes(true);
        }
        setEditingNoteEntries((prev) => [...prev, ""]);
    };

    const handleRemoveEntry = (index) => {
        setEditingNoteEntries((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleStartEditing = () => {
        if (userRole === 'visiteur') {
            alert("Les visiteurs ne peuvent pas créer ou modifier de notes");
            return;
        }
        setIsModalEditingNotes(true);
        if (editingNoteEntries.length === 0) {
            setEditingNoteEntries([""]);
        }
    };

    const handleCancelEditing = () => {
        setEditingNoteEntries(originalNoteEntries);
        setEntryLabels(originalEntryLabels);
        setIsModalEditingNotes(false);
        setShowLabelInputForEntry(null);
        setNewLabelValue("");
    };

    // Labels prédéfinis avec leurs couleurs
    const predefinedLabels = [
        { name: "Contrôle", color: "#ef4444" }, // Rouge
        { name: "Devoir", color: "#f59e0b" }, // Orange
        { name: "Examens", color: "#a855f7" }, // Violet
        { name: "Lien", color: "#3b82f6" }, // Bleu
        { name: "Information", color: "#10b981" }, // Vert
    ];

    // Fonction pour générer une couleur à partir d'un label
    const getLabelColor = (labelName) => {
        // Chercher dans les labels prédéfinis
        const predefined = predefinedLabels.find(l => l.name === labelName);
        if (predefined) {
            return predefined.color;
        }
        
        // Générer une couleur basée sur le hash du nom du label
        let hash = 0;
        for (let i = 0; i < labelName.length; i++) {
            hash = labelName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Générer une couleur HSL avec une saturation et luminosité fixes pour avoir des couleurs vives
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 65%, 50%)`;
    };

    // Gérer les labels par note
    const handleAddLabel = (entryIndex, label) => {
        if (userRole === 'visiteur') {
            alert("Les visiteurs ne peuvent pas créer ou modifier de notes");
            return;
        }
        
        // Activer le mode édition si ce n'est pas déjà le cas
        if (!isModalEditingNotes) {
            setIsModalEditingNotes(true);
        }
        
        const labelName = typeof label === 'string' ? label : label.name;
        if (!labelName.trim()) return;
        
        const indexStr = String(entryIndex);
        setEntryLabels(prev => {
            const currentLabels = prev[indexStr] || [];
            if (!currentLabels.includes(labelName.trim())) {
                return {
                    ...prev,
                    [indexStr]: [...currentLabels, labelName.trim()]
                };
            }
            return prev;
        });
    };

    const handleRemoveLabel = (entryIndex, labelToRemove) => {
        if (userRole === 'visiteur') {
            alert("Les visiteurs ne peuvent pas créer ou modifier de notes");
            return;
        }
        
        // Activer le mode édition si ce n'est pas déjà le cas
        if (!isModalEditingNotes) {
            setIsModalEditingNotes(true);
        }
        
        const indexStr = String(entryIndex);
        setEntryLabels(prev => {
            const currentLabels = prev[indexStr] || [];
            return {
                ...prev,
                [indexStr]: currentLabels.filter(label => label !== labelToRemove)
            };
        });
    };

    const handleCreateCustomLabel = (entryIndex) => {
        if (newLabelValue.trim()) {
            handleAddLabel(entryIndex, newLabelValue.trim());
            setNewLabelValue("");
            setShowLabelInputForEntry(null);
        }
    };

    const handleSaveNote = async () => {
        if (!selectedEvent || !selectedEvent.uid) return;

        if (userRole === 'visiteur') {
            alert("Les visiteurs ne peuvent pas créer ou modifier de notes");
            return;
        }

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
                    entry_labels: entryLabels,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la sauvegarde");
            }

            const data = await res.json();
            setOriginalNoteEntries(sanitizedModalEntries);
            const entryLabelsData = data.note?.entry_labels || {};
            setOriginalEntryLabels(entryLabelsData);
            setEntryLabels(entryLabelsData);
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
                <div className="event-modal-overlay" onClick={onClose} />
                <div 
                    className={`event-modal ${clickPosition ? 'event-modal-expanding' : ''}`}
                    style={clickPosition ? {
                        '--origin-x': `${clickPosition.x}px`,
                        '--origin-y': `${clickPosition.y}px`,
                        '--origin-width': `${clickPosition.width}px`,
                        '--origin-height': `${clickPosition.height}px`
                    } : {}}
                >
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
                                const { prof: extractedProf } = getEventTitle(selectedEvent) || {};
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
                                            <span>Professeur{splitGroup && splitGroup.professors.length > 1 ? 's' : ''} : {profName || "?"}</span>
                                        </div>
                                    </>
                                );
                            })()}
                            <div className="pop-row location-row">
                                <span>{selectedEventLocationMeta?.isVisio ? '🎥' : '🚪'}</span>
                                <span>
                                    {selectedEventLocationMeta?.isVisio
                                        ? selectedEventLocationMeta.display
                                        : splitGroup
                                            ? `Salle${splitGroup.rooms.length > 1 ? 's' : ''} : ${splitGroup.rooms.join(' / ')}`
                                            : `Salle : ${selectedEventLocationMeta ? selectedEventLocationMeta.display : "?"}`}
                                </span>
                                {selectedEventLocationMeta?.isVisio ? (
                                    <span className="site-badge visio-badge">VISIO</span>
                                ) : splitGroup ? (
                                    (() => {
                                        // Détecter le site pour chaque salle du demi-groupe
                                        const getCnamSite = (location) => {
                                            if (!location || typeof location !== 'string') return null;
                                            const cleaned = location.trim();
                                            const match = cleaned.match(/^(\d+)(bis)?[\.\-\s]/i);
                                            if (!match) return null;
                                            const streetNumber = match[1];
                                            const isBis = !!match[2];
                                            const conteNumbers = ['30', '31', '33', '34', '35', '37', '39'];
                                            const saintMartinNumbers = ['1', '2', '3', '4', '5', '6', '7', '9', '10', '11', '12', '13', '14', '15', '16', '17', '21', '23', '27'];
                                            if (conteNumbers.includes(streetNumber)) {
                                                return { site: 'Conté', fullName: 'Conté', color: '#10b981' };
                                            }
                                            if (saintMartinNumbers.includes(streetNumber) || (streetNumber === '9' && isBis)) {
                                                return { site: 'St-Martin', fullName: 'Saint-Martin', color: '#f59e0b' };
                                            }
                                            return null;
                                        };

                                        const sites = splitGroup.rooms.map(room => getCnamSite(room)).filter(Boolean);

                                        // Si toutes les salles sont sur le même site, afficher un seul badge
                                        if (sites.length > 0 && sites.every(s => s.site === sites[0].site)) {
                                            return (
                                                <span
                                                    className="site-badge"
                                                    style={{
                                                        backgroundColor: sites[0].color,
                                                        color: 'white'
                                                    }}
                                                >
                                                    {sites[0].site}
                                                </span>
                                            );
                                        }

                                        // Sinon, afficher un badge par site unique
                                        const uniqueSites = Array.from(new Map(sites.map(s => [s.site, s])).values());
                                        return uniqueSites.map((siteInfo, idx) => (
                                            <span
                                                key={idx}
                                                className="site-badge"
                                                style={{
                                                    backgroundColor: siteInfo.color,
                                                    color: 'white',
                                                    marginLeft: idx > 0 ? '4px' : '0'
                                                }}
                                            >
                                                {siteInfo.site}
                                            </span>
                                        ));
                                    })()
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
                            const isExpanded = progressionExpanded.get(progressionKey) || true;

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
                                            style={{ cursor: 'pointer' }}
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
                                                            style={{ width: `${hoursStats.percentage}%` }}
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
                            <div className="modal-section modal-section-dashed">
                                <div className="modal-notes-header">
                                    <div className="modal-notes-title">
                                        <h3>📋 Notes</h3>
                                    </div>
                                    {notesAuthenticated && !isModalEditingNotes && savedModalEntries.length > 0 && userRole !== 'visiteur' && (
                                        <button
                                            type="button"
                                            className="modal-note-add"
                                            onClick={handleStartEditing}
                                            disabled={savingNote}
                                        >
                                            ✏️ Modifier
                                        </button>
                                    )}
                                </div>
                                
                                
                                {!notesAuthenticated ? (
                                    // Mode lecture seule pour utilisateurs non connectés
                                    <div className="modal-note-view">
                                        {savedModalEntries.length === 0 ? (
                                            <div className="modal-notes-empty">
                                                <p className="modal-note-view-text">Aucune note</p>
                                                <div className="modal-auth-message" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                                    <p className="modal-auth-message-text">
                                                        <a href="/login" className={styles.notesUnauthLink}>
                                                            Connectez-vous
                                                        </a> pour ajouter des notes
                                                    </p>
                                                </div>
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
                                                        {savedModalEntries.map((entry, index) => {
                                                            const courseNote = courseNotes?.get(selectedEvent.uid);
                                                            const entryLabelsForIndex = (courseNote?.entry_labels && courseNote.entry_labels[String(index)]) || [];
                                                            return (
                                                                <div key={`${selectedEvent.uid}-view-${index}`}>
                                                                    {/* Labels pour cette note */}
                                                                    {entryLabelsForIndex.length > 0 && (
                                                                        <div className="modal-note-labels-inline">
                                                                            {entryLabelsForIndex.map((label, idx) => {
                                                                                const labelColor = getLabelColor(label);
                                                                                return (
                                                                                    <span 
                                                                                        key={idx} 
                                                                                        className="modal-label-inline"
                                                                                        style={{ 
                                                                                            backgroundColor: `${labelColor}15`,
                                                                                            borderColor: labelColor,
                                                                                            color: labelColor
                                                                                        }}
                                                                                    >
                                                                                        {label}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
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
                                                            );
                                                        })}
                                                        <div className="modal-auth-message" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                                                            <p className="modal-auth-message-text">
                                                                <a href="/login" className={styles.notesUnauthLink}>
                                                                    Connectez-vous
                                                                </a> pour modifier cette note
                                                            </p>
                                                        </div>
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
                                                if (userRole === 'visiteur') {
                                                    alert("Les visiteurs ne peuvent pas créer ou modifier de notes");
                                                    return;
                                                }
                                                setIsModalEditingNotes(true);
                                                setEditingNoteEntries([""]);
                                            }}
                                            disabled={savingNote || userRole === 'visiteur'}
                                            title={userRole === 'visiteur' ? "Les visiteurs ne peuvent pas créer de notes" : ""}
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
                                                    disabled={savingNote || userRole === 'visiteur'}
                                                    title={userRole === 'visiteur' ? "Les visiteurs ne peuvent pas créer de notes" : ""}
                                                >
                                                    + Ajouter une note
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {editingNoteEntries.map((entry, index) => {
                                                    const entryLabelsForIndex = entryLabels[String(index)] || [];
                                                    return (
                                                        <div key={`${selectedEvent.uid}-${index}`}
                                                            className="modal-note-entry">
                                                            <div className="modal-note-header">
                                                                <span>Note {index + 1}</span>
                                                                <button
                                                                    type="button"
                                                                    className="modal-note-remove"
                                                                    onClick={() => handleRemoveEntry(index)}
                                                                    disabled={savingNote || userRole === 'visiteur'}
                                                                    title={userRole === 'visiteur' ? "Les visiteurs ne peuvent pas modifier de notes" : ""}
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            </div>
                                                            
                                                            {/* Labels pour ce paragraphe */}
                                                            <div className="modal-labels-section">
                                                                <div className="modal-labels-header">
                                                                    <span className="modal-labels-title">Labels</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (userRole === 'visiteur') {
                                                                                alert("Les visiteurs ne peuvent pas créer ou modifier de notes");
                                                                                return;
                                                                            }
                                                                            if (!isModalEditingNotes) {
                                                                                setIsModalEditingNotes(true);
                                                                            }
                                                                            setShowLabelInputForEntry(showLabelInputForEntry === index ? null : index);
                                                                        }}
                                                                        className="modal-add-label-button"
                                                                        title="Créer un label personnalisé"
                                                                        disabled={userRole === 'visiteur'}
                                                                    >
                                                                        + Nouveau
                                                                    </button>
                                                                </div>
                                                                
                                                                {/* Labels existants pour cette note */}
                                                                <div className="modal-labels-list">
                                                                    {entryLabelsForIndex.length > 0 ? (
                                                                        entryLabelsForIndex.map((label, idx) => {
                                                                            const labelColor = getLabelColor(label);
                                                                            return (
                                                                                <span 
                                                                                    key={idx} 
                                                                                    className="modal-label"
                                                                                    style={{ 
                                                                                        backgroundColor: `${labelColor}15`,
                                                                                        borderColor: labelColor,
                                                                                        color: labelColor
                                                                                    }}
                                                                                >
                                                                                    {label}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleRemoveLabel(index, label)}
                                                                                        className="modal-remove-label-button"
                                                                                        title="Supprimer ce label"
                                                                                        style={{ color: labelColor }}
                                                                                        disabled={userRole === 'visiteur'}
                                                                                    >
                                                                                        ×
                                                                                    </button>
                                                                                </span>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <span className="modal-no-labels-text">
                                                                            {isModalEditingNotes ? "Aucun label pour cette note." : "Aucun label"}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Boutons des labels prédéfinis */}
                                                                <div className="modal-predefined-labels">
                                                                    {predefinedLabels.map((labelObj) => (
                                                                        <button
                                                                            key={labelObj.name}
                                                                            type="button"
                                                                            onClick={() => handleAddLabel(index, labelObj.name)}
                                                                            disabled={entryLabelsForIndex.includes(labelObj.name) || userRole === 'visiteur'}
                                                                            className={`modal-predefined-label-button ${entryLabelsForIndex.includes(labelObj.name) ? 'modal-predefined-label-button-disabled' : ''}`}
                                                                            style={!entryLabelsForIndex.includes(labelObj.name) ? {
                                                                                borderColor: labelObj.color,
                                                                                color: labelObj.color
                                                                            } : {
                                                                                backgroundColor: `${labelObj.color}15`,
                                                                                borderColor: labelObj.color,
                                                                                color: labelObj.color
                                                                            }}
                                                                        >
                                                                            {labelObj.name}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* Input pour créer un label personnalisé */}
                                                                {showLabelInputForEntry === index && (
                                                                    <div className="modal-custom-label-input">
                                                                        <input
                                                                            type="text"
                                                                            value={newLabelValue}
                                                                            onChange={(e) => setNewLabelValue(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    handleCreateCustomLabel(index);
                                                                                } else if (e.key === 'Escape') {
                                                                                    setShowLabelInputForEntry(null);
                                                                                    setNewLabelValue("");
                                                                                }
                                                                            }}
                                                                            placeholder="Nom du label..."
                                                                            className="modal-custom-label-input-field"
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleCreateCustomLabel(index)}
                                                                            disabled={!newLabelValue.trim() || entryLabelsForIndex.includes(newLabelValue.trim())}
                                                                            className="modal-custom-label-add-button"
                                                                        >
                                                                            Ajouter
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setShowLabelInputForEntry(null);
                                                                                setNewLabelValue("");
                                                                            }}
                                                                            className="modal-custom-label-cancel-button"
                                                                        >
                                                                            Annuler
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <textarea
                                                                value={entry}
                                                                onChange={(e) => handleEntryChange(index, e.target.value)}
                                                                className="modal-note-textarea"
                                                                placeholder={userRole === 'visiteur' ? "Les visiteurs ne peuvent pas modifier de notes" : "Ajoutez vos notes..."}
                                                                rows={3}
                                                                disabled={userRole === 'visiteur'}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                                <button
                                                    type="button"
                                                    className="modal-note-add secondary"
                                                    onClick={handleAddEntry}
                                                    disabled={savingNote || userRole === 'visiteur'}
                                                    title={userRole === 'visiteur' ? "Les visiteurs ne peuvent pas créer de notes" : ""}
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
                                                    {savedModalEntries.map((entry, index) => {
                                                        const entryLabelsForIndex = (courseNote?.entry_labels && courseNote.entry_labels[String(index)]) || [];
                                                        return (
                                                            <div key={`${selectedEvent.uid}-view-${index}`}>
                                                                {/* Labels pour cette note */}
                                                                {entryLabelsForIndex.length > 0 && (
                                                                    <div className="modal-note-labels-inline">
                                                                        {entryLabelsForIndex.map((label, idx) => {
                                                                            const labelColor = getLabelColor(label);
                                                                            return (
                                                                                <span 
                                                                                    key={idx} 
                                                                                    className="modal-label-inline"
                                                                                    style={{ 
                                                                                        backgroundColor: `${labelColor}15`,
                                                                                        borderColor: labelColor,
                                                                                        color: labelColor
                                                                                    }}
                                                                                >
                                                                                    {label}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
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
                                                        );
                                                    })}
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
                                                        disabled={savingNote || userRole === 'visiteur'}
                                                        className="modal-note-save"
                                                        title={userRole === 'visiteur' ? "Les visiteurs ne peuvent pas créer ou modifier de notes" : ""}
                                                    >
                                                        {savingNote
                                                            ? "Enregistrement..."
                                                            : sanitizedModalEntries.length === 0
                                                                ? "Enregistrer (supprimer)"
                                                                : "Enregistrer"}
                                                    </button>
                                                )}
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Section Fichiers */}
                        {selectedEvent.uid && (
                            <CourseFiles 
                                courseUid={selectedEvent.uid} 
                                authenticated={notesAuthenticated}
                            />
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
                                                <circle cx="28" cy="28" r="26" fill="white" />
                                                <g transform="translate(4, 4)">
                                                    <path fill="#ffab40"
                                                        d="M33.5,16c-2.5,0-4.8,1-6.5,2.6C25.3,17,23,16,20.5,16c-5.2,0-9.5,4.3-9.5,9.5V37h6V24.5 c0-1.9,1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5V37h6V24.5c0-1.9,1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5V37h6V25.5C43,20.3,38.7,16,33.5,16z" />
                                                    <path d="M5.5 16.2H6.5V32H5.5z" />
                                                    <path fill="#424242"
                                                        d="M22,13c1.1,0.4,2.6,2,3,3c-1.8,1.7-2.6,2.9-3,6c-0.1,1.1-0.9,1.7-2,1c-3.1-1.9-6-2-8-2 c-1-1-0.5-3.7,0-5l6,1L22,13z" />
                                                    <path fill="#616161" d="M18,17H4l11-7h14L18,17z" />
                                                    <path fill="#424242"
                                                        d="M7.5,30c0-2.2-0.7-4-1.5-4s-1.5,1.8-1.5,4s0.7,4,1.5,4S7.5,32.2,7.5,30z" />
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

