const fs = require('fs');
const path = require('path');

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
