"use client";
import { useState, useEffect, useRef } from "react";
import "./room-mapper.css";

/**
 * Page d'administration pour identifier et enregistrer les positions des salles sur le plan SVG
 * 
 * Fonctionnalités:
 * - Parse automatiquement le SVG pour détecter les numéros de salles (balises <text>)
 * - Affiche un cercle rouge autour de chaque numéro détecté
 * - Permet de valider/éditer les positions
 * - Génère le code pour BUILDING_COORDINATES
 */
export default function RoomMapperPage() {
    const [roomNumbers, setRoomNumbers] = useState([]);
    const [svgContent, setSvgContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [showOverlay, setShowOverlay] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const svgContainerRef = useRef(null);
    const svgOverlayRef = useRef(null);

    useEffect(() => {
        initializeRooms();
    }, []);

    /**
     * Coordonnées enregistrées des salles
     */
    const SAVED_COORDINATES = {
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
        "39": { x: 295, y: 75 },
    };

    /**
     * Initialise les salles existantes avec leurs coordonnées
     */
    const initializeRooms = () => {
        setLoading(true);
        
        const rooms = [];
        
        // Créer uniquement les salles qui existent dans SAVED_COORDINATES
        Object.entries(SAVED_COORDINATES).forEach(([roomNum, coords]) => {
            rooms.push({
                id: `room-${roomNum}`,
                roomNumber: roomNum,
                x: coords.x,
                y: coords.y,
                validated: true,  // Déjà validées
                placed: true      // Déjà placées
            });
        });
        
        // Trier par numéro de salle
        rooms.sort((a, b) => parseInt(a.roomNumber) - parseInt(b.roomNumber));
        
        setRoomNumbers(rooms);
        setLoading(false);
        
        console.log('[RoomMapper] Salles chargées:', rooms);
    };


    /**
     * Génère le code JavaScript pour BUILDING_COORDINATES
     */
    const generateCode = () => {
        const validRooms = roomNumbers.filter(room => room.validated);
        
        // Regrouper les doublons (même numéro de salle)
        const uniqueRooms = {};
        validRooms.forEach(room => {
            if (!uniqueRooms[room.roomNumber]) {
                uniqueRooms[room.roomNumber] = room;
            }
        });
        
        let code = 'const BUILDING_COORDINATES = {\n';
        Object.values(uniqueRooms).forEach(room => {
            code += `    "${room.roomNumber}": { x: ${Math.round(room.x)}, y: ${Math.round(room.y)} },\n`;
        });
        code += '};';
        
        return code;
    };

    /**
     * Copie le code généré dans le presse-papier
     */
    const copyToClipboard = () => {
        const code = generateCode();
        navigator.clipboard.writeText(code).then(() => {
            alert('✅ Code copié dans le presse-papier !');
        }).catch(err => {
            console.error('Erreur lors de la copie:', err);
        });
    };

    /**
     * Exporte les positions en JSON
     */
    const exportJSON = () => {
        const validRooms = roomNumbers.filter(room => room.validated);
        
        // Regrouper les doublons
        const uniqueRooms = {};
        validRooms.forEach(room => {
            if (!uniqueRooms[room.roomNumber]) {
                uniqueRooms[room.roomNumber] = {
                    x: Math.round(room.x),
                    y: Math.round(room.y)
                };
            }
        });
        
        const json = JSON.stringify(uniqueRooms, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'room-coordinates.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    /**
     * Inverse la validation d'une salle
     */
    const toggleRoomValidation = (roomId) => {
        setRoomNumbers(prev => 
            prev.map(room => 
                room.id === roomId ? { ...room, validated: !room.validated } : room
            )
        );
    };

    /**
     * Active le mode édition pour une salle (placement sur la map)
     */
    const startEditMode = (room) => {
        setSelectedRoom(room);
        setEditMode(true);
    };

    /**
     * Gère le clic sur le SVG en mode édition (placement de la salle)
     */
    const handleSvgClick = (e) => {
        if (!editMode || !selectedRoom) {
            console.log('[RoomMapper] Pas en mode édition ou pas de salle sélectionnée');
            return;
        }
        
        console.log('[RoomMapper] Clic détecté, target:', e.target.tagName);
        
        // Récupérer le SVG overlay pour un calcul précis
        const svg = svgOverlayRef.current;
        if (!svg) {
            console.error('[RoomMapper] SVG overlay introuvable');
            return;
        }
        
        // Créer un point SVG pour la conversion exacte
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        
        // Convertir les coordonnées écran en coordonnées SVG
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        
        const x = svgP.x;
        const y = svgP.y;
        
        console.log('[RoomMapper] Clic PRÉCIS:', {
            clientXY: { x: e.clientX, y: e.clientY },
            svgXY: { x: Math.round(x), y: Math.round(y) },
            zoom: zoomLevel,
            salle: selectedRoom.roomNumber
        });
        
        // Mettre à jour la position de la salle sélectionnée
        setRoomNumbers(prev =>
            prev.map(room =>
                room.id === selectedRoom.id
                    ? { 
                        ...room, 
                        x: Math.round(x), 
                        y: Math.round(y),
                        validated: true,
                        placed: true
                    }
                    : room
            )
        );
        
        // Mettre à jour selectedRoom
        setSelectedRoom(prev => ({
            ...prev,
            x: Math.round(x),
            y: Math.round(y),
            validated: true,
            placed: true
        }));
        
        // Désactiver le mode édition
        setEditMode(false);
    };

    /**
     * Annule le mode édition
     */
    const cancelEditMode = () => {
        setEditMode(false);
    };

    /**
     * Zoom in
     */
    const zoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 0.25, 3));
    };

    /**
     * Zoom out
     */
    const zoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    };

    /**
     * Reset zoom
     */
    const resetZoom = () => {
        setZoomLevel(1);
    };

    /**
     * Obtenir le viewBox du SVG (extrait du fichier plan.svg)
     */
    const getViewBox = () => {
        return "0 0 528.976 504.69";
    };

    if (loading) {
        return (
            <div className="room-mapper-loading">
                <div className="spinner"></div>
                <p>Chargement et analyse du plan SVG...</p>
            </div>
        );
    }

    return (
        <div className="room-mapper-container">
            <header className="room-mapper-header">
                <div>
                    <h1>🗺️ Mapper des Salles</h1>
                    <p>Identifiez et enregistrez les positions des numéros de salles sur le plan</p>
                </div>
                <div className="header-actions">
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="btn-secondary"
                    >
                        ← Retour
                    </button>
                </div>
            </header>

            <div className="room-mapper-content">
                {/* Panneau latéral gauche avec la liste des salles */}
                <aside className="room-mapper-sidebar sidebar-left">
                    <div className="sidebar-header">
                        <h2>Salles ({roomNumbers.length} salles)</h2>
                        <label className="toggle-overlay">
                            <input 
                                type="checkbox" 
                                checked={showOverlay}
                                onChange={(e) => setShowOverlay(e.target.checked)}
                            />
                            <span>Afficher overlay</span>
                        </label>
                        {editMode && (
                            <div className="edit-mode-indicator">
                                ✏️ Mode édition: Cliquez sur le plan pour positionner la salle {selectedRoom?.roomNumber}
                            </div>
                        )}
                    </div>
                    
                    <div className="room-list">
                        {roomNumbers.map(room => (
                            <div 
                                key={room.id}
                                className={`room-item validated ${selectedRoom?.id === room.id ? 'selected' : ''}`}
                                onClick={() => setSelectedRoom(room)}
                            >
                                <div className="room-info">
                                    <span className="room-number">
                                        ✓ Salle {room.roomNumber}
                                    </span>
                                    <span className="room-coords">
                                        x: {Math.round(room.x)}, y: {Math.round(room.y)}
                                    </span>
                                </div>
                                <div className="room-actions">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startEditMode(room);
                                        }}
                                        className="btn-edit"
                                        title="Modifier la position"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRoomValidation(room.id);
                                        }}
                                        className="btn-toggle"
                                        title={room.validated ? "Désactiver" : "Activer"}
                                    >
                                        {room.validated ? '✓' : '✗'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="sidebar-actions">
                        <button 
                            onClick={copyToClipboard}
                            className="btn-primary"
                        >
                            📋 Copier le code
                        </button>
                        <button 
                            onClick={exportJSON}
                            className="btn-secondary"
                        >
                            💾 Exporter JSON
                        </button>
                    </div>
                </aside>

                {/* Zone principale avec le SVG */}
                <main className="room-mapper-main">
                    {editMode && (
                        <div className="edit-mode-banner">
                            <div className="edit-banner-content">
                                <span>✏️ Mode édition actif - Cliquez sur le plan pour repositionner la salle {selectedRoom?.roomNumber}</span>
                                <button onClick={cancelEditMode} className="btn-cancel-edit">
                                    Annuler
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div 
                        className={`svg-viewer ${editMode ? 'edit-mode' : ''}`} 
                        ref={svgContainerRef}
                        onClick={handleSvgClick}
                    >
                        {/* Contrôles de zoom en bas à droite */}
                        <div className="zoom-controls">
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
                            className="svg-content"
                            style={{ transform: `scale(${zoomLevel})` }}
                        >
                            {/* SVG de base */}
                            <img 
                                src="/plan.svg" 
                                alt="Plan du bâtiment"
                                className="base-svg"
                            />
                            
                            {/* Overlay avec les cercles rouges */}
                            {showOverlay && (
                                <svg
                                    ref={svgOverlayRef}
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox={getViewBox()}
                                    className="overlay-svg"
                                    preserveAspectRatio="xMidYMid meet"
                                >
                                {roomNumbers
                                    .filter(room => room.validated)
                                    .map(room => (
                                        <g 
                                            key={room.id}
                                            onClick={(e) => {
                                                if (!editMode) {
                                                    e.stopPropagation();
                                                    setSelectedRoom(room);
                                                }
                                            }}
                                            className={`room-marker ${selectedRoom?.id === room.id ? 'selected' : ''} ${editMode && selectedRoom?.id === room.id ? 'editing' : ''}`}
                                        >
                                            {/* Cercle rouge autour du numéro */}
                                            <circle
                                                cx={room.x}
                                                cy={room.y}
                                                r="15"
                                                className="marker-circle"
                                            />
                                            
                                            {/* Numéro de salle en rouge par-dessus */}
                                            <text
                                                x={room.x}
                                                y={room.y + 4}
                                                className="marker-text"
                                                textAnchor="middle"
                                            >
                                                {room.roomNumber}
                                            </text>
                                        </g>
                                    ))}
                                </svg>
                            )}
                        </div>
                    </div>
                    
                </main>

                {/* Panneau latéral droit avec le code généré */}
                <aside className="room-mapper-sidebar sidebar-right">
                    <div className="sidebar-header">
                        <h2>Code généré</h2>
                    </div>

                    <div className="code-preview-main">
                        <pre>{generateCode()}</pre>
                    </div>

                    {selectedRoom && (
                        <div className="room-details-compact">
                            <h3>📍 Salle {selectedRoom.roomNumber}</h3>
                            <div className="details-compact">
                                <div className="detail-row">
                                    <span className="detail-label">Position:</span>
                                    <span className="detail-value">x: {Math.round(selectedRoom.x)}, y: {Math.round(selectedRoom.y)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Text ID:</span>
                                    <span className="detail-value">{selectedRoom.textId}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Tspan ID:</span>
                                    <span className="detail-value">{selectedRoom.tspanId}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}

