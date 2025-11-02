/**
 * Script pour générer les icônes Android depuis le SVG favicon
 * Nécessite sharp: npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');

// Tailles pour chaque densité Android
const sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
};

async function generateIcons() {
    try {
        const sharp = require('sharp');
        const svgPath = path.join(__dirname, '../public/favicon.svg');
        const outputBase = path.join(__dirname, '../android/app/src/main/res');
        
        if (!fs.existsSync(svgPath)) {
            console.error('❌ favicon.svg not found in public folder');
            return;
        }
        
        console.log('🔄 Generating Android icons from favicon.svg...\n');
        
        for (const [folder, size] of Object.entries(sizes)) {
            const outputDir = path.join(outputBase, folder);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // Générer ic_launcher.png
            await sharp(svgPath)
                .resize(size, size)
                .png()
                .toFile(path.join(outputDir, 'ic_launcher.png'));
            
            // Générer ic_launcher_round.png (même image)
            await sharp(svgPath)
                .resize(size, size)
                .png()
                .toFile(path.join(outputDir, 'ic_launcher_round.png'));
            
            // Générer ic_launcher_foreground.png (juste le contenu, sans fond)
            await sharp(svgPath)
                .resize(size, size)
                .png()
                .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));
            
            console.log(`✅ Generated icons for ${folder} (${size}x${size})`);
        }
        
        console.log('\n✨ All Android icons generated successfully!');
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.error('❌ Error: sharp module not found');
            console.error('📦 Please install it with: npm install sharp --save-dev');
            console.error('\nOr manually convert favicon.svg to PNG files in the mipmap folders.');
        } else {
            console.error('❌ Error generating icons:', error.message);
        }
    }
}

generateIcons();

