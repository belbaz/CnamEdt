'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import './MapViewer.css';

/**
 * Extrait le numéro de bâtiment depuis une location string
 * Format attendu: "31.1.67" ou "Salle : 31.1.67" ou "31-1-67"
 * On extrait uniquement le numéro du bâtiment (ex: "31" depuis "31.1.67")
 */
function extractBuildingNumber(location) {
    if (!location || typeof location !== 'string') return null;
    
    // Nettoyer la string
    const cleaned = location.replace(/^Salle\s*:\s*/i, '').trim();
    
    // Extraire le premier nombre (numéro de bâtiment)
    const match = cleaned.match(/^(\d+)/);
    if (match) {
        return match[1]; // Retourne "31" depuis "31.1.67"
    }
    
    return null;
}

/**
 * Extrait le numéro complet de la salle pour l'affichage
 */
function extractFullRoomNumber(location) {
    if (!location || typeof location !== 'string') return null;
    
    const cleaned = location.replace(/^Salle\s*:\s*/i, '').trim();
    const match = cleaned.match(/(\d+)[\.\-](\d+)[\.\-](\d+)/);
    if (match) {
        return `${match[1]}.${match[2]}.${match[3]}`;
    }
    
    return null;
}

/**
 * Mapping des coordonnées des bâtiments/salles dans le SVG
 * Format: { "31": { x: 100, y: 200 } }
 * 
 * Ces coordonnées correspondent au centre visuel de la SALLE dans le SVG
 * Le viewBox du SVG est: 0 0 528.976 504.69
 * 
 * Coordonnées extraites avec le Room Mapper (/admin/room-mapper)
 */
const BUILDING_COORDINATES = {
    "1": { x: 204, y: 411 },
    "2": { x: 243, y: 395 },
    "3": { x: 173, y: 308 },
    "4": { x: 292, y: 402 },
    "5": { x: 168, y: 345 },
    "6": { x: 375, y: 397 },
    "7": { x: 162, y: 410 },
    "9": { x: 128, y: 390 },
    "11": { x: 125, y: 308 },
    "12": { x: 271, y: 373 },
    "14": { x: 294, y: 344 },
    "15": { x: 229, y: 247 },
    "16": { x: 305, y: 306 },
    "17": { x: 143, y: 242 },
    "21": { x: 206, y: 240 },
    "23": { x: 205, y: 199 },
    "27": { x: 143, y: 207 },
    "29": { x: 295, y: 87 },
    "30": { x: 272, y: 97 },
    "31": { x: 277, y: 127 },
    "33": { x: 170, y: 126 },
    "34": { x: 175, y: 96 },
    "35": { x: 154, y: 76 },
    "37": { x: 218, y: 58 },
    "38": { x: 225, y: 98 },
    "39": { x: 295, y: 75 }
};

/**
 * Composant pour afficher la carte SVG avec pan/zoom moderne
 */
