'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import styles from './OCRExtractor.module.css';

// Import Tesseract dynamiquement pour éviter les problèmes SSR
const Tesseract = dynamic(() => import('tesseract.js'), { ssr: false });

export default function OCRExtractorPage() {
    const [originalImage, setOriginalImage] = useState(null);
    const [processedImage, setProcessedImage] = useState(null);
    const [annotatedImage, setAnnotatedImage] = useState(null);
    const [detectedRooms, setDetectedRooms] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    
    // Configuration
    const [useColorMode, setUseColorMode] = useState(true);
    const [scale, setScale] = useState(300);
    const [sharpness, setSharpness] = useState(180);
    const [contrast, setContrast] = useState(100);
    const [brightness, setBrightness] = useState(100);
    const [threshold, setThreshold] = useState(128);
    
    const fileInputRef = useRef(null);
    const processedCanvasRef = useRef(null);
    const annotatedCanvasRef = useRef(null);
    const workerRef = useRef(null);

    // Configuration des sites CNAM
    const CONTE_NUMBERS = ['30', '31', '33', '34', '35', '37', '39'];
    const SAINT_MARTIN_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '9', '10', '11', '12', '13', '14', '15', '16', '17', '21', '23', '27'];

    const getSite = (number) => {
        const numStr = String(number);
        if (CONTE_NUMBERS.includes(numStr)) return 'Conté';
        if (SAINT_MARTIN_NUMBERS.includes(numStr)) return 'St-Martin';
        return 'Inconnu';
    };

    // Chargement de l'image
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.match('image.*')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setOriginalImage(event.target.result);
                setDetectedRooms([]);
                setAnnotatedImage(null);
            };
            reader.readAsDataURL(file);
        }
    };

    // Filtre de netteté amélioré (Unsharp Mask)
    const applyUnsharpMask = (imageData, amount, radius = 1) => {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new ImageData(width, height);
        const outputPixels = output.data;

        // Matrice gaussienne pour le flou
        const kernelSize = radius * 2 + 1;
        const kernel = [];
        let kernelSum = 0;
        
        for (let i = 0; i < kernelSize; i++) {
            kernel[i] = [];
            for (let j = 0; j < kernelSize; j++) {
                const x = i - radius;
                const y = j - radius;
                const value = Math.exp(-(x * x + y * y) / (2 * radius * radius));
                kernel[i][j] = value;
                kernelSum += value;
            }
        }

        // Normaliser le kernel
        for (let i = 0; i < kernelSize; i++) {
            for (let j = 0; j < kernelSize; j++) {
                kernel[i][j] /= kernelSum;
            }
        }

        // Appliquer l'unsharp mask
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                for (let c = 0; c < 3; c++) {
                    let blurred = 0;
                    for (let ky = 0; ky < kernelSize; ky++) {
                        for (let kx = 0; kx < kernelSize; kx++) {
                            const px = (y + ky - radius) * width + (x + kx - radius);
                            blurred += pixels[px * 4 + c] * kernel[ky][kx];
                        }
                    }
                    
                    const idx = (y * width + x) * 4 + c;
                    const original = pixels[idx];
                    const sharpened = original + amount * (original - blurred);
                    outputPixels[idx] = Math.max(0, Math.min(255, sharpened));
                }
                const idx = (y * width + x) * 4;
                outputPixels[idx + 3] = pixels[idx + 3];
            }
        }

        return output;
    };

    // Pré-traitement de l'image
    const preprocessImage = () => {
        if (!originalImage || !processedCanvasRef.current) return null;

        const canvas = processedCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = originalImage;

        return new Promise((resolve) => {
            img.onload = () => {
                const scaleFactor = scale / 100;
                canvas.width = img.naturalWidth * scaleFactor;
                canvas.height = img.naturalHeight * scaleFactor;

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                if (useColorMode) {
                    // Mode couleur haute qualité
                    ctx.filter = `contrast(130%) brightness(108%) saturate(90%)`;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    ctx.filter = 'none';

                    // Appliquer unsharp mask pour netteté optimale
                    if (sharpness >= 100) {
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const sharpened = applyUnsharpMask(imageData, (sharpness - 100) / 100, 1.5);
                        ctx.putImageData(sharpened, 0, 0);
                    }
                } else {
                    // Mode N&B
                    ctx.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    ctx.filter = 'none';

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    for (let i = 0; i < data.length; i += 4) {
                        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        const value = avg > threshold ? 255 : 0;
                        data[i] = value;
                        data[i + 1] = value;
                        data[i + 2] = value;
                    }
                    ctx.putImageData(imageData, 0, 0);
                }

                setProcessedImage(canvas.toDataURL());
                resolve(canvas);
            };
        });
    };

    // Lancer l'OCR avec Tesseract optimisé
    const startOCR = async () => {
        if (!originalImage) return;
        if (!Tesseract) {
            setStatus('❌ Tesseract.js non chargé');
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setStatus('Préparation de l\'image...');

        try {
            const canvas = await preprocessImage();

            setStatus('Initialisation de Tesseract.js...');
            setProgress(5);

            // Créer le worker proprement
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('fra');
            workerRef.current = worker;
            
            setProgress(10);

            setStatus('Configuration des paramètres OCR optimaux...');
            
            // Configuration ultra-optimisée pour reconnaissance de chiffres
            await worker.setParameters({
                tessedit_ocr_engine_mode: '1',
                tessedit_pageseg_mode: '11',
                tessedit_char_whitelist: '0123456789',
                preserve_interword_spaces: '0',
                classify_bln_numeric_mode: '1',
            });
            
            console.log('[OCR] Paramètres configurés');

            setStatus('Analyse de l\'image en haute résolution...');
            setProgress(15);
            
            // Simuler la progression pendant l'OCR
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev < 90) return prev + 1;
                    return prev;
                });
            }, 500);
            
            // Reconnaissance avec sortie HOCR pour avoir les coordonnées
            console.log('[OCR] Lancement de la reconnaissance HOCR...');
            
            // Tesseract.js récent : utiliser l'API bas niveau pour récupérer HOCR
            const hocrResult = await worker.recognize(canvas);
            
            clearInterval(progressInterval);
            setStatus('Extraction des coordonnées depuis HOCR...');
            setProgress(92);

            console.log('[OCR] Résultat complet:', hocrResult);
            console.log('[OCR] data disponible:', hocrResult.data);
            console.log('[OCR] data.hocr type:', typeof hocrResult.data.hocr);
            console.log('[OCR] data.hocr longueur:', hocrResult.data.hocr ? hocrResult.data.hocr.length : 0);
            console.log('[OCR] data.hocr disponible:', !!hocrResult.data.hocr);
            
            // Parser le HOCR pour extraire les mots avec coordonnées
            let words = [];
            
            if (hocrResult.data.hocr) {
                console.log('[OCR] Parsing du HOCR...');
                const hocr = hocrResult.data.hocr;
                console.log('[OCR] HOCR preview (100 premiers caractères):', hocr.substring(0, 100));
                
                // Parser le HTML HOCR
                const parser = new DOMParser();
                const doc = parser.parseFromString(hocr, 'text/html');
                
                // Extraire tous les mots (class="ocrx_word")
                const wordElements = doc.querySelectorAll('.ocrx_word');
                console.log('[OCR] Éléments ocrx_word trouvés:', wordElements.length);
                
                // Si pas de .ocrx_word, essayer d'autres sélecteurs
                if (wordElements.length === 0) {
                    console.log('[OCR] Pas de .ocrx_word, essai avec .ocr_line');
                    const lineElements = doc.querySelectorAll('.ocr_line');
                    console.log('[OCR] Éléments ocr_line trouvés:', lineElements.length);
                    
                    if (lineElements.length > 0) {
                        console.log('[OCR] Exemple ocr_line:', lineElements[0].outerHTML.substring(0, 200));
                    }
                }
                
                let wordCount = 0;
                wordElements.forEach((el, idx) => {
                    const text = el.textContent.trim();
                    const title = el.getAttribute('title');
                    
                    if (idx < 3) {
                        console.log(`[OCR] Mot ${idx}:`, { text, title });
                    }
                    
                    if (!title) return;
                    
                    // Extraire les coordonnées: "bbox x0 y0 x1 y1; x_wconf XX"
                    const bboxMatch = title.match(/bbox (\d+) (\d+) (\d+) (\d+)/);
                    const confMatch = title.match(/x_wconf (\d+)/);
                    
                    if (bboxMatch && text) {
                        const x0 = parseInt(bboxMatch[1]);
                        const y0 = parseInt(bboxMatch[2]);
                        const x1 = parseInt(bboxMatch[3]);
                        const y1 = parseInt(bboxMatch[4]);
                        const conf = confMatch ? parseFloat(confMatch[1]) : 70;
                        
                        if (wordCount < 3) {
                            console.log(`[OCR] Coordonnées extraites pour "${text}":`, { x0, y0, x1, y1, conf });
                        }
                        
                        words.push({
                            text: text,
                            confidence: conf,
                            bbox: { x0, y0, x1, y1 }
                        });
                        wordCount++;
                    }
                });
                
                console.log('[OCR] Mots extraits du HOCR:', words.length);
                
                if (words.length > 0) {
                    console.log('[OCR] Premier mot extrait:', words[0]);
                    console.log('[OCR] Dernier mot extrait:', words[words.length - 1]);
                }
            }
            
            // Fallback sur le texte brut si pas de HOCR
            if (words.length === 0) {
                console.warn('[OCR] HOCR vide ou non disponible, utilisation du texte brut');
                const text = hocrResult.data.text;
                const numbers = text.match(/\b\d{1,2}\b/g) || [];
                console.log('[OCR] Nombres extraits du texte:', numbers);
                
                if (numbers.length > 0) {
                    alert(`⚠️ OCR détecté ${numbers.length} numéros mais sans coordonnées.\n\nLes numéros ne pourront pas être affichés sur le plan.\n\nNuméros détectés: ${numbers.join(', ')}`);
                }
                
                words = numbers.map(num => ({
                    text: num,
                    confidence: 70,
                    bbox: { x0: 0, y0: 0, x1: 0, y1: 0 }
                }));
            }

            console.log('[OCR] Total mots bruts:', words.length);

            // Filtrer et traiter les résultats avec seuil plus bas
            const minConfidence = useColorMode ? 40 : 50;
            const filteredWords = words.filter(word => {
                if (!word || !word.text) return false;
                const text = word.text.trim();
                const isValid = /^\d{1,2}$/.test(text) && word.confidence > minConfidence;
                if (isValid) {
                    console.log(`[OCR] Valide: ${text} (confiance: ${Math.round(word.confidence)}%, bbox:`, word.bbox, ')');
                }
                return isValid;
            });

            console.log('[OCR] Mots filtrés:', filteredWords.length);

            // Dédoublonnage amélioré
            const grouped = [];
            const distanceThreshold = Math.max(30, canvas.width / 100);

            filteredWords.forEach(word => {
                const existing = grouped.find(g => {
                    const dx = Math.abs(g.bbox.x0 - word.bbox.x0);
                    const dy = Math.abs(g.bbox.y0 - word.bbox.y0);
                    return dx < distanceThreshold && dy < distanceThreshold && g.text === word.text;
                });

                if (!existing) {
                    grouped.push(word);
                } else if (word.confidence > existing.confidence) {
                    const idx = grouped.indexOf(existing);
                    grouped[idx] = word;
                }
            });

            console.log('[OCR] Après dédoublonnage:', grouped.length);

            const rooms = grouped.map(word => {
                const number = word.text.trim();
                const x = Math.round((word.bbox.x0 + word.bbox.x1) / 2);
                const y = Math.round((word.bbox.y0 + word.bbox.y1) / 2);
                const w = Math.round(word.bbox.x1 - word.bbox.x0);
                const h = Math.round(word.bbox.y1 - word.bbox.y0);

                return {
                    number,
                    site: getSite(number),
                    x,
                    y,
                    w,
                    h,
                    confidence: Math.round(word.confidence),
                };
            }).sort((a, b) => parseInt(a.number) - parseInt(b.number));

            setDetectedRooms(rooms);

            await worker.terminate();
            workerRef.current = null;

            setStatus(`✅ Terminé ! ${rooms.length} salles détectées`);
            setProgress(100);

            // Créer l'image annotée
            createAnnotatedImage(rooms);

        } catch (error) {
            console.error('[OCR] Erreur:', error);
            setStatus(`❌ Erreur: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Créer l'image annotée
    const createAnnotatedImage = (rooms) => {
        if (!originalImage || !annotatedCanvasRef.current) return;

        const canvas = annotatedCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = originalImage;

        img.onload = () => {
            const scaleFactor = scale / 100;
            canvas.width = img.naturalWidth * scaleFactor;
            canvas.height = img.naturalHeight * scaleFactor;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            rooms.forEach(room => {
                let borderColor;
                if (room.site === 'Conté') {
                    borderColor = '#10b981';
                } else if (room.site === 'St-Martin') {
                    borderColor = '#f59e0b';
                } else {
                    borderColor = '#ef4444';
                }

                // Rectangle de détection
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 4;
                ctx.strokeRect(
                    room.x - room.w / 2,
                    room.y - room.h / 2,
                    room.w,
                    room.h
                );

                // Texte avec fond
                const fontSize = Math.max(24, Math.min(room.h * 1.8, 60));
                ctx.font = `bold ${fontSize}px Arial`;
                const textMetrics = ctx.measureText(room.number);
                const textWidth = textMetrics.width;
                const textHeight = fontSize;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                ctx.fillRect(
                    room.x - textWidth / 2 - 8,
                    room.y - textHeight / 2 - 8,
                    textWidth + 16,
                    textHeight + 16
                );

                // Numéro en rouge vif
                ctx.fillStyle = '#ff0000';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeText(room.number, room.x, room.y);
                ctx.fillText(room.number, room.x, room.y);

                // Confiance
                ctx.font = `${Math.max(12, fontSize * 0.45)}px Arial`;
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`${room.confidence}%`, room.x, room.y + textHeight * 0.75);
            });

            setAnnotatedImage(canvas.toDataURL());
        };
    };

    // Re-prétraiter quand les paramètres changent
    useEffect(() => {
        if (originalImage) {
            preprocessImage();
        }
    }, [originalImage, scale, sharpness, contrast, brightness, threshold, useColorMode]);

    // Cleanup au démontage
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    // Copier le code
    const copyCode = () => {
        const coordinates = {};
        detectedRooms.forEach(room => {
            coordinates[room.number] = { x: room.x, y: room.y };
        });

        const code = `// Coordonnées détectées automatiquement par OCR
// Génération: ${new Date().toLocaleString('fr-FR')}
// Total: ${detectedRooms.length} salles

const BUILDING_COORDINATES = ${JSON.stringify(coordinates, null, 4)};`;

        navigator.clipboard.writeText(code).then(() => {
            alert('✅ Code copié dans le presse-papier !');
        });
    };

    // Télécharger JSON
    const downloadJSON = () => {
        const data = {
            generated: new Date().toISOString(),
            total: detectedRooms.length,
            rooms: detectedRooms,
            coordinates: detectedRooms.reduce((acc, room) => {
                acc[room.number] = { x: room.x, y: room.y };
                return acc;
            }, {}),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cnam-rooms-ocr-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Télécharger l'image annotée
    const downloadAnnotated = () => {
        if (!annotatedImage) return;
        const a = document.createElement('a');
        a.href = annotatedImage;
        a.download = `cnam-plan-annote-${Date.now()}.png`;
        a.click();
    };

    const conteCount = detectedRooms.filter(r => r.site === 'Conté').length;
    const stMartinCount = detectedRooms.filter(r => r.site === 'St-Martin').length;
    const unknownCount = detectedRooms.filter(r => r.site === 'Inconnu').length;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>🔍 Extracteur OCR - Numéros de Salles CNAM</h1>
                <p>Détection automatique haute précision avec Tesseract.js</p>
            </div>

            <div className={styles.content}>
                {/* Upload */}
                <div className={styles.uploadZone} onClick={() => fileInputRef.current?.click()}>
                    <div className={styles.uploadIcon}>📁</div>
                    <h2>Glissez-déposez le plan CNAM (PNG/JPG/SVG)</h2>
                    <p>ou cliquez pour choisir un fichier</p>
                    <p className={styles.hint}>📌 Haute résolution recommandée</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Contrôles */}
                {originalImage && (
                    <div className={styles.controls}>
                        <div className={styles.controlRow}>
                            <label className={styles.checkbox}>
                                <input
                                    type="checkbox"
                                    checked={useColorMode}
                                    onChange={(e) => setUseColorMode(e.target.checked)}
                                />
                                <span>🎨 Mode Couleur (recommandé)</span>
                            </label>
                        </div>

                        <div className={styles.sliderControl}>
                            <label>
                                Échelle de l'image <span className={styles.value}>{scale}%</span>
                            </label>
                            <input
                                type="range"
                                min="100"
                                max="500"
                                step="50"
                                value={scale}
                                onChange={(e) => setScale(parseInt(e.target.value))}
                            />
                            <p className={styles.hint}>💡 Plus l'échelle est haute, meilleure est la détection</p>
                        </div>

                        <div className={styles.sliderControl}>
                            <label>
                                Netteté (Unsharp Mask) <span className={styles.value}>{sharpness}%</span>
                            </label>
                            <input
                                type="range"
                                min="100"
                                max="300"
                                value={sharpness}
                                onChange={(e) => setSharpness(parseInt(e.target.value))}
                            />
                        </div>

                        {!useColorMode && (
                            <div className={styles.bwControls}>
                                <div className={styles.sliderControl}>
                                    <label>Contraste <span className={styles.value}>{contrast}%</span></label>
                                    <input
                                        type="range"
                                        min="50"
                                        max="200"
                                        value={contrast}
                                        onChange={(e) => setContrast(parseInt(e.target.value))}
                                    />
                                </div>
                                <div className={styles.sliderControl}>
                                    <label>Luminosité <span className={styles.value}>{brightness}%</span></label>
                                    <input
                                        type="range"
                                        min="50"
                                        max="200"
                                        value={brightness}
                                        onChange={(e) => setBrightness(parseInt(e.target.value))}
                                    />
                                </div>
                                <div className={styles.sliderControl}>
                                    <label>Seuil <span className={styles.value}>{threshold}</span></label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="255"
                                        value={threshold}
                                        onChange={(e) => setThreshold(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            className={styles.btnPrimary}
                            onClick={startOCR}
                            disabled={isProcessing}
                        >
                            {isProcessing ? '⏳ Traitement...' : '🚀 Lancer l\'OCR Haute Précision'}
                        </button>
                    </div>
                )}

                {/* Progress */}
                {isProcessing && (
                    <div className={styles.progressContainer}>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${progress}%` }}>
                                {progress}%
                            </div>
                        </div>
                        <div className={styles.status}>{status}</div>
                    </div>
                )}

                {/* Preview */}
                {originalImage && (
                    <div className={styles.previewGrid}>
                        <div className={styles.previewBox}>
                            <h3>📸 Image Originale</h3>
                            <img src={originalImage} alt="Original" />
                        </div>
                        <div className={styles.previewBox}>
                            <h3>⚙️ Image Pré-traitée</h3>
                            <canvas ref={processedCanvasRef} />
                            <p className={styles.modeIndicator}>
                                {useColorMode ? '🎨 Mode Couleur' : '⚫⚪ Mode N&B'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Annotated */}
                {annotatedImage && (
                    <div className={styles.annotatedContainer}>
                        <h2>🎯 Détections Superposées</h2>
                        <div className={styles.previewBox}>
                            <h3>Plan avec Numéros Détectés</h3>
                            <canvas ref={annotatedCanvasRef} />
                        </div>
                        <p className={styles.hint}>🔴 Les numéros en rouge indiquent les salles détectées</p>
                    </div>
                )}

                {/* Results */}
                {detectedRooms.length > 0 && (
                    <div className={styles.results}>
                        <h2>📊 Résultats de la Détection</h2>

                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{detectedRooms.length}</div>
                                <div className={styles.statLabel}>Total Salles</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{conteCount}</div>
                                <div className={styles.statLabel}>🟢 Conté</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{stMartinCount}</div>
                                <div className={styles.statLabel}>🟠 St-Martin</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{unknownCount}</div>
                                <div className={styles.statLabel}>❓ Inconnu</div>
                            </div>
                        </div>

                        <h3>🗺️ Salles Détectées</h3>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Numéro</th>
                                        <th>Site</th>
                                        <th>Coordonnées (x, y)</th>
                                        <th>Dimensions (w × h)</th>
                                        <th>Confiance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detectedRooms.map((room, i) => (
                                        <tr key={i}>
                                            <td><strong>{room.number}</strong></td>
                                            <td>
                                                <span className={`${styles.badge} ${styles[`badge${room.site.replace('-', '').replace('é', 'e')}`]}`}>
                                                    {room.site}
                                                </span>
                                            </td>
                                            <td>{room.x}, {room.y}</td>
                                            <td>{room.w} × {room.h}</td>
                                            <td>{room.confidence}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h3>💻 Code JavaScript</h3>
                        <pre className={styles.codeOutput}>
{`// Coordonnées détectées automatiquement par OCR
// Génération: ${new Date().toLocaleString('fr-FR')}
// Total: ${detectedRooms.length} salles

const BUILDING_COORDINATES = ${JSON.stringify(
    detectedRooms.reduce((acc, room) => {
        acc[room.number] = { x: room.x, y: room.y };
        return acc;
    }, {}),
    null,
    4
)};`}
                        </pre>

                        <div className={styles.actions}>
                            <button className={styles.btn} onClick={copyCode}>
                                📋 Copier le Code
                            </button>
                            <button className={styles.btn} onClick={downloadJSON}>
                                💾 Télécharger JSON
                            </button>
                            <button className={styles.btn} onClick={downloadAnnotated}>
                                🖼️ Télécharger Image Annotée
                            </button>
                            <button className={styles.btn} onClick={() => window.location.reload()}>
                                🔄 Nouveau Scan
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
