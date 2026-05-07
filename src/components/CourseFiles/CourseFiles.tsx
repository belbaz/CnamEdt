// @ts-nocheck
"use client";
import {useState, useEffect} from "react";
import styles from "./CourseFiles.module.css";
import {useI18n} from "@/i18n/I18nContext";
import HoverTooltip from "@/components/HoverTooltip";

/**
 * Composant pour gérer les fichiers d'un cours
 * Affiche la liste des fichiers et permet l'upload
 */
export default function CourseFiles({courseUid, authenticated}) {
    const { t } = useI18n();
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

    const handleDownload = async (file) => {
        try {
            const response = await fetch(file.blob_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.file_name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("[CourseFiles] Erreur téléchargement:", err);
            setError("Erreur lors du téléchargement du fichier");
        }
    };

    if (!courseUid) {
        return null;
    }

    // Section compactée quand il n'y a aucun fichier : on aplatit sur une ligne
    // (juste le header + bouton d'upload), pour gagner de la place dans la modale.
    const isFilesEmpty = !loading && files.length === 0 && !error;

    return (
        <div
            className="modal-section modal-section-dashed"
            data-empty={isFilesEmpty ? "true" : undefined}
        >
            <div className="modal-notes-header">
                <div className="modal-notes-title">
                    <h3>{t('files.filesTitle')}</h3>
                    {isFilesEmpty && (
                        <span className="modal-section-empty-hint">
                            {t('files.noFilesEmpty')}
                        </span>
                    )}
                </div>
                {authenticated ? (
                    <label className={styles.uploadButton}>
                        <input
                            type="file"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            style={{display: 'none'}}
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                        />
                        {uploading ? (
                            <>
                                <svg
                                    className={styles.spinner}
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M12 3a9 9 0 1 0 9 9"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                {t('files.uploadingShort')}
                            </>
                        ) : (
                            <>
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M12 5v14M5 12h14"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                {t('files.add')}
                            </>
                        )}
                    </label>
                ) : (
                    <HoverTooltip text={t("files.connectFilesTooltip")}>
                    <a
                        href="/login"
                        className={[styles.uploadButton, "modal-notes-login-cta"].join(" ")}
                        aria-label={t("files.connectFilesTooltip")}
                    >
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path
                                d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        {t(
                            files.length > 0
                                ? "files.connectFilesLinkWithFiles"
                                : "files.connectFilesLinkEmpty"
                        )}
                    </a>
                    </HoverTooltip>
                )}
            </div>

            {error && (
                <div className={styles.error}>
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div className={styles.empty}>
                    <div className={styles.loading} style={{padding: 0}}>{t('files.loading')}</div>
                </div>
            ) : files.length === 0 ? (
                <div className={styles.empty}>
                    {t('files.noFilesEmpty')}
                </div>
            ) : (
                <div className={styles.filesList}>
                    {files.map((file) => {
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
                            <div key={file.id} className={styles.fileItemWrapper}>
                                <div className={styles.fileItem}>
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
                                    <HoverTooltip text={t('files.download')}>
                                    <button
                                        className={styles.downloadButton}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleDownload(file);
                                        }}
                                        aria-label={t('files.download')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 10.5L4 6.5H6V2H10V6.5H12L8 10.5Z" fill="currentColor"/>
                                            <path d="M2 12V13H14V12H2Z" fill="currentColor"/>
                                        </svg>
                                    </button>
                                    </HoverTooltip>
                                    {authenticated && (
                                        <HoverTooltip text={t('files.delete')}>
                                        <button
                                            className={styles.deleteButton}
                                            onClick={() => handleDelete(file.id)}
                                            aria-label={t('files.delete')}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                                                 xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2"
                                                      strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                        </HoverTooltip>
                                    )}
                                </div>
                                {file.user_name && file.uploaded_at && (
                                    <div className={styles.fileLastPerson}>
                                        {file.user_name} - {formatDateTime(file.uploaded_at)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


