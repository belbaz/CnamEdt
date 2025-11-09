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
 * Le viewBox du SVG est: 0 0 591.922 841.37
 * 
 * Pour trouver les coordonnées d'une nouvelle salle:
 * 1. Ouvrir plan.svg dans un éditeur de SVG (Inkscape, Illustrator, etc.)
 * 2. Localiser visuellement la salle sur le plan
 * 3. Noter les coordonnées approximatives du centre de la salle
 * 4. Ajouter l'entrée ici avec le numéro de bâtiment comme clé
 */
const BUILDING_COORDINATES = {
    // Coordonnées EXACTES extraites du SVG plan.svg
    // Basées sur les positions des éléments <use> dans le SVG
    // Le viewBox du SVG est: 0 0 591.922 841.37
    
    // Salles identifiées avec leurs coordonnées précises
    // Format: "numéro": { x: coordX, y: coordY } où coordX et coordY sont les positions dans le SVG
    
    // Zone gauche
    "10": { x: 347, y: 606 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 345.517 606.119)"
    "11": { x: 145, y: 525 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 143.126 525.273)"
    "12": { x: 309, y: 595 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 307.571 595.119)"
    "13": { x: 162, y: 493 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 160.717 493.367)"
    "14": { x: 327, y: 576 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 325.717 576.419)"
    "15": { x: 258, y: 457 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 256.237 457.067)"
    "16": { x: 338, y: 523 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 336.171 523.073)"
    "17": { x: 162, y: 451 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 160.537 450.836)"
    "21": { x: 230, y: 448 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 227.848 447.536)"
    "27": { x: 163, y: 413 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 160.757 413.067)"
    
    // Bâtiments principaux (numéros à 2 chiffres commençant par 3)
    "30": { x: 100, y: 685 },   // Zone Bâtiment 30 (estimation basée sur le plan)
    "31": { x: 147, y: 634 },   // Zone Scolarité 31 (basée sur "Scolarité 31" lignes 491-499)
    "32": { x: 244, y: 249 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 242.14 249.234)"
    "33": { x: 330, y: 268 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 327.685 268.215)"
    "34": { x: 174, y: 268 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 172.62 267.793)"
    "35": { x: 191, y: 324 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 189.102 323.567)"
    "36": { x: 251, y: 293 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 249.532 293.392)"
    "37": { x: 313, y: 324 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 308.255 324.412)"
    "38": { x: 201, y: 294 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 199.02 293.99)"
    "39": { x: 299, y: 294 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 297.122 293.99)"
    "40": { x: 332, y: 281 },   // Extrait de: transform="matrix(8.8 0 0 -8.8 330.43 280.887)"
    
    // Note: Pour ajouter une nouvelle salle, chercher dans plan.svg:
    // 1. Trouver la ligne avec le numéro (ex: use xlink:href="#k" pour "1")
    // 2. Extraire les coordonnées x et y du transform="matrix(8.8 0 0 -8.8 X Y)"
    // 3. Ajouter ici: "numéro": { x: X, y: Y }
};

/**
 * Composant pour afficher la carte SVG avec itinéraire
 */
export default function MapViewer({ location, onClose }) {
    const [buildingNumber, setBuildingNumber] = useState(null);
    const [fullRoomNumber, setFullRoomNumber] = useState(null);
    const [buildingCoords, setBuildingCoords] = useState(null);
    const [debugMode, setDebugMode] = useState(false); // Mode debug pour afficher toutes les salles
    const svgRef = useRef(null);
    const containerRef = useRef(null);

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
                    <div className="map-viewer-svg-container">
                        <img
                            src="/plan.svg"
                            alt="Plan du bâtiment"
                            className="map-viewer-svg"
                            ref={svgRef}
                        />
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                            viewBox="0 0 591.922 841.37"
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
                    {buildingCoords && !debugMode && (
                        <div className="map-viewer-info">
                            <p className="map-viewer-info-text">
                                📍 Bâtiment <strong>{buildingNumber}</strong>
                                {fullRoomNumber && (
                                    <span> (Salle {fullRoomNumber})</span>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

