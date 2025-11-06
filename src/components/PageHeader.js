"use client";
import { useState } from "react";
import SettingsMenu from "./SettingsMenu";
import FilterPanel from "./FilterPanel";
import "./PageHeader.css";

export default function PageHeader({
                                       darkMode,
                                       onToggleDarkMode,
                                       isMobile = false,
                                       onSettingsOpenChange,
                                       compactMode,
                                       isNative = false,
                                       currentVersion = null,
                                       onCheckUpdates = null,
                                       viewMode = 'horizontal',
                                       onViewModeChange = null,
                                       showTimeLabels = true,
                                       onToggleTimeLabels = null,
                                       subjects = [],
                                       selectedSubjects = [],
                                       onSubjectsChange = null,
                                       showFilter = false
                                   }) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadAPK = async () => {
        setIsDownloading(true);
        try {
            window.location.href = '/apk';
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="page-header">
            <div className="header-content">
                <div className="title-container">
                    <h1 
                        className="page-title" 
                        onClick={() => { try { window.location.href = '/'; } catch { window.location.reload(); } }}
                        style={{ cursor: 'pointer' }}
                        title="Revenir à l'EDT (réinitialiser l'URL)"
                    >
                        Edt
                        <img src="/cnam.svg" alt="Logo CNAM" className="cnam-logo"
                             aria-hidden="true"/>
                    </h1>

                </div>
                <div className="header-actions">
                    {!isNative && (
                        <button
                            className="download-apk-button"
                            onClick={handleDownloadAPK}
                            disabled={isDownloading}
                            title="Télécharger l'APK Android"
                        >
                            {isDownloading ? '⏳' : '📱'}
                        </button>
                    )}
                    <FilterPanel
                        subjects={subjects}
                        selectedSubjects={selectedSubjects}
                        onSubjectsChange={onSubjectsChange || (() => {})}
                        isVisible={showFilter}
                    />
                    <SettingsMenu
                        onOpenChange={onSettingsOpenChange}
                        compactMode={compactMode}
                        isMobile={isMobile}
                        isNative={isNative}
                        currentVersion={currentVersion}
                        onCheckUpdates={onCheckUpdates}
                        showTimeLabels={showTimeLabels}
                        onToggleTimeLabels={onToggleTimeLabels}
                    />
                    <button
                        className="view-toggle"
                        onClick={() => onViewModeChange && onViewModeChange(viewMode === 'horizontal' ? 'vertical' : 'horizontal')}
                        title={viewMode === 'horizontal' ? "Vue verticale" : "Vue horizontale"}
                        aria-label={viewMode === 'horizontal' ? "Vue verticale" : "Vue horizontale"}
                    >
                        {viewMode === 'horizontal' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M9 3v18M15 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M12 3v18M6 3v18M18 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M3 9h18M3 15h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        )}
                    </button>
                    <button
                        className="theme-toggle"
                        onClick={onToggleDarkMode}
                        title={darkMode ? "Mode clair" : "Mode sombre"}
                    >
                        {darkMode ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <circle cx="12" cy="12" r="4.5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
                                <path d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05l-2.12-2.12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        ) : (
                            "🌙"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
