/**
 * Script pour définir une version spécifique dans package.json
 * Usage: node set-version.js 2.0.0
 */

const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];

if (!newVersion) {
    console.error('Erreur: Version manquante');
    console.error('Usage: node set-version.js 2.0.0');
    process.exit(1);
}

// Valider le format
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error('Erreur: Format de version invalide');
    console.error('Format attendu: X.Y.Z (exemple: 2.0.0)');
    process.exit(1);
}

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
    console.log(`✅ Version ${newVersion} définie dans package.json`);
} catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
}

