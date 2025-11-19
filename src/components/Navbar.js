"use client";
import {useState, useEffect} from "react";
import PageHeader from "./PageHeader";
import WeekPicker from "./WeekPicker";
import "./Navbar.css";
import {useDevMode} from "../utils/env";

export default function Navbar({
                                   darkMode,
                                   oledMode,
                                   onToggleDarkMode,
                                   onToggleOledMode,
                                   availableWeeks,
                                   selectedWeek,
                                   onWeekChange,
                                   onRefresh,
                                   onToday,
                                   showRefreshButton = true,
                                   isMobile = false,
                                   onSettingsOpenChange,
                                   onToggleAllDays,
                                   allDaysCollapsed = false,
                                   compactMode,
                                   isNative = false,
                                   currentVersion = null,
                                   onCheckUpdates = null,
                                   viewMode = 'horizontal',
                                   onViewModeChange = null,
                                   showTimeLabels = true,
                                   onToggleTimeLabels = null,
                                   hide15MinSpacing = false,
                                   onToggle15MinSpacing = null,
                                   subjects = [],
                                   selectedSubjects = [],
                                   onSubjectsChange = null,
                                   showOnlyExams = false,
                                   onShowOnlyExamsChange = null,
                                   showFilter = false,
                                   userInfo = null
                               }) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [newHistoryCount, setNewHistoryCount] = useState(0);
    const devMode = useDevMode();

    // Vérifier les nouvelles modifications dans l'historique
    useEffect(() => {
        const checkNewHistory = async () => {
            try {
                const res = await fetch('/api/history', {cache: 'no-store'});
                const data = await res.json();
                if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                    // Récupérer la dernière date vue depuis localStorage
                    const lastSeenDate = localStorage.getItem('histo-last-seen-date');
                    const lastSeen = lastSeenDate ? parseInt(lastSeenDate, 10) : 0;
                    
                    // Si jamais vu (lastSeen === 0), afficher juste "1" pour indiquer qu'il y a des modifications
                    if (lastSeen === 0) {
                        setNewHistoryCount(1);
                    } else {
                        // Sinon, compter les vrais nouveaux cours ajoutés depuis la dernière visite
                        const newCount = data.items.filter(item => {
                            const itemDate = new Date(item.first_seen).getTime();
                            return itemDate > lastSeen;
                        }).length;
                        setNewHistoryCount(newCount);
                    }
                }
            } catch (e) {
                // Erreur silencieuse
            }
        };
        
        checkNewHistory();
        // Vérifier toutes les minutes
        const interval = setInterval(checkNewHistory, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleShowHistory = () => {
        // Marquer comme vu en sauvegardant la date actuelle
        try {
            const now = Date.now();
            localStorage.setItem('histo-last-seen-date', now.toString());
            setNewHistoryCount(0);
        } catch (e) {
            // Erreur silencieuse
        }
        
        if (typeof window !== 'undefined') {
            window.location.href = '/histo';
        }
    };

    const handleClearCache = () => {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            // Clear localStorage
            localStorage.clear();
            
            // Clear sessionStorage
            sessionStorage.clear();
            
            // Clear all cookies
            document.cookie.split(";").forEach((cookie) => {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            });
            
            // Clear cache via Cache API if available
            if ('caches' in window) {
                caches.keys().then((names) => {
                    names.forEach((name) => {
                        caches.delete(name);
                    });
                });
            }
            
            // Reload the page
            window.location.reload();
        }
    };

    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;

                    // Hystérésis : deux seuils différents pour éviter le clignotement
                    if (scrollY > 80 && !isScrolled) {
                        setIsScrolled(true);
                    } else if (scrollY < 40 && isScrolled) {
                        setIsScrolled(false);
                    }

                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, {passive: true});
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isScrolled]);

    return (
        <div className={`navbar-container ${isScrolled ? 'scrolled' : ''}`}>
            <div className="navbar-content">
                <PageHeader
                    darkMode={darkMode}
                    oledMode={oledMode}
                    onToggleDarkMode={onToggleDarkMode}
                    onToggleOledMode={onToggleOledMode}
                    isMobile={isMobile}
                    onSettingsOpenChange={onSettingsOpenChange}
                    compactMode={compactMode}
                    isNative={isNative}
                    currentVersion={currentVersion}
                    onCheckUpdates={onCheckUpdates}
                    viewMode={viewMode}
                    onViewModeChange={onViewModeChange}
                    showTimeLabels={showTimeLabels}
                    onToggleTimeLabels={onToggleTimeLabels}
                    hide15MinSpacing={hide15MinSpacing}
                    onToggle15MinSpacing={onToggle15MinSpacing}
                    subjects={subjects}
                    selectedSubjects={selectedSubjects}
                    onSubjectsChange={onSubjectsChange}
                    showOnlyExams={showOnlyExams}
                    onShowOnlyExamsChange={onShowOnlyExamsChange}
                    showFilter={showFilter}
                    userInfo={userInfo}
                />

                <div className="navbar-controls">
                    <div className="week-picker-container">
                        <WeekPicker
                            availableWeeks={availableWeeks}
                            selectedWeek={selectedWeek}
                            onWeekChange={onWeekChange}
                            onRefresh={onRefresh}
                            onToday={onToday}
                            showRefreshButton={showRefreshButton}
                            isMobile={isMobile}
                            onToggleAllDays={onToggleAllDays}
                            allDaysCollapsed={allDaysCollapsed}
                            isOnline={typeof navigator !== 'undefined' ? navigator.onLine : true}
                        />
                        {viewMode === 'horizontal' && (
                            <button
                                className="expand-all-btn expand-all-btn-mobile"
                                onClick={onToggleAllDays}
                                title={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                                aria-label={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                            >
                                {allDaysCollapsed ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2"
                                              strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.2"
                                              strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                    <div className="navbar-actions-right">
                        <div className="dev-buttons-container">
                            <div style={{position: "relative"}}>
                                <button
                                    className="history-btn"
                                    onClick={handleShowHistory}
                                    title="Afficher l'historique des modifications"
                                    aria-label="Afficher l'historique"
                                >
                                    <svg width="18" height="18" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <g transform="translate(0,500) scale(0.1,-0.1)" fill="currentColor" stroke="none">
                                            <path d="M2221 4564 c-409 -56 -784 -229 -1108 -511 l-73 -64 0 111 c0 124 -12 165 -62 217 -86 89 -242 75 -313 -27 -41 -59 -47 -134 -43 -537 l3 -368 28 -48 c35 -60 87 -94 157 -104 30 -4 226 -6 435 -3 361 5 382 6 420 26 62 32 98 91 103 168 5 75 -17 127 -74 175 -49 40 -107 51 -267 51 l-132 1 68 65 c329 315 812 484 1268 444 413 -36 754 -194 1045 -484 292 -293 449 -632 484 -1048 18 -213 -17 -485 -87 -683 -144 -405 -463 -761 -847 -945 -133 -63 -217 -93 -356 -124 -508 -113 -1027 9 -1426 335 -109 89 -248 242 -325 357 -172 257 -256 508 -283 847 -12 157 -15 168 -42 207 -43 62 -104 90 -181 86 -77 -5 -135 -41 -170 -107 -20 -38 -23 -59 -23 -147 0 -283 82 -616 219 -887 358 -707 1071 -1147 1861 -1147 331 0 631 70 920 213 716 357 1160 1071 1160 1867 0 1048 -774 1929 -1813 2065 -145 19 -404 18 -546 -1z"/>
                                            <path d="M2430 3637 c-50 -16 -114 -84 -129 -137 -9 -34 -11 -194 -9 -655 l3 -610 25 -45 c16 -28 43 -55 74 -75 l49 -30 421 0 421 0 45 25 c118 66 145 217 57 317 -61 70 -78 73 -394 73 l-283 0 0 481 c0 352 -3 493 -12 523 -16 53 -81 118 -134 134 -49 14 -86 14 -134 -1z"/>
                                        </g>
                                    </svg>
                                </button>
                                {newHistoryCount > 0 && (
                                    <span 
                                        className="history-badge"
                                        style={{
                                            position: "absolute",
                                            top: "-4px",
                                            right: "-4px",
                                            background: "#ef4444",
                                            color: "white",
                                            borderRadius: "10px",
                                            minWidth: "18px",
                                            height: "18px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "0.7rem",
                                            fontWeight: 700,
                                            padding: "0 5px",
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                            border: "2px solid var(--bg-primary)",
                                            zIndex: 10
                                        }}
                                    >
                                        {newHistoryCount > 9 ? '9+' : newHistoryCount}
                                    </span>
                                )}
                            </div>
                            {devMode && (
                                <>
                                    <button
                                        className="dev-clear-cache-btn"
                                        onClick={handleClearCache}
                                        title="Vider le cache et les cookies (localhost uniquement)"
                                        aria-label="Vider le cache et les cookies"
                                    >
                                        DEV
                                    </button>
                                    <button
                                        className="dev-room-mapper-btn"
                                        onClick={() => window.location.href = '/admin/room-mapper'}
                                        title="Mapper les salles sur le plan SVG"
                                        aria-label="Room Mapper"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>
                        {viewMode === 'horizontal' && (
                            <button
                                className="expand-all-btn expand-all-btn-desktop"
                                onClick={onToggleAllDays}
                                title={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                                aria-label={allDaysCollapsed ? "Étendre tous les jours" : "Replier tous les jours"}
                            >
                                {allDaysCollapsed ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2"
                                              strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.2"
                                              strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
