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
    }
];

let successCount = 0;
let errorCount = 0;

// Mettre à jour chaque fichier
filesToUpdate.forEach(file => {
    try {
        if (!fs.existsSync(file.path)) {
            console.log(`⚠️  Fichier introuvable : ${path.relative(path.join(__dirname, '..'), file.path)}`);
            errorCount++;
            return;
        }

        let content = fs.readFileSync(file.path, 'utf-8');
        const originalContent = content;
        
        content = content.replace(file.regex, file.replacement);
        
        if (content !== originalContent) {
            fs.writeFileSync(file.path, content, 'utf-8');
            console.log(`✅ ${path.relative(path.join(__dirname, '..'), file.path)}`);
            successCount++;
        } else {
            console.log(`ℹ️  ${path.relative(path.join(__dirname, '..'), file.path)} (déjà à jour)`);
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

