const fs = require('fs');
const path = require('path');

// Ne restaurer le dossier API que si on était en mode mobile (export statique)
// Sous Windows, l'env peut ne pas être propagé; on détecte également via output: 'export'.
let isMobileBuild = process.env.BUILD_MODE === 'mobile';
try {
  const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
  if (fs.existsSync(nextConfigPath)) {
    const content = fs.readFileSync(nextConfigPath, 'utf8');
    if (/output\s*:\s*['"]export['"]/i.test(content)) {
      isMobileBuild = true;
    }
  }
} catch (_) {}

if (!isMobileBuild) {
  console.log('Build web détecté - Aucune restauration nécessaire');
  process.exit(0);
}

const apiDir = path.join(__dirname, '../src/app/api');
const backupDir = path.join(__dirname, '../src/app/_api_backup');

// Restaurer le dossier API après le build
if (fs.existsSync(backupDir)) {
  console.log('Restauration du dossier API...');
  
  // Supprimer le dossier API s'il existe déjà
  if (fs.existsSync(apiDir)) {
    fs.rmSync(apiDir, { recursive: true, force: true });
  }
  
  // Renommer le backup en API
  fs.renameSync(backupDir, apiDir);
  console.log('✓ Dossier API restauré');
} else {
  console.log('Aucun backup à restaurer');
}
