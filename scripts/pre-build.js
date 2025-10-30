const fs = require('fs');
const path = require('path');

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
