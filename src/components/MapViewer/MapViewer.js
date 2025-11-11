'use client';

import { useState, useEffect, useRef } from 'react';
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
 * Composant pour afficher la carte SVG avec itinéraire
 */
export default function MapViewer({ location, onClose }) {
    const [buildingNumber, setBuildingNumber] = useState(null);
    const [fullRoomNumber, setFullRoomNumber] = useState(null);
    const [buildingCoords, setBuildingCoords] = useState(null);
    const [debugMode, setDebugMode] = useState(false); // Mode debug pour afficher toutes les salles
    const [zoomLevel, setZoomLevel] = useState(1);
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const svgContainerRef = useRef(null);
    const lastTouchDistance = useRef(null);

    useEffect(() => {
        if (location) {
            // Extraire le numéro complet pour l'affichage
            const fullRoom = extractFullRoomNumber(location);
            setFullRoomNumber(fullRoom);
            
            // Extraire uniquement le numéro de bâtiment pour trouver les coordonnées
            const building = extractBuildingNumber(location);
            setBuildingNumber(building);
            
            if (building && BUILDING_COORDINATES[building]) {
                setBuildingCoords(BUILDING_COORDINATES[building]);
            } else {
                setBuildingCoords(null);
            }
        }
    }, [location]);

    /**
     * Contrôles de zoom - ULTRA SIMPLE
     */
    const zoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 0.5, 3));
    };

    const zoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
    };

    const resetZoom = () => {
        setZoomLevel(1);
    };

    /**
     * Gestion du pinch-to-zoom sur mobile
     */
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            // Calculer la distance entre les deux doigts
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            lastTouchDistance.current = distance;
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && lastTouchDistance.current) {
            e.preventDefault(); // Empêcher le zoom natif du navigateur
            
            // Calculer la nouvelle distance
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            // Calculer le ratio de zoom
            const ratio = distance / lastTouchDistance.current;
            
            // Appliquer le zoom (sensibilité ajustée)
            setZoomLevel(prev => {
                const newZoom = prev * ratio;
                return Math.min(Math.max(newZoom, 0.5), 3);
            });

            lastTouchDistance.current = distance;
        }
    };

    const handleTouchEnd = () => {
        lastTouchDistance.current = null;
    };

    return (
        <div className="map-viewer-overlay" onClick={onClose}>
            <div className="map-viewer-container" onClick={(e) => e.stopPropagation()} ref={containerRef}>
                <div className="map-viewer-header">
                    <h2 className="map-viewer-title">
                        {fullRoomNumber ? `Salle ${fullRoomNumber}` : buildingNumber ? `Bâtiment ${buildingNumber}` : 'Plan du bâtiment'}
                    </h2>
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
                <div className="map-viewer-content">
                    {!buildingCoords && buildingNumber && !debugMode && (
                        <div className="map-viewer-warning">
                            <p>⚠️ Coordonnées du bâtiment {buildingNumber} non disponibles</p>
                            <p className="map-viewer-warning-subtitle">Le bâtiment sera ajouté prochainement</p>
                        </div>
                    )}
                    {debugMode && (
                        <div className="map-viewer-info" style={{ marginBottom: '1rem' }}>
                            <p className="map-viewer-info-text">
                                🔍 <strong>Mode Debug</strong> : Toutes les salles configurées sont affichées
                            </p>
                        </div>
                    )}
                    <div 
                        className="map-viewer-svg-container" 
                        ref={svgContainerRef}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Contrôles de zoom */}
                        <div className="map-zoom-controls">
                            <button onClick={zoomOut} className="zoom-btn" title="Dézoomer">
                                -
                            </button>
                            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={zoomIn} className="zoom-btn" title="Zoomer">
                                +
                            </button>
                            <button onClick={resetZoom} className="zoom-reset" title="Réinitialiser">
                                ↺
                            </button>
                        </div>

                        <div 
                            className="map-svg-wrapper"
                            style={{ transform: `scale(${zoomLevel})` }}
                        >
                            <div className="map-svg-wrapper-inner">
                                <img
                                    src="/plan.svg"
                                    alt="Plan du bâtiment"
                                    className="map-viewer-svg"
                                    ref={svgRef}
                                />
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    xmlnsXlink="http://www.w3.org/1999/xlink"
                                    viewBox="0 0 528.976 504.69"
                                    className="map-viewer-overlay-svg"
                                    preserveAspectRatio="xMidYMid meet"
                                >
                                    {debugMode ? (
                                        // Mode debug : afficher TOUTES les salles
                                        Object.entries(BUILDING_COORDINATES).map(([roomNumber, coords]) => (
                                            <g key={roomNumber}>
                                                {/* Numéro de la salle */}
                                                <text
                                                    x={coords.x}
                                                    y={coords.y + 3}
                                                    className="map-room-label"
                                                    textAnchor="middle"
                                                >
                                                    {roomNumber}
                                                </text>
                                                {/* Cercle rouge autour du numéro */}
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
                                        // Mode normal : afficher uniquement la salle sélectionnée
                                        buildingCoords && (
                                            <circle
                                                cx={buildingCoords.x}
                                                cy={buildingCoords.y}
                                                r="30"
                                                className="map-room-marker"
                                                strokeWidth="5"
                                            />
                                        )
                                    )}
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

