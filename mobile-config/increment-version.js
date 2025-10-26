/**
 * Script pour incrémenter automatiquement la version dans package.json
 * Incrémente la version patch (0.0.1)
 * Usage: node increment-version.js
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
    // Lire le package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version;

    console.log(`Version actuelle : ${currentVersion}`);

    // Parser la version (format X.Y.Z)
    const versionParts = currentVersion.split('.');
    if (versionParts.length !== 3) {
        console.error('❌ Format de version invalide dans package.json');
        process.exit(1);
    }

    // Incrémenter la version patch (+0.0.1)
    const major = parseInt(versionParts[0]);
    const minor = parseInt(versionParts[1]);
    const patch = parseInt(versionParts[2]) + 1;

    const newVersion = `${major}.${minor}.${patch}`;
    console.log(`Nouvelle version : ${newVersion}`);

    // Mettre à jour package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

    console.log('✅ Version mise à jour dans package.json');
    
    // Retourner la nouvelle version pour le script batch
    console.log(`NEW_VERSION=${newVersion}`);

} catch (error) {
    console.error('❌ Erreur lors de l\'incrémentation de la version :', error.message);
    process.exit(1);
}

