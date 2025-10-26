/**
 * Script pour récupérer la version depuis package.json
 * Usage: node get-version.js
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    console.log(packageJson.version);
} catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
}

