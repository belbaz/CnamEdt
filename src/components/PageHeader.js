"use client";
import SettingsMenu from "./SettingsMenu";
import "./PageHeader.css";

export default function PageHeader({
                                       darkMode,
                                       onToggleDarkMode,
                                       isMobile = false,
                                       autoScrollToday,
                                       onToggleAutoScroll,
                                       onSettingsOpenChange
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
                    {isMobile && (
                        <SettingsMenu
                            autoScrollToday={autoScrollToday}
                            onToggleAutoScroll={onToggleAutoScroll}
                            onOpenChange={onSettingsOpenChange}
                        />
                    )}
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
