const fs = require('fs');
const path = require('path');

// Ne renommer le dossier API que si on est en mode mobile (export statique)
// Sur Vercel (build web), on doit garder les routes API actives
// Note: sous Windows, les envs de cross-env ne se propagent pas toujours aux sous-commandes npm.
// On détecte donc aussi le mode mobile en lisant la config Next.js active et en vérifiant output: 'export'.
let isMobileBuild = process.env.BUILD_MODE === 'mobile';
try {
  const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
  if (fs.existsSync(nextConfigPath)) {
    const content = fs.readFileSync(nextConfigPath, 'utf8');
    if (/output\s*:\s*['"]export['"]/i.test(content)) {
      isMobileBuild = true;
      console.log('[pre-build] Mode mobile détecté (output: export trouvé)');
    } else {
      console.log('[pre-build] Mode web détecté (pas de output: export)');
    }
  } else {
    console.log('[pre-build] next.config.js introuvable, utilisation de BUILD_MODE:', process.env.BUILD_MODE || 'non défini');
  }
} catch (e) {
  console.log('[pre-build] Erreur lors de la lecture de next.config.js:', e.message);
}

const apiDir = path.join(__dirname, '../src/app/api');
const backupDir = path.join(__dirname, '../src/app/_api_backup');

// Si on est en mode web, s'assurer que le dossier API existe (restaurer si nécessaire)
if (!isMobileBuild) {
  console.log('Build web détecté - Vérification des routes API...');
  
  // Si le dossier API n'existe pas mais qu'il y a un backup, le restaurer
  if (!fs.existsSync(apiDir) && fs.existsSync(backupDir)) {
    console.log('⚠️  Dossier API manquant détecté, restauration depuis backup...');
    fs.renameSync(backupDir, apiDir);
    console.log('✓ Dossier API restauré pour Vercel');
  } else if (fs.existsSync(apiDir)) {
    console.log('✓ Routes API présentes pour Vercel');
  } else {
    console.log('⚠️  Dossier API introuvable - les routes API ne fonctionneront pas !');
  }
  
  process.exit(0);
}

// Mode mobile : renommer le dossier API pour le build statique
console.log('Renommage du dossier API pour le build statique...');

// Vérifier si le dossier API existe
if (fs.existsSync(apiDir)) {
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
