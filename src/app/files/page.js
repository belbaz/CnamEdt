"use client";

import {useState, useEffect, useMemo, Suspense} from "react";
import {useRouter} from "next/navigation";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import styles from "./page.module.css";
import {getEventTitle} from "@/utils/eventUtils";

function FilesContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [events, setEvents] = useState([]);
    const [files, setFiles] = useState([]);
    const [selectedCourseUid, setSelectedCourseUid] = useState(null);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (authenticated) {
            loadFiles();
        }
    }, [authenticated, selectedCourseUid]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [userRes, eventsRes] = await Promise.all([
                fetch("/api/user", {cache: "no-store"}),
                fetch("/api/fetch-ics", {cache: "no-store"}),
            ]);

            // Gérer l'authentification
            if (userRes.status === 401) {
                setAuthenticated(false);
                setUserInfo(null);
                setUserRole(null);
            } else if (userRes.ok) {
                const userData = await userRes.json();
                setUserInfo(userData);
                setAuthenticated(true);
                setUserRole(userData.role);
            }

            // Charger les événements
            if (eventsRes.ok) {
                const eventsData = await eventsRes.json();
                const eventsList = Array.isArray(eventsData.events) ? eventsData.events : [];
                eventsList.sort((a, b) => {
                    const dateA = new Date(a.start || 0);
                    const dateB = new Date(b.start || 0);
                    return dateB - dateA; // Plus récent en premier
                });
                setEvents(eventsList);
            }
        } catch (err) {
            console.error("[Files] Erreur chargement:", err);
            setError("Erreur lors du chargement des données");
        } finally {
            setLoading(false);
        }
    };

    const loadFiles = async () => {
        try {
            setError(null);
            const url = selectedCourseUid 
                ? `/api/files/all?course_uid=${encodeURIComponent(selectedCourseUid)}`
                : '/api/files/all';

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setFiles(data.files || []);
            } else {
                setError(data.error || "Erreur lors du chargement des fichiers");
            }
        } catch (err) {
            console.error("[Files] Erreur chargement fichiers:", err);
            setError("Erreur lors du chargement des fichiers");
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !selectedCourseUid) return;

        try {
            setUploading(true);
            setError(null);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('course_uid', selectedCourseUid);

            const response = await fetch('/api/files/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                await loadFiles();
                event.target.value = '';
            } else {
                setError(data.error || "Erreur lors de l'upload");
            }
        } catch (err) {
            console.error("[Files] Erreur upload:", err);
            setError("Erreur lors de l'upload du fichier");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?")) {
            return;
        }

        try {
            const response = await fetch(`/api/files/delete?id=${fileId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                await loadFiles();
            } else {
                setError(data.error || "Erreur lors de la suppression");
            }
        } catch (err) {
            console.error("[Files] Erreur suppression:", err);
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

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };

    const getFileIcon = (fileType) => {
        if (fileType.startsWith('image/')) return '🖼️';
        if (fileType === 'application/pdf') return '📄';
        if (fileType.includes('word') || fileType.includes('document')) return '📝';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
        if (fileType.startsWith('text/')) return '📃';
        return '📄';
    };

    // Créer une map des événements par uid
    const eventsByUid = useMemo(() => {
        const map = new Map();
        events.forEach((event) => {
            if (event?.uid) {
                map.set(event.uid, event);
            }
        });
        return map;
    }, [events]);

    // Grouper les fichiers par cours
    const filesByCourse = useMemo(() => {
        const grouped = {};
        files.forEach(file => {
            const courseUid = file.course_uid || 'unknown';
            if (!grouped[courseUid]) {
                grouped[courseUid] = {
                    courseUid,
                    event: eventsByUid.get(courseUid),
                    files: []
                };
            }
            grouped[courseUid].files.push(file);
        });
        return grouped;
    }, [files, eventsByUid]);

    // Liste des cours avec fichiers, triés par date (plus récent en premier)
    const coursesWithFiles = useMemo(() => {
        return Object.values(filesByCourse).sort((a, b) => {
            const dateA = a.event?.start ? new Date(a.event.start).getTime() : 0;
            const dateB = b.event?.start ? new Date(b.event.start).getTime() : 0;
            return dateB - dateA;
        });
    }, [filesByCourse]);

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.loadingContainer}>
                        <Spinner size="large" variant="border" />
                        <p>Chargement...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <BackButton href="/dashboard" title="Retour au dashboard"/>
                        <div className={styles.headerTitle}>
                            <h1>Mes fichiers</h1>
                            <p className={styles.subtitle}>
                                {files.length > 0 
                                    ? `${files.length} fichier${files.length > 1 ? 's' : ''} au total`
                                    : "Aucun fichier uploadé"}
                            </p>
                        </div>
                        {authenticated && userInfo && (
                            <div className={styles.userBar}>
                                <span className={styles.userGreetingCompact}>
                                    {userInfo.name} {userInfo.lastName}
                                </span>
                                <button
                                    className={styles.logoutButton}
                                    onClick={async () => {
                                        try {
                                            await fetch("/api/logout", {method: "POST"});
                                            window.location.href = "/";
                                        } catch (error) {
                                            console.error("[Files] Erreur déconnexion:", error);
                                        }
                                    }}
                                >
                                    Déconnexion
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {!authenticated ? (
                    <div className={styles.card}>
                        <p>Vous devez être connecté pour voir vos fichiers.</p>
                        <Link href="/login" className={styles.loginLink}>
                            Se connecter
                        </Link>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className={styles.errorAlert}>
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Filtre par cours */}
                        {coursesWithFiles.length > 0 && (
                            <div className={styles.filterCard}>
                                <label htmlFor="courseFilter" className={styles.filterLabel}>
                                    Filtrer par cours :
                                </label>
                                <select
                                    id="courseFilter"
                                    value={selectedCourseUid || ''}
                                    onChange={(e) => setSelectedCourseUid(e.target.value || null)}
                                    className={styles.filterSelect}
                                >
                                    <option value="">Tous les cours</option>
                                    {coursesWithFiles.map(({courseUid, event}) => {
                                        const {matiere} = event ? getEventTitle(event) : {};
                                        const courseName = matiere || event?.summary || courseUid.substring(0, 20);
                                        const fileCount = filesByCourse[courseUid].files.length;
                                        return (
                                            <option key={courseUid} value={courseUid}>
                                                {courseName} ({fileCount} fichier{fileCount > 1 ? 's' : ''})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        {/* Liste des fichiers */}
                        {selectedCourseUid ? (
                            // Vue filtrée par cours
                            <div className={styles.filesSection}>
                                {(() => {
                                    const courseData = filesByCourse[selectedCourseUid];
                                    const event = courseData?.event;
                                    const {matiere} = event ? getEventTitle(event) : {};
                                    const courseName = matiere || event?.summary || selectedCourseUid;
                                    const courseFiles = courseData?.files || [];

                                    return (
                                        <>
                                            <div className={styles.courseHeader}>
                                                <h2 className={styles.courseTitle}>{courseName}</h2>
                                                {event?.location && (
                                                    <p className={styles.courseLocation}>📍 {event.location}</p>
                                                )}
                                                {event?.start && (
                                                    <p className={styles.courseDate}>
                                                        {new Date(event.start).toLocaleDateString('fr-FR', {
                                                            weekday: 'long',
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                )}
                                            </div>

                                            <div className={styles.uploadSection} style={{
                                                border: '1px dashed var(--border-light)',
                                                borderRadius: '12px',
                                                padding: '1rem'
                                            }}>
                                                {authenticated ? (
                                                    <label className={styles.uploadButton}>
                                                        <input
                                                            type="file"
                                                            onChange={handleFileSelect}
                                                            disabled={uploading}
                                                            style={{display: 'none'}}
                                                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                                                        />
                                                        {uploading ? '⏳ Upload en cours...' : '➕ Ajouter un fichier'}
                                                    </label>
                                                ) : (
                                                    <p className={styles.authMessageText}>
                                                        <Link href="/login" className={styles.loginLink}>
                                                            Connectez-vous
                                                        </Link> pour ajouter et uploader des fichiers
                                                    </p>
                                                )}
                                            </div>

                                            {courseFiles.length === 0 ? (
                                                <div className={styles.emptyState}>
                                                    Aucun fichier pour ce cours.
                                                </div>
                                            ) : (
                                                <div className={styles.filesGrid}>
                                                    {courseFiles.map((file) => {
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
                                                            <div key={file.id} className={styles.fileCardWrapper}>
                                                                <div className={styles.fileCard}>
                                                                    <a
                                                                        href={file.blob_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={styles.fileCardLink}
                                                                    >
                                                                        <div className={styles.fileCardIcon}>
                                                                            {getFileIcon(file.file_type)}
                                                                        </div>
                                                                        <div className={styles.fileCardContent}>
                                                                            <h3 className={styles.fileCardName}>{file.file_name}</h3>
                                                                            <div className={styles.fileCardMeta}>
                                                                                <span>{formatFileSize(file.file_size)}</span>
                                                                                <span>•</span>
                                                                                <span>{formatDate(file.uploaded_at)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </a>
                                                                    {authenticated && (
                                                                        <button
                                                                            className={styles.fileCardDelete}
                                                                            onClick={() => handleDelete(file.id)}
                                                                            title="Supprimer"
                                                                        >
                                                                            <svg width="16" height="16"
                                                                                 viewBox="0 0 16 16" fill="none"
                                                                                 xmlns="http://www.w3.org/2000/svg">
                                                                                <path d="M12 4L4 12M4 4L12 12"
                                                                                      stroke="currentColor"
                                                                                      strokeWidth="2"
                                                                                      strokeLinecap="round"
                                                                                      strokeLinejoin="round"/>
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {file.user_name && file.uploaded_at && (
                                                                    <div className={styles.fileCardLastPerson}>
                                                                        {file.user_name} - {formatDateTime(file.uploaded_at)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            // Vue groupée par cours
                            <div className={styles.filesSection}>
                                {coursesWithFiles.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <p>Aucun fichier uploadé pour le moment.</p>
                                        <p className={styles.emptyStateSubtext}>
                                            Les fichiers que vous uploaderez apparaîtront ici.
                                        </p>
                                    </div>
                                ) : (
                                    coursesWithFiles.map(({courseUid, event, files: courseFiles}) => {
                                        const {matiere} = event ? getEventTitle(event) : {};
                                        const courseName = matiere || event?.summary || courseUid.substring(0, 30);
                                        
                                        return (
                                            <div key={courseUid} className={styles.courseCard}>
                                                <div className={styles.courseCardHeader}>
                                                    <div>
                                                        <h2 className={styles.courseCardTitle}>{courseName}</h2>
                                                        {event?.location && (
                                                            <p className={styles.courseCardLocation}>📍 {event.location}</p>
                                                        )}
                                                        {event?.start && (
                                                            <p className={styles.courseCardDate}>
                                                                {new Date(event.start).toLocaleDateString('fr-FR', {
                                                                    weekday: 'long',
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric'
                                                                })}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        className={styles.courseCardFilterButton}
                                                        onClick={() => setSelectedCourseUid(courseUid)}
                                                    >
                                                        Voir ce cours
                                                    </button>
                                                </div>
                                                <div className={styles.filesGrid}>
                                                    {courseFiles.map((file) => {
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
                                                            <div key={file.id} className={styles.fileCardWrapper}>
                                                                <div className={styles.fileCard}>
                                                                    <a
                                                                        href={file.blob_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={styles.fileCardLink}
                                                                    >
                                                                        <div className={styles.fileCardIcon}>
                                                                            {getFileIcon(file.file_type)}
                                                                        </div>
                                                                        <div className={styles.fileCardContent}>
                                                                            <h3 className={styles.fileCardName}>{file.file_name}</h3>
                                                                            <div className={styles.fileCardMeta}>
                                                                                <span>{formatFileSize(file.file_size)}</span>
                                                                                <span>•</span>
                                                                                <span>{formatDate(file.uploaded_at)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </a>
                                                                    {authenticated && (
                                                                        <button
                                                                            className={styles.fileCardDelete}
                                                                            onClick={() => handleDelete(file.id)}
                                                                            title="Supprimer"
                                                                        >
                                                                            <svg width="16" height="16"
                                                                                 viewBox="0 0 16 16" fill="none"
                                                                                 xmlns="http://www.w3.org/2000/svg">
                                                                                <path d="M12 4L4 12M4 4L12 12"
                                                                                      stroke="currentColor"
                                                                                      strokeWidth="2"
                                                                                      strokeLinecap="round"
                                                                                      strokeLinejoin="round"/>
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {file.user_name && file.uploaded_at && (
                                                                    <div className={styles.fileCardLastPerson}>
                                                                        {file.user_name} - {formatDateTime(file.uploaded_at)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function FilesPage() {
    return (
        <Suspense fallback={
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.loadingContainer}>
                        <Spinner size="large" variant="border" />
                        <p>Chargement...</p>
                    </div>
                </div>
            </div>
        }>
            <FilesContent/>
        </Suspense>
    );
}

