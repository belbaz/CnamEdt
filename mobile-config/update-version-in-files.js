/**
 * Script pour mettre à jour la version dans tous les fichiers nécessaires
 * Usage: node update-version-in-files.js
 */

const fs = require('fs');
const path = require('path');

// Lire la version depuis package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

console.log(`\n📝 Mise à jour de la version vers ${version} dans tous les fichiers...\n`);

// Fonction pour convertir version X.Y.Z en versionCode (ex: 1.1.23 -> 10123)
function versionToCode(version) {
    const parts = version.split('.').map(Number);
    // Format: X.Y.Z -> X*10000 + Y*100 + Z (ex: 1.1.23 -> 10000 + 100 + 23 = 10123)
    // Support jusqu'à 99.99.99 (versionCode max: 999999)
    let code = parts[0] * 10000 + parts[1] * 100 + (parts[2] || 0);
    
    // S'assurer que le versionCode est toujours supérieur au précédent
    // Lire le versionCode actuel depuis build.gradle
    const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
    if (fs.existsSync(buildGradlePath)) {
        try {
            const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf-8');
            const currentCodeMatch = buildGradleContent.match(/versionCode (\d+)/);
            if (currentCodeMatch) {
                const currentCode = parseInt(currentCodeMatch[1], 10);
                // Si le nouveau code est inférieur ou égal, l'incrémenter
                if (code <= currentCode) {
                    console.log(`⚠️  Attention: Le versionCode calculé (${code}) est inférieur ou égal au versionCode actuel (${currentCode})`);
                    console.log(`   Incrémentation du versionCode à ${currentCode + 1} pour éviter les conflits d'update`);
                    code = currentCode + 1;
                }
            }
        } catch (error) {
            // Si on ne peut pas lire le fichier, continuer avec le code calculé
            console.log(`⚠️  Impossible de vérifier le versionCode actuel: ${error.message}`);
        }
    }
    
    return code;
}

// Liste des fichiers à mettre à jour
const filesToUpdate = [
    {
        path: path.join(__dirname, '..', 'src', 'app', 'api', 'version', 'route.js'),
        regex: /const currentVersion = ["'][\d.]+["'];/,
        replacement: `const currentVersion = "${version}";`
    },
    {
        path: path.join(__dirname, '..', 'src', 'app', 'page.js'),
        regex: /currentVersion=["'][\d.]+["']/g,
        replacement: `currentVersion="${version}"`
    },
    {
        path: path.join(__dirname, '..', 'android', 'app', 'build.gradle'),
        regex: /versionCode \d+/,
        replacement: `versionCode ${versionToCode(version)}`
    },
    {
        path: path.join(__dirname, '..', 'android', 'app', 'build.gradle'),
        regex: /versionName ["'][\d.]+["']/,
        replacement: `versionName "${version}"`
    }
];

let successCount = 0;
let errorCount = 0;

// Mettre à jour chaque fichier
filesToUpdate.forEach(file => {
    try {
        // Vérifier d'abord si le fichier est temporairement dans _api_backup
        let filePath = file.path;
        if (!fs.existsSync(filePath)) {
            const backupPath = filePath.replace(/\\api\\/, '\\_api_backup\\').replace(/\/api\//, '/_api_backup/');
            if (fs.existsSync(backupPath)) {
                filePath = backupPath;
                console.log(`🔄 Utilisation du backup : ${path.relative(path.join(__dirname, '..'), backupPath)}`);
            } else {
                console.log(`⚠️  Fichier ignoré (temporairement déplacé) : ${path.relative(path.join(__dirname, '..'), file.path)}`);
                return; // Pas d'erreur, juste ignoré
            }
        }

        let content = fs.readFileSync(filePath, 'utf-8');
        const originalContent = content;
        
        content = content.replace(file.regex, file.replacement);
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`✅ ${path.relative(path.join(__dirname, '..'), filePath)}`);
            successCount++;
        } else {
            console.log(`ℹ️  ${path.relative(path.join(__dirname, '..'), filePath)} (déjà à jour)`);
            successCount++;
        }
    } catch (error) {
        console.error(`❌ Erreur pour ${path.relative(path.join(__dirname, '..'), file.path)}: ${error.message}`);
        errorCount++;
    }
});

console.log(`\n========================================`);
console.log(`✅ ${successCount} fichier(s) traité(s)`);
if (errorCount > 0) {
    console.log(`❌ ${errorCount} erreur(s)`);
}
console.log(`========================================\n`);

if (errorCount > 0) {
    process.exit(1);
}