export default function MapViewer({ location, onClose }) {
    const [buildingNumber, setBuildingNumber] = useState(null);
    const [fullRoomNumber, setFullRoomNumber] = useState(null);
    const [buildingCoords, setBuildingCoords] = useState(null);
    const [debugMode, setDebugMode] = useState(false);
    
    // État pour le pan/zoom avec transform
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    
    const containerRef = useRef(null);
    const svgWrapperRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
    const lastTouchDistanceRef = useRef(null);
    const lastTouchCenterRef = useRef(null);
    const isInitializedRef = useRef(false);

    // Dimensions du SVG (viewBox: 0 0 528.976 504.69)
    const SVG_WIDTH = 528.976;
    const SVG_HEIGHT = 504.69;
    const SVG_DISPLAY_WIDTH = 700; // Largeur d'affichage de base

    useEffect(() => {
        if (location) {
            const fullRoom = extractFullRoomNumber(location);
            setFullRoomNumber(fullRoom);
            
            const building = extractBuildingNumber(location);
            setBuildingNumber(building);
            
            if (building && BUILDING_COORDINATES[building]) {
                setBuildingCoords(BUILDING_COORDINATES[building]);
            } else {
                setBuildingCoords(null);
            }
        }
    }, [location]);

    // Fermer avec Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [onClose]);

    /**
     * Centrer le plan sur la salle
     */
    const centerOnRoom = useCallback(() => {
        if (!buildingCoords || !containerRef.current) return;
        
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // Calculer la position de la salle en pixels
        const scaleX = SVG_DISPLAY_WIDTH / SVG_WIDTH;
        const roomX = buildingCoords.x * scaleX;
        const roomY = buildingCoords.y * scaleX; // Même ratio pour Y
        
        // Calculer la position pour centrer la salle
        const newX = (containerWidth / 2) - (roomX * scale);
        const newY = (containerHeight / 2) - (roomY * scale);
        
        setPosition({ x: newX, y: newY });
        setScale(1.5); // Zoom automatique pour mieux voir la salle
    }, [buildingCoords, scale]);

    /**
     * Centrer le plan au chargement
     */
    useEffect(() => {
        if (!isInitializedRef.current && containerRef.current && svgWrapperRef.current) {
            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
            
            // Centrer le plan au milieu
            const centerX = (containerRect.width / 2) - (SVG_DISPLAY_WIDTH / 2);
            const centerY = (containerRect.height / 2) - (SVG_DISPLAY_WIDTH * (SVG_HEIGHT / SVG_WIDTH) / 2);
            
            setPosition({ x: centerX, y: centerY });
            isInitializedRef.current = true;
            
            // Centrer sur la salle après un court délai si disponible
            if (buildingCoords) {
                setTimeout(() => {
                    centerOnRoom();
                }, 800);
            }
        }
    }, [buildingCoords, centerOnRoom]);

    /**
     * Gestion du zoom avec molette de souris
     */
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        
        // Position de la souris relative au conteneur
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Position de la souris dans le SVG (avant zoom)
        const svgX = (mouseX - position.x) / scale;
        const svgY = (mouseY - position.y) / scale;
        
        // Nouveau niveau de zoom
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(scale * delta, 0.5), 4);
        
        // Ajuster la position pour zoomer sur le point de la souris
        const newX = mouseX - (svgX * newScale);
        const newY = mouseY - (svgY * newScale);
        
        setScale(newScale);
        setPosition({ x: newX, y: newY });
    }, [scale, position]);

    /**
     * Gestion du drag avec la souris
     */
    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - dragStartRef.current.startX;
        const deltaY = e.clientY - dragStartRef.current.startY;
        
        setPosition({
            x: dragStartRef.current.x + deltaX,
            y: dragStartRef.current.y + deltaY
        });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseDown = (e) => {
        // Ne pas démarrer le drag sur les boutons
        if (e.target.closest('button') || e.target.closest('.map-controls')) {
            return;
        }
        
        setIsDragging(true);
        dragStartRef.current = {
            x: position.x,
            y: position.y,
            startX: e.clientX,
            startY: e.clientY
        };
        e.preventDefault();
    };

    // Gestion globale du drag
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    /**
     * Gestion du touch (mobile)
     */
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            // Pan avec un doigt
            const touch = e.touches[0];
            dragStartRef.current = {
                x: position.x,
                y: position.y,
                startX: touch.clientX,
                startY: touch.clientY
            };
            setIsDragging(true);
        } else if (e.touches.length === 2) {
            // Pinch-to-zoom avec deux doigts
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            
            lastTouchDistanceRef.current = distance;
            lastTouchCenterRef.current = { x: centerX, y: centerY };
            setIsDragging(false);
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 1 && isDragging) {
            // Pan avec un doigt
            const touch = e.touches[0];
            const deltaX = touch.clientX - dragStartRef.current.startX;
            const deltaY = touch.clientY - dragStartRef.current.startY;
            
            setPosition({
                x: dragStartRef.current.x + deltaX,
                y: dragStartRef.current.y + deltaY
            });
        } else if (e.touches.length === 2 && lastTouchDistanceRef.current && lastTouchCenterRef.current) {
            // Pinch-to-zoom avec deux doigts
            e.preventDefault();
            
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            const ratio = distance / lastTouchDistanceRef.current;
            const newScale = Math.min(Math.max(scale * ratio, 0.5), 4);
            
            // Centrer le zoom sur le point entre les deux doigts
            if (containerRef.current) {
                const container = containerRef.current;
                const rect = container.getBoundingClientRect();
                const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
                const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
                
                const svgX = (centerX - position.x) / scale;
                const svgY = (centerY - position.y) / scale;
                
                const newX = centerX - (svgX * newScale);
                const newY = centerY - (svgY * newScale);
                
                setScale(newScale);
                setPosition({ x: newX, y: newY });
            }
            
            lastTouchDistanceRef.current = distance;
        }
    };

    const handleTouchEnd = () => {
        lastTouchDistanceRef.current = null;
        lastTouchCenterRef.current = null;
        setIsDragging(false);
    };

    /**
     * Contrôles de zoom
     */
    const zoomIn = () => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const svgX = (centerX - position.x) / scale;
        const svgY = (centerY - position.y) / scale;
        const newScale = Math.min(scale + 0.3, 4);
        
        const newX = centerX - (svgX * newScale);
        const newY = centerY - (svgY * newScale);
        
        setScale(newScale);
        setPosition({ x: newX, y: newY });
    };

    const zoomOut = () => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const svgX = (centerX - position.x) / scale;
        const svgY = (centerY - position.y) / scale;
        const newScale = Math.max(scale - 0.3, 0.5);
        
        const newX = centerX - (svgX * newScale);
        const newY = centerY - (svgY * newScale);
        
        setScale(newScale);
        setPosition({ x: newX, y: newY });
    };

    const resetView = () => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        
        const centerX = (rect.width / 2) - (SVG_DISPLAY_WIDTH / 2);
        const centerY = (rect.height / 2) - (SVG_DISPLAY_WIDTH * (SVG_HEIGHT / SVG_WIDTH) / 2);
        
        setScale(1);
        setPosition({ x: centerX, y: centerY });
    };

    return (
        <div className="map-viewer-overlay" onClick={onClose}>
            <div className="map-viewer-container" onClick={(e) => e.stopPropagation()} ref={containerRef}>
                <div className="map-viewer-header">
                    <h2 className="map-viewer-title">
                        {fullRoomNumber ? `Salle ${fullRoomNumber}` : buildingNumber ? `Bâtiment ${buildingNumber}` : 'Plan du bâtiment'}
                    </h2>
                    <div className="map-viewer-header-actions">
                        <button 
                            className="map-viewer-debug-toggle"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDebugMode(!debugMode);
                            }}
                            title={debugMode ? "Masquer toutes les salles" : "Afficher toutes les salles"}
                        >
                            {debugMode ? '👁️' : '🔍'}
                        </button>
                        <button 
                            className="map-viewer-close" 
                            onClick={onClose}
                            aria-label="Fermer"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <div className="map-viewer-content">
                    {!buildingCoords && buildingNumber && !debugMode && (
                        <div className="map-viewer-warning">
                            <p>⚠️ Coordonnées du bâtiment {buildingNumber} non disponibles</p>
                            <p className="map-viewer-warning-subtitle">Le bâtiment sera ajouté prochainement</p>
                        </div>
                    )}
                    {debugMode && (
                        <div className="map-viewer-info">
                            <p className="map-viewer-info-text">
                                🔍 Toutes les salles configurées sont affichées
                            </p>
                        </div>
                    )}
                    <div 
                        className={`map-viewer-canvas ${isDragging ? 'dragging' : ''}`}
                        onMouseDown={handleMouseDown}
                        onWheel={handleWheel}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div 
                            className="map-svg-container"
                            ref={svgWrapperRef}
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                transformOrigin: '0 0'
                            }}
                        >
                            <img
                                src="/plan.svg"
                                alt="Plan du bâtiment"
                                className="map-viewer-svg"
                                style={{ width: `${SVG_DISPLAY_WIDTH}px` }}
                            />
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                xmlnsXlink="http://www.w3.org/1999/xlink"
                                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                                className="map-viewer-overlay-svg"
                                style={{ width: `${SVG_DISPLAY_WIDTH}px`, height: `${SVG_DISPLAY_WIDTH * (SVG_HEIGHT / SVG_WIDTH)}px` }}
                            >
                                {debugMode ? (
                                    Object.entries(BUILDING_COORDINATES).map(([roomNumber, coords]) => (
                                        <g key={roomNumber}>
                                            <text
                                                x={coords.x}
                                                y={coords.y + 3}
                                                className="map-room-label"
                                                textAnchor="middle"
                                            >
                                                {roomNumber}
                                            </text>
                                            <circle
                                                cx={coords.x}
                                                cy={coords.y}
                                                r="12"
                                                className="map-room-marker-debug"
                                                strokeWidth="2"
                                            />
                                        </g>
                                    ))
                                ) : (
                                    buildingCoords && (
                                        <>
                                            <circle
                                                cx={buildingCoords.x}
                                                cy={buildingCoords.y}
                                                r="15"
                                                className="map-room-marker-pulse"
                                                strokeWidth="2.5"
                                            />
                                            <circle
                                                cx={buildingCoords.x}
                                                cy={buildingCoords.y}
                                                r="15"
                                                className="map-room-marker"
                                                strokeWidth="2.5"
                                            />
                                        </>
                                    )
                                )}
                            </svg>
                        </div>
                    </div>
                    
                    {/* Contrôles flottants */}
                    <div className="map-controls">
                        {buildingCoords && (
                            <button 
                                className="map-control-btn map-center-btn"
                                onClick={centerOnRoom}
                                title="Centrer sur la salle"
                            >
                                📍
                            </button>
                        )}
                        <div className="map-zoom-controls">
                            <button onClick={zoomOut} className="map-control-btn" title="Dézoomer">
                                −
                            </button>
                            <span className="zoom-level">{Math.round(scale * 100)}%</span>
                            <button onClick={zoomIn} className="map-control-btn" title="Zoomer">
                                +
                            </button>
                            <button onClick={resetView} className="map-control-btn" title="Réinitialiser">
                                ↺
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
