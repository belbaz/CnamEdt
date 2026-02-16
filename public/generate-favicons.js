import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Image source principale dans public/
const inputFile = path.join(__dirname, '../public/favicon.png');
// Toutes les icônes générées seront dans public/ à la racine,
// pour être accessibles via /favicon-16x16.png, /favicon.ico, etc.
const outputDir = path.join(__dirname, '../public');

// Vérifier que le fichier source existe
if (!fs.existsSync(inputFile)) {
    console.error(`Erreur: Le fichier ${inputFile} n'existe pas !`);
    process.exit(1);
}

async function generateFavicons() {
    try {
        console.log('Génération des favicons à partir de:', inputFile);

        // Lire l'image source
        const image = sharp(inputFile);

        // Générer favicon-16x16.png
        await image
            .clone()
            .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(path.join(outputDir, 'favicon-16x16.png'));
        console.log('✓ favicon-16x16.png généré');

        // Générer favicon-32x32.png
        await image
            .clone()
            .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(path.join(outputDir, 'favicon-32x32.png'));
        console.log('✓ favicon-32x32.png généré');

        // Générer apple-touch-icon.png (180x180)
        await image
            .clone()
            .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(path.join(outputDir, 'apple-touch-icon.png'));
        console.log('✓ apple-touch-icon.png généré');

        // Générer android-chrome-192x192.png
        await image
            .clone()
            .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(path.join(outputDir, 'android-chrome-192x192.png'));
        console.log('✓ android-chrome-192x192.png généré');

        // Générer android-chrome-512x512.png
        await image
            .clone()
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(path.join(outputDir, 'android-chrome-512x512.png'));
        console.log('✓ android-chrome-512x512.png généré');

        // Générer favicon.ico (format ICO avec plusieurs tailles)
        // Note: sharp ne supporte pas directement ICO, on va créer un PNG temporaire
        // et utiliser une approche alternative ou simplement copier le 32x32 comme favicon.ico
        // Pour un vrai ICO, on pourrait utiliser un autre package, mais pour la plupart des navigateurs,
        // un PNG renommé en .ico fonctionne aussi
        await image
            .clone()
            .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(path.join(outputDir, 'favicon.ico'));
        console.log('✓ favicon.ico généré (format PNG, compatible avec la plupart des navigateurs)');

        console.log('\n✅ Toutes les favicons ont été générées avec succès !');
    } catch (error) {
        console.error('Erreur lors de la génération des favicons:', error);
        process.exit(1);
    }
}

generateFavicons();

