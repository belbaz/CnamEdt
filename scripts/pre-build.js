const fs = require('fs');
const path = require('path');

console.log('[pre-build] Démarrage du script pre-build...');

// Ne renommer le dossier API que si on est en mode mobile (export statique)
// Sur Vercel (build web), on doit garder les routes API actives
// Note: sous Windows, les envs de cross-env ne se propagent pas toujours aux sous-commandes npm.
// On détecte donc aussi le mode mobile en lisant la config Next.js active et en vérifiant output: 'export'.
let isMobileBuild = process.env.BUILD_MODE === 'mobile';
console.log('[pre-build] BUILD_MODE:', process.env.BUILD_MODE || 'non défini');

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
  console.error('[pre-build] Erreur lors de la lecture de next.config.js:', e.message);
  // En cas d'erreur, supposer mode web pour Vercel
  isMobileBuild = false;
}

const apiDir = path.join(__dirname, '../src/app/api');
const backupDir = path.join(__dirname, '../src/app/_api_backup');

// Si on est en mode web, s'assurer que le dossier API existe (restaurer si nécessaire)
if (!isMobileBuild) {
  console.log('[pre-build] Build web détecté - Vérification des routes API...');
  
  // Si le dossier API n'existe pas mais qu'il y a un backup, le restaurer
  if (!fs.existsSync(apiDir) && fs.existsSync(backupDir)) {
    console.log('[pre-build] ⚠️  Dossier API manquant détecté, restauration depuis backup...');
    try {
      fs.renameSync(backupDir, apiDir);
      console.log('[pre-build] ✓ Dossier API restauré pour Vercel');
    } catch (e) {
      console.error('[pre-build] ERREUR lors de la restauration:', e.message);
      process.exit(1);
    }
  } else if (fs.existsSync(apiDir)) {
    console.log('[pre-build] ✓ Routes API présentes pour Vercel');
    // Lister les routes pour vérification
    try {
      const routes = fs.readdirSync(apiDir, { recursive: true });
      console.log('[pre-build] Routes trouvées:', routes.filter(r => r.endsWith('.js')).join(', '));
    } catch (e) {
      console.log('[pre-build] Impossible de lister les routes:', e.message);
    }
  } else {
    console.error('[pre-build] ⚠️  Dossier API introuvable - les routes API ne fonctionneront pas !');
    console.error('[pre-build] Chemin attendu:', apiDir);
    // Ne pas faire échouer le build, juste avertir
  }
  
  console.log('[pre-build] Pre-build terminé avec succès (mode web)');
  // Ne pas faire process.exit() dans un hook npm, npm gère ça
  return;
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
  console.log('[pre-build] ✓ Dossier API renommé en _api_backup');
} else {
  console.log('[pre-build] Dossier API déjà renommé ou inexistant');
}
