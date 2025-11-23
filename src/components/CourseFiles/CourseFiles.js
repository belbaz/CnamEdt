"use client";
import { useState, useEffect } from "react";
import styles from "./CourseFiles.module.css";

/**
 * Composant pour gérer les fichiers d'un cours
 * Affiche la liste des fichiers et permet l'upload
 */
export default function CourseFiles({ courseUid, authenticated }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    // Charger les fichiers au montage et quand courseUid change
    useEffect(() => {
        if (courseUid) {
            loadFiles();
        } else {
            setFiles([]);
            setLoading(false);
        }
    }, [courseUid]);

    const loadFiles = async () => {
        if (!courseUid) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/files/list?course_uid=${encodeURIComponent(courseUid)}`);
            const data = await response.json();

            if (data.success) {
                setFiles(data.files || []);
            } else {
                setError(data.error || "Erreur lors du chargement des fichiers");
            }
        } catch (err) {
            console.error("[CourseFiles] Erreur chargement fichiers:", err);
            setError("Erreur lors du chargement des fichiers");
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!authenticated) {
            setError("Vous devez être connecté pour uploader des fichiers");
            return;
        }

        if (!courseUid) {
            setError("Aucun cours sélectionné");
            return;
        }

        try {
            setUploading(true);
            setError(null);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('course_uid', courseUid);

            const response = await fetch('/api/files/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                // Recharger la liste des fichiers
                await loadFiles();
                // Réinitialiser l'input file
                event.target.value = '';
            } else {
                setError(data.error || "Erreur lors de l'upload");
            }
        } catch (err) {
            console.error("[CourseFiles] Erreur upload:", err);
            setError("Erreur lors de l'upload du fichier");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId) => {
        if (!authenticated) {
            setError("Vous devez être connecté pour supprimer des fichiers");
            return;
        }

        if (!confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?")) {
            return;
        }

        try {
            setError(null);

            const response = await fetch(`/api/files/delete?id=${fileId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                // Recharger la liste des fichiers
                await loadFiles();
            } else {
                setError(data.error || "Erreur lors de la suppression");
            }
        } catch (err) {
            console.error("[CourseFiles] Erreur suppression:", err);
            setError("Erreur lors de la suppression du fichier");
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileIcon = (fileType) => {
        if (fileType.startsWith('image/')) return '🖼️';
        if (fileType === 'application/pdf') return '📄';
        if (fileType.includes('word') || fileType.includes('document')) return '📝';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
        if (fileType.startsWith('text/')) return '📃';
        return '📄';
    };

    if (!courseUid) {
        return null;
    }

    return (
        <div className="modal-section">
            <div className="modal-notes-header">
                <div className="modal-notes-title">
                    <h3>📄 Fichiers du cours</h3>
                </div>
                {authenticated && (
                    <label className={styles.uploadButton}>
                        <input
                            type="file"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            style={{ display: 'none' }}
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                        />
                        {uploading ? '⏳ Upload...' : '➕ Ajouter'}
                    </label>
                )}
            </div>

            {error && (
                <div className={styles.error}>
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div className={styles.loading}>Chargement...</div>
            ) : files.length === 0 ? (
                <div className={styles.empty}>
                    {authenticated ? "Aucun fichier pour ce cours. Ajoutez-en un !" : "Aucun fichier pour ce cours."}
                </div>
            ) : (
                <div className={styles.filesList}>
                    {files.map((file) => (
                        <div key={file.id} className={styles.fileItem}>
                            <a
                                href={file.blob_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.fileLink}
                            >
                                <span className={styles.fileIcon}>{getFileIcon(file.file_type)}</span>
                                <span className={styles.fileName}>{file.file_name}</span>
                                <span className={styles.fileSize}>{formatFileSize(file.file_size)}</span>
                            </a>
                            {authenticated && (
                                <button
                                    className={styles.deleteButton}
                                    onClick={() => handleDelete(file.id)}
                                    title="Supprimer"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

