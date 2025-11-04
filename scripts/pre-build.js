const fs = require('fs');
const path = require('path');

console.log('[pre-build] Démarrage du script pre-build...');

// IMPORTANT: Toujours activer la config web AVANT de vérifier
// Cela garantit que sur Vercel, on a toujours la bonne config
const switchConfigPath = path.join(__dirname, 'switch-next-config.js');
const webConfigPath = path.join(__dirname, '..', 'next.config.web.js');
const nextConfigPath = path.join(__dirname, '..', 'next.config.js');

// Si on n'est pas en mode mobile explicite, forcer la config web
let isMobileBuild = process.env.BUILD_MODE === 'mobile';
console.log('[pre-build] BUILD_MODE:', process.env.BUILD_MODE || 'non défini');

// Si BUILD_MODE n'est pas 'mobile', activer la config web
if (!isMobileBuild) {
  console.log('[pre-build] Mode web détecté - Activation de la configuration web...');
  
  // Méthode 1: Utiliser le script switch-next-config.js s'il existe
  if (fs.existsSync(switchConfigPath)) {
    try {
      const { execSync } = require('child_process');
      execSync(`node "${switchConfigPath}" web`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      console.log('[pre-build] ✓ Configuration web activée via switch-next-config.js');
    } catch (e) {
      console.error('[pre-build] Erreur lors de l\'activation via switch-next-config.js:', e.message);
      // Fallback: copier directement le fichier
      if (fs.existsSync(webConfigPath)) {
        fs.copyFileSync(webConfigPath, nextConfigPath);
        console.log('[pre-build] ✓ Configuration web activée via copie directe');
      }
    }
  } else if (fs.existsSync(webConfigPath)) {
    // Méthode 2: Copier directement le fichier
    fs.copyFileSync(webConfigPath, nextConfigPath);
    console.log('[pre-build] ✓ Configuration web activée via copie directe');
  }
  
  // Vérifier que la config est correcte
  try {
    const content = fs.readFileSync(nextConfigPath, 'utf8');
    if (/output\s*:\s*['"]export['"]/i.test(content)) {
      console.error('[pre-build] ❌ ERREUR: next.config.js contient encore output: export après activation!');
      console.error('[pre-build] Contenu suspect trouvé dans next.config.js');
      // Ne pas faire échouer le build, mais avertir
    } else {
      console.log('[pre-build] ✓ Vérification: next.config.js est correct (pas de output: export)');
    }
  } catch (e) {
    console.error('[pre-build] Erreur lors de la vérification de next.config.js:', e.message);
  }
} else {
  console.log('[pre-build] Mode mobile détecté - Pas d\'activation de la config web');
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
