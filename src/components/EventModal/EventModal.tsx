// @ts-nocheck
"use client";
import { useState, useEffect, useCallback } from "react";
import MapViewer from "@/components/MapViewer/MapViewer";
import CourseFiles from "@/components/CourseFiles/CourseFiles";
import courseFilesStyles from "@/components/CourseFiles/CourseFiles.module.css";
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
import {
    areNoteEntriesEqual,
    parseStoredNoteValue,
    sanitizeNoteEntries,
    HIDDEN_LABEL_PLACEHOLDER,
    buildPersistableNotesLabelsAndPrivacy,
    reindexEntryKeyedState,
    NOTE_PRIVACY_PERSONAL,
} from "@/utils/noteEntries";
import {useI18n} from "@/i18n/I18nContext";
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
    const [entryPrivacy, setEntryPrivacy] = useState({}); // { "0": "personal", ... } — absent = public
    const [originalEntryPrivacy, setOriginalEntryPrivacy] = useState({});
    const [showLabelInputForEntry, setShowLabelInputForEntry] = useState(null); // Index de la note pour lequel l'input est ouvert (null si aucun)
    const [newLabelValue, setNewLabelValue] = useState(""); // Valeur du nouveau label
    const { t } = useI18n();

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
            // Pour l'édition, remplacer le placeholder invisible par une chaîne vide
            const editableEntries = entries.map((entry) =>
                entry === HIDDEN_LABEL_PLACEHOLDER ? "" : entry
            );
            setEditingNoteEntries(editableEntries.length ? [...editableEntries] : []);
            setOriginalNoteEntries(editableEntries);
            setIsModalEditingNotes(false);
            
            // Charger les labels par note
            const entryLabelsData = courseNote?.entry_labels || {};
            setEntryLabels({ ...entryLabelsData });
            setOriginalEntryLabels({ ...entryLabelsData });
            const entryPrivacyData =
                courseNote?.entry_privacy && typeof courseNote.entry_privacy === "object"
                    ? courseNote.entry_privacy
                    : {};
            setEntryPrivacy({ ...entryPrivacyData });
            setOriginalEntryPrivacy({ ...entryPrivacyData });
        } else {
            setEditingNoteEntries([]);
            setOriginalNoteEntries([]);
            setIsModalEditingNotes(false);
            setEntryLabels({});
            setOriginalEntryLabels({});
            setEntryPrivacy({});
            setOriginalEntryPrivacy({});
        }
        setShowLabelInputForEntry(null);
        setNewLabelValue("");
    }, [selectedEvent, courseNotes]);

    // Bloquer uniquement le scroll du body quand la modale est ouverte,
    // sans jamais toucher à la position de scroll (ni à l'ouverture, ni à la fermeture)
    useEffect(() => {
        if (!selectedEvent) return;

        // Ajouter une classe pour d'éventuels styles globaux
        document.body.classList.add("modal-open");
        document.documentElement.classList.add("modal-open");

        // Bloquer le scroll sans modifier la position actuelle
        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        return () => {
            // Retirer la classe
            document.body.classList.remove("modal-open");
            document.documentElement.classList.remove("modal-open");

            // Restaurer l'overflow précédent (la position de scroll n'a jamais été modifiée)
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
        };
    }, [selectedEvent]);

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

    const handleSaveNote = useCallback(async () => {
        if (!selectedEvent || !selectedEvent.uid) return;

        if (userRole === 'visiteur') {
            alert(t('eventModal.visitorCannotEdit'));
            return;
        }

        try {
            setSavingNote(true);

            const { entries: entriesToPersist, labels: normalizedEntryLabels, privacy: normalizedEntryPrivacy } =
                buildPersistableNotesLabelsAndPrivacy(
                    editingNoteEntries,
                    entryLabels,
                    notesAuthenticated && userRole !== "visiteur" ? entryPrivacy : {}
                );

            const res = await fetch("/api/agenda", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    course_uid: selectedEvent.uid,
                    notes: entriesToPersist,
                    entry_labels: normalizedEntryLabels,
                    entry_privacy: normalizedEntryPrivacy,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || t('eventModal.saveError'));
            }

            const data = await res.json();
            // Normaliser les entrées retournées pour l'édition (remplacer le placeholder)
            const serverEntries = Array.isArray(data.note?.entries)
                ? data.note.entries
                : parseStoredNoteValue(data.note?.notes);
            const editableEntries = serverEntries.map((entry) =>
                entry === HIDDEN_LABEL_PLACEHOLDER ? "" : entry
            );

            setOriginalNoteEntries(editableEntries);
            setEditingNoteEntries(editableEntries);

            const entryLabelsData = data.note?.entry_labels || {};
            setOriginalEntryLabels(entryLabelsData);
            setEntryLabels(entryLabelsData);
            const p =
                data.note?.entry_privacy && typeof data.note.entry_privacy === "object"
                    ? data.note.entry_privacy
                    : {};
            setOriginalEntryPrivacy(p);
            setEntryPrivacy(p);
            setIsModalEditingNotes(false);
            if (refreshNotes) {
                refreshNotes();
            }
        } catch (err) {
            console.error("[EventModal] Erreur sauvegarde note:", err);
            alert(t('eventModal.saveError') + " : " + err.message);
        } finally {
            setSavingNote(false);
        }
    }, [selectedEvent, userRole, editingNoteEntries, entryLabels, entryPrivacy, notesAuthenticated, refreshNotes]);

    // Raccourci global Ctrl+Entrée pour enregistrer/supprimer la note (texte ou label)
    useEffect(() => {
        const handleGlobalCtrlEnter = (event) => {
            // Ne rien faire si la modale n'est pas en mode édition ou si on est déjà en sauvegarde
            if (!isModalEditingNotes || savingNote || userRole === 'visiteur') return;
            if (!event.ctrlKey || event.key !== 'Enter') return;

            // On laisse le handler spécifique des textarea gérer leur propre Ctrl+Entrée
            if (event.target && event.target.tagName === 'TEXTAREA') {
                return;
            }

            event.preventDefault();
            // Utiliser toujours la version la plus récente de handleSaveNote
            handleSaveNote();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', handleGlobalCtrlEnter);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('keydown', handleGlobalCtrlEnter);
            }
        };
    }, [isModalEditingNotes, savingNote, userRole, handleSaveNote]);

    if (!selectedEvent) return null;

    const selectedEventLocationMeta = parseLocationMeta(selectedEvent.location);
    const courseNoteForEvent = selectedEvent.uid && courseNotes ? courseNotes.get(selectedEvent.uid) : null;
    const hasDistancielLabel = courseNoteForEvent && courseNoteForEvent.entry_labels
        ? Object.values(courseNoteForEvent.entry_labels).some((labelsArray) =>
            Array.isArray(labelsArray) && labelsArray.includes("Distanciel")
        )
        : false;
    // Cours considéré comme distanciel si :
    // - la localisation ICS contient "visio"
    // - OU un label "Distanciel" a été ajouté dans les notes
    const isDistancielCourse = Boolean(selectedEventLocationMeta?.isVisio || hasDistancielLabel);
    const { matiere, splitGroup } = getEventTitle(selectedEvent) || {};
    const hoursStats = getSubjectHoursStats(matiere, allEvents, selectedEvent);

    // Gestion des notes
    // Vérifier si les entrées de notes ont changé
    const entriesChanged = !areNoteEntriesEqual(editingNoteEntries, originalNoteEntries);
    
    // Vérifier si les labels ont changé
    const labelsChanged = JSON.stringify(entryLabels) !== JSON.stringify(originalEntryLabels);
    const privacyChanged = JSON.stringify(entryPrivacy) !== JSON.stringify(originalEntryPrivacy);
    
    // Il y a des modifications si les entrées OU les labels OU la visibilité ont changé
    const modalHasChanges = entriesChanged || labelsChanged || privacyChanged;
    
    const sanitizedModalEntries = sanitizeNoteEntries(editingNoteEntries);
    const savedModalEntries = sanitizeNoteEntries(originalNoteEntries);
    const hasAnyLabelForModal = Object.values(entryLabels || {}).some(
        (labelsArray) => Array.isArray(labelsArray) && labelsArray.length > 0
    );
    // Cas spécifique : on est en train de transformer une note existante en note vide
    const isDeletingNote = savedModalEntries.length > 0 && sanitizedModalEntries.length === 0;

    const handleEntryChange = (index, value) => {
        setEditingNoteEntries((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleAddEntry = () => {
        if (userRole === 'visiteur') {
            alert(t('eventModal.visitorCannotEdit'));
            return;
        }
        if (!isModalEditingNotes) {
            setIsModalEditingNotes(true);
        }
        setEditingNoteEntries((prev) => [...prev, ""]);
    };

    const handleRemoveEntry = (index) => {
        setEditingNoteEntries((prev) => prev.filter((_, idx) => idx !== index));
        setEntryLabels((prev) => reindexEntryKeyedState(prev, index));
        setEntryPrivacy((prev) => reindexEntryKeyedState(prev, index));
    };

    const handleStartEditing = () => {
        if (userRole === 'visiteur') {
            alert(t('eventModal.visitorCannotEdit'));
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
        setEntryPrivacy(originalEntryPrivacy);
        setIsModalEditingNotes(false);
        setShowLabelInputForEntry(null);
        setNewLabelValue("");
    };

    const handleToggleEntryPrivacy = (index) => {
        if (userRole === "visiteur" || !notesAuthenticated) {
            return;
        }
        const k = String(index);
        setEntryPrivacy((prev) => {
            const next = { ...prev };
            if (next[k] === NOTE_PRIVACY_PERSONAL) {
                delete next[k];
            } else {
                next[k] = NOTE_PRIVACY_PERSONAL;
            }
            return next;
        });
        if (!isModalEditingNotes) {
            setIsModalEditingNotes(true);
        }
    };

    const handleAddNoteButton = () => {
        if (userRole === 'visiteur' || !notesAuthenticated) {
            return;
        }
        if (isModalEditingNotes) {
            handleAddEntry();
        } else {
            handleStartEditing();
        }
    };

    // Labels prédéfinis avec leurs couleurs
    const predefinedLabels = [
        { name: t('agenda.predefinedLabels.control'),       color: "#ef4444" }, // Rouge
        { name: t('agenda.predefinedLabels.gradedTP'),        color: "#10b981" }, // Vert
        { name: t('agenda.predefinedLabels.homework'),         color: "#f59e0b" }, // Orange
        { name: t('agenda.predefinedLabels.exam'),        color: "#a855f7" }, // Violet
        { name: t('agenda.predefinedLabels.link'),           color: "#3b82f6" }, // Bleu
        { name: t('agenda.predefinedLabels.information'),   color: "#fde047" }, // Jaune
        { name: t('agenda.predefinedLabels.remote'),    color: "#06b6d4" }, // Cyan
    ];

    // Fonction pour traduire un label (gère les clés de traduction et les labels traduits)
    const getTranslatedLabel = (labelName) => {
        // Si le label est une clé de traduction (commence par "agenda.predefinedLabels.")
        if (labelName && labelName.startsWith('agenda.predefinedLabels.')) {
            return t(labelName);
        }
        // Sinon, retourner le label tel quel (labels personnalisés ou déjà traduits)
        return labelName;
    };
    

    // Fonction pour générer une couleur à partir d'un label
    const getLabelColor = (labelName) => {
        // Traduire le label si nécessaire pour la comparaison
        const translatedLabel = getTranslatedLabel(labelName);
        
        // Chercher dans les labels prédéfinis
        const predefined = predefinedLabels.find(l => l.name === translatedLabel);
        if (predefined) {
            return predefined.color;
        }
        
        // Générer une couleur basée sur le hash du nom du label
        let hash = 0;
        const labelToHash = translatedLabel || labelName;
        for (let i = 0; i < labelToHash.length; i++) {
            hash = labelToHash.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Générer une couleur HSL avec une saturation et luminosité fixes pour avoir des couleurs vives
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 65%, 50%)`;
    };

    // Gérer les labels par note
    const handleAddLabel = (entryIndex, label) => {
        if (userRole === 'visiteur') {
            alert(t('eventModal.visitorCannotEdit'));
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
            alert(t('eventModal.visitorCannotEdit'));
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
                            {selectedEvent.summary || selectedEvent.description || t('eventModal.course')}
                            {/* Badge Examen si présent dans la description */}
                            {selectedEvent.description && selectedEvent.description.toUpperCase().includes("EXAMEN") && (
                                <span className="exam-badge-modal" title={t('eventModal.exam')}>
                                    📝 {t('eventModal.exam').toUpperCase()}
                                </span>
                            )}
                        </div>
                        <button className="event-modal-close" aria-label={t('eventModal.close')}
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
                                    <span>{t('eventModal.duration')} : {formatDurationHM(selectedEvent.start, selectedEvent.end)}</span>
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
                                            <span>{(splitGroup && splitGroup.professors.length > 1 ? t('eventModal.teacherPlural') : t('eventModal.teacher'))} : {profName || "?"}</span>
                                        </div>
                                    </>
                                );
                            })()}
                            <div className="pop-row location-row">
                                <span>{isDistancielCourse ? '🎥' : '🚪'}</span>
                                <span>
                                    {isDistancielCourse
                                        ? t('eventModal.remote')
                                        : splitGroup
                                            ? `${splitGroup.rooms.length > 1 ? t('eventModal.roomPlural') : t('eventModal.room')} : ${splitGroup.rooms.join(' / ')}`
                                            : `${t('eventModal.room')} : ${selectedEventLocationMeta ? selectedEventLocationMeta.display : "?"}`}
                                </span>
                                {isDistancielCourse ? (
                                    <span className="site-badge distanciel-badge">{t('eventModal.remoteBadge')}</span>
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
                            const isExpanded = progressionExpanded.get(progressionKey) ?? true;

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
                                            <span className="hours-stats-label">{t('eventModal.progression')}</span>
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
                                                                className="hours-stats-remaining">{formatHoursDecimal(hoursStats.remaining)} {t('eventModal.remainingAfter')}</span>
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
                                        <h3>📋 {t('eventModal.notes')}</h3>
                                    </div>
                                    {notesAuthenticated && (
                                        <button
                                            type="button"
                                            className={courseFilesStyles.uploadButton}
                                            onClick={handleAddNoteButton}
                                            disabled={savingNote || userRole === 'visiteur'}
                                            title={userRole === 'visiteur' ? t('eventModal.visitorCannotCreate') : ""}
                                        >
                                            {isModalEditingNotes
                                                ? t('eventModal.addParagraph')
                                                : ((savedModalEntries.length > 0 || hasAnyLabelForModal)
                                                    ? "✏️ " + t('eventModal.editNote')
                                                    : t('eventModal.createNote'))}
                                        </button>
                                    )}
                                </div>
                                
                                
                                {!notesAuthenticated ? (
                                    // Mode lecture seule pour utilisateurs non connectés
                                    <div className="modal-note-view">
                                        {(() => {
                                            const courseNote = courseNotes?.get(selectedEvent.uid);
                                            const entryLabelsMap = courseNote?.entry_labels || {};
                                            const hasAnyLabel = Object.values(entryLabelsMap).some(
                                                (labelsArray) => Array.isArray(labelsArray) && labelsArray.length > 0
                                            );
                                            const hasAnyContent = savedModalEntries.length > 0 || hasAnyLabel;

                                            if (!hasAnyContent) {
                                                return (
                                                    <div className="modal-notes-empty">
                                                        <p className="modal-note-view-text">{t('eventModal.noNotes')}</p>
                                                        <div className="modal-auth-message" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                                            <p className="modal-auth-message-text">
                                                                <a href="/login" className={styles.notesUnauthLink}>
                                                                    {t('eventModal.connectToCreate')}
                                                                </a> {t('eventModal.connectToCreateFull').replace(t('eventModal.connectToCreate'), '').trim()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const modificationHistory = courseNote?.modification_history || [];
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

                                            // Si pas de texte mais des labels, générer des entrées vides pour l'affichage
                                            const indexes =
                                                savedModalEntries.length > 0
                                                    ? savedModalEntries.map((_, i) => i)
                                                    : Object.keys(entryLabelsMap)
                                                        .map((k) => parseInt(k, 10))
                                                        .filter((n) => !Number.isNaN(n))
                                                        .sort((a, b) => a - b);

                                            const displayEntries =
                                                savedModalEntries.length > 0
                                                    ? savedModalEntries
                                                    : indexes.map(() => "");

                                            return (
                                                <div>
                                                    {displayEntries.map((entry, index) => {
                                                        const entryLabelsForIndex =
                                                            (entryLabelsMap && entryLabelsMap[String(index)]) || [];
                                                        const isLabelOnly =
                                                            entry === HIDDEN_LABEL_PLACEHOLDER ||
                                                            (!entry && entryLabelsForIndex.length > 0);
                                                        return (
                                                            <div key={`${selectedEvent.uid}-view-${index}`}>
                                                                {/* Labels pour cette note */}
                                                                {entryLabelsForIndex.length > 0 && (
                                                                    <div className="modal-note-labels-inline">
                                                                        {entryLabelsForIndex.map((label, idx) => {
                                                                            const labelColor = getLabelColor(label);
                                                                            const translatedLabel = getTranslatedLabel(label);
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
                                                                                    {translatedLabel}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {!isLabelOnly && (
                                                                    <div className="modal-note-view-card">
                                                                        <p className="modal-note-view-text">{entry}</p>
                                                                    </div>
                                                                )}
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
                                                                {t('eventModal.connectToCreate')}
                                                            </a> {t('eventModal.connectToEdit').replace(t('eventModal.connectToCreate'), '').trim()}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : !isModalEditingNotes && savedModalEntries.length === 0 ? (
                                    (() => {
                                        const courseNote = courseNotes?.get(selectedEvent.uid);
                                        const entryLabelsMap = courseNote?.entry_labels || {};
                                        const hasAnyLabel = Object.values(entryLabelsMap).some(
                                            (labelsArray) => Array.isArray(labelsArray) && labelsArray.length > 0
                                        );
                                        if (!hasAnyLabel) {
                                            // Utilisateur connecté, aucune note ni label
                                            return (
                                                <div className="modal-notes-empty">
                                                    <p className="modal-note-view-text">{t('eventModal.noNotes')}</p>
                                                </div>
                                            );
                                        }
                                        // Il y a au moins un label : on bascule vers le bloc "vue" ci-dessous
                                        return (
                                            <div className="modal-note-view">
                                                {(() => {
                                                    const modificationHistory = courseNote?.modification_history || [];
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

                                                    const indexes = Object.keys(entryLabelsMap)
                                                        .map((k) => parseInt(k, 10))
                                                        .filter((n) => !Number.isNaN(n))
                                                        .sort((a, b) => a - b);

                                                    return (
                                                        <div>
                                                            {indexes.map((index) => {
                                                                const entry = savedModalEntries[index] || "";
                                                                const entryLabelsForIndex =
                                                                    (entryLabelsMap && entryLabelsMap[String(index)]) || [];
                                                                const isLabelOnly =
                                                                    entry === HIDDEN_LABEL_PLACEHOLDER ||
                                                                    (!entry && entryLabelsForIndex.length > 0);
                                                                return (
                                                                    <div key={`${selectedEvent.uid}-view-${index}`}>
                                                                        {entryLabelsForIndex.length > 0 && (
                                                                            <div className="modal-note-labels-inline">
                                                                                {entryLabelsForIndex.map((label, idx) => {
                                                                                    const labelColor = getLabelColor(label);
                                                                                    const translatedLabel = getTranslatedLabel(label);
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
                                                                                            {translatedLabel}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                        {!isLabelOnly && (
                                                                            <div className="modal-note-view-card">
                                                                                <p className="modal-note-view-text">{entry}</p>
                                                                            </div>
                                                                        )}
                                                                        {lastPerson && (
                                                                            <div className="modal-note-last-person">
                                                                                {lastPerson.user_name || t('eventModal.unknownUser')}
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
                                        );
                                    })()
                                ) : isModalEditingNotes ? (
                                    // Mode édition pour utilisateurs connectés
                                    <div
                                        className="modal-notes-list"
                                        onKeyDown={(e) => {
                                            if (e.ctrlKey && e.key === 'Enter' && !savingNote && userRole !== 'visiteur' && e.target.tagName !== 'TEXTAREA') {
                                                e.preventDefault();
                                                handleSaveNote();
                                            }
                                        }}
                                    >
                                        {editingNoteEntries.length === 0 ? (
                                            <div className="modal-notes-empty">
                                                <p>Aucune note</p>
                                            </div>
                                        ) : (
                                            <>
                                                {editingNoteEntries.map((entry, index) => {
                                                    const entryLabelsForIndex = entryLabels[String(index)] || [];
                                                    return (
                                                        <div key={`${selectedEvent.uid}-${index}`}
                                                            className="modal-note-entry">
                                                            <div className="modal-note-header">
                                                                <span>
                                                                    {t('eventModal.noteNumber')} {index + 1}
                                                                    {entryPrivacy[String(index)] === NOTE_PRIVACY_PERSONAL && (
                                                                        <span className="modal-note-privacy-badge" title={t('eventModal.personalNoteHint')}> 🔒</span>
                                                                    )}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className="modal-note-remove"
                                                                    onClick={() => handleRemoveEntry(index)}
                                                                    disabled={savingNote || userRole === 'visiteur'}
                                                                    title={userRole === 'visiteur' ? t('eventModal.visitorCannotModify') : ""}
                                                                >
                                                                    {t('eventModal.delete')}
                                                                </button>
                                                            </div>
                                                            {notesAuthenticated && userRole !== 'visiteur' && (
                                                                <label className="modal-note-privacy-toggle">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={entryPrivacy[String(index)] === NOTE_PRIVACY_PERSONAL}
                                                                        onChange={() => handleToggleEntryPrivacy(index)}
                                                                        disabled={savingNote}
                                                                    />
                                                                    <span>{t('eventModal.personalNote')}</span>
                                                                </label>
                                                            )}
                                                            
                                                            {/* Labels pour ce paragraphe */}
                                                            <div className="modal-labels-section">
                                                                <div className="modal-labels-header">
                                                                    <span className="modal-labels-title">{t('eventModal.labels')}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (userRole === 'visiteur') {
                                                                                alert(t('eventModal.visitorCannotEdit'));
                                                                                return;
                                                                            }
                                                                            if (!isModalEditingNotes) {
                                                                                setIsModalEditingNotes(true);
                                                                            }
                                                                            setShowLabelInputForEntry(showLabelInputForEntry === index ? null : index);
                                                                        }}
                                                                        className="modal-add-label-button"
                                                                        title={t('eventModal.createLabelTitle')}
                                                                        disabled={userRole === 'visiteur'}
                                                                    >
                                                                        {t('eventModal.createLabel')}
                                                                    </button>
                                                                </div>
                                                                
                                                                {/* Labels existants pour cette note */}
                                                                <div className="modal-labels-list">
                                                                    {entryLabelsForIndex.length > 0 ? (
                                                                        entryLabelsForIndex.map((label, idx) => {
                                                                            const labelColor = getLabelColor(label);
                                                                            const translatedLabel = getTranslatedLabel(label);
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
                                                                                    {translatedLabel}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleRemoveLabel(index, label)}
                                                                                        className="modal-remove-label-button"
                                                                                        title={t('eventModal.removeLabel')}
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
                                                                            {isModalEditingNotes ? t('eventModal.noLabelsForNote') : t('eventModal.noLabels')}
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
                                                                            placeholder={t('eventModal.labelPlaceholder')}
                                                                            className="modal-custom-label-input-field"
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleCreateCustomLabel(index)}
                                                                            disabled={!newLabelValue.trim() || entryLabelsForIndex.includes(newLabelValue.trim())}
                                                                            className="modal-custom-label-add-button"
                                                                        >
                                                                            {t('eventModal.add')}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setShowLabelInputForEntry(null);
                                                                                setNewLabelValue("");
                                                                            }}
                                                                            className="modal-custom-label-cancel-button"
                                                                        >
                                                                            {t('eventModal.cancel')}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <textarea
                                                                value={entry}
                                                                onChange={(e) => handleEntryChange(index, e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.ctrlKey && e.key === 'Enter' && !savingNote && userRole !== 'visiteur') {
                                                                        e.preventDefault();
                                                                        handleSaveNote();
                                                                    }
                                                                }}
                                                                className="modal-note-textarea"
                                                                placeholder={userRole === 'visiteur' ? t('eventModal.visitorCannotModify') : t('eventModal.addNotesPlaceholder')}
                                                                rows={3}
                                                                disabled={userRole === 'visiteur'}
                                                            />
                                                        </div>
                                                    );
                                                })}
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
                                                        const isLabelOnly = entry === HIDDEN_LABEL_PLACEHOLDER || (!entry && entryLabelsForIndex.length > 0);
                                                        return (
                                                            <div key={`${selectedEvent.uid}-view-${index}`}>
                                                                {/* Labels pour cette note */}
                                                                {entryLabelsForIndex.length > 0 && (
                                                                    <div className="modal-note-labels-inline">
                                                                        {entryLabelsForIndex.map((label, idx) => {
                                                                            const labelColor = getLabelColor(label);
                                                                            const translatedLabel = getTranslatedLabel(label);
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
                                                                                    {translatedLabel}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {!isLabelOnly && (
                                                                    <div className="modal-note-view-card">
                                                                        <p className="modal-note-view-text">{entry}</p>
                                                                    </div>
                                                                )}
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
                                                    {t('eventModal.cancel')}
                                                </button>
                                                {modalHasChanges && (
                                                    <button
                                                        onClick={handleSaveNote}
                                                        disabled={savingNote || userRole === 'visiteur'}
                                                        className="modal-note-save"
                                                        title={userRole === 'visiteur' ? t('eventModal.visitorCannotEdit') : ""}
                                                    >
                                                        {savingNote
                                                            ? t('common.loading')
                                                            : isDeletingNote
                                                                ? t('eventModal.saveNote') + " (" + t('eventModal.delete') + ")"
                                                                : t('eventModal.saveNote')}
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
                                    aria-label={t('eventModal.map')}
                                >
                                    <span className="action-btn-icon">🗺️</span>
                                    <span className="action-btn-text">{t('eventModal.map')}</span>
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
                                        aria-label={`${t('eventModal.map')} ${courseId}`}
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
                                        <span className="action-btn-text">Moodle</span>
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


