"use client";
import "./PageHeader.css";

export default function PageHeader({darkMode, onToggleDarkMode}) {
    return (
        <div className="page-header">
            <div className="header-content">
                <div>
                    <h1 className="page-title">EDT Eicnam</h1>
                </div>
                <button
                    className="theme-toggle"
                    onClick={onToggleDarkMode}
                    title={darkMode ? "Mode clair" : "Mode sombre"}
                >
                    {darkMode ? "☀️" : "🌙"}
                </button>
            </div>
        </div>
    );
}
