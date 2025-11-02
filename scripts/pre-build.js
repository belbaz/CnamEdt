const fs = require('fs');
const path = require('path');

// Ne renommer le dossier API que si on est en mode mobile (export statique)
// Sur Vercel (build web), on doit garder les routes API actives
const isMobileBuild = process.env.BUILD_MODE === 'mobile';

if (!isMobileBuild) {
  console.log('Build web détecté - Routes API conservées pour Vercel');
  // Flush stdout pour s'assurer que le message est visible
  process.stdout.write('');
  process.exit(0);
}

const apiDir = path.join(__dirname, '../src/app/api');
const backupDir = path.join(__dirname, '../src/app/_api_backup');

// Vérifier si le dossier API existe
if (fs.existsSync(apiDir)) {
  console.log('Renommage du dossier API pour le build statique...');
  
  // Supprimer l'ancien backup s'il existe
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
  
  // Renommer le dossier API
  fs.renameSync(apiDir, backupDir);
  console.log('✓ Dossier API renommé en _api_backup');
} else {
  console.log('Dossier API déjà renommé ou inexistant');
}
