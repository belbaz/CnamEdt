"use client";
import SettingsMenu from "./SettingsMenu";
import "./PageHeader.css";

export default function PageHeader({
                                       darkMode,
                                       onToggleDarkMode,
                                       isMobile = false,
                                       autoScrollToday,
                                       onToggleAutoScroll,
                                       onSettingsOpenChange,
                                       compactMode,
                                       onCompactModeChange,
                                       testMode,
                                       onToggleTestMode,
                                       isNative = false,
                                       currentVersion = null,
                                       onCheckUpdates = null,
                                       viewMode = 'horizontal',
                                       onViewModeChange = null
                                   }) {
    return (
        <div className="page-header">
            <div className="header-content">
                <div className="title-container">
                    <h1 className="page-title">Edt
                        <img src="/cnam.svg" alt="Logo CNAM" className="cnam-logo"
                             aria-hidden="true"/>
                    </h1>

                </div>
                <div className="header-actions">
                    <SettingsMenu
                        autoScrollToday={autoScrollToday}
                        onToggleAutoScroll={onToggleAutoScroll}
                        onOpenChange={onSettingsOpenChange}
                        compactMode={compactMode}
                        onCompactModeChange={onCompactModeChange}
                        testMode={testMode}
                        onToggleTestMode={onToggleTestMode}
                        isMobile={isMobile}
                        isNative={isNative}
                        currentVersion={currentVersion}
                        onCheckUpdates={onCheckUpdates}
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
                        {darkMode ? "☀️" : "🌙"}
                    </button>
                </div>
            </div>
        </div>
    );
}
