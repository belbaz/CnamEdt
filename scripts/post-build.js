const fs = require('fs');
const path = require('path');

// Ne restaurer le dossier API que si on était en mode mobile (export statique)
// Sur Vercel (build web), il n'y a rien à restaurer
const isMobileBuild = process.env.BUILD_MODE === 'mobile';

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
