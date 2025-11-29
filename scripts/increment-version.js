#!/usr/bin/env node

/**
 * Script pour incrémenter la version dans package.json de 0.0.1
 * Utilisé par le hook Git pre-commit
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
  // Lire package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Extraire la version actuelle
  const currentVersion = packageJson.version;
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // Incrémenter le patch de 1 (0.0.1)
  const newPatch = patch + 1;
  const newVersion = `${major}.${minor}.${newPatch}`;
  
  // Mettre à jour la version
  packageJson.version = newVersion;
  
  // Sauvegarder package.json
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf8'
  );
  
  console.log(`[increment-version] Version incrémentée: ${currentVersion} → ${newVersion}`);
  
  // Ajouter package.json au staging area
  const { execSync } = require('child_process');
  try {
    execSync('git add package.json', { stdio: 'inherit' });
    console.log('[increment-version] package.json ajouté au staging area');
  } catch (error) {
    console.warn('[increment-version] Attention: impossible d\'ajouter package.json au staging area');
    console.warn('[increment-version] Vous devrez le faire manuellement: git add package.json');
  }
  
  process.exit(0);
} catch (error) {
  console.error('[increment-version] Erreur lors de l\'incrémentation de la version:', error.message);
  process.exit(1);
}

