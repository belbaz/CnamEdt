const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[pre-build] Démarrage du script pre-build...');

const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
const apiDir = path.join(__dirname, '../src/app/api');
const backupDir = path.join(__dirname, '../src/app/_api_backup');

// Vérifier que la config Next.js est correcte (pas de output: 'export')
try {
  const content = fs.readFileSync(nextConfigPath, 'utf8');
  const lines = content.split('\n');
  let hasExport = false;
  
  // Vérifier ligne par ligne en ignorant les commentaires
  for (const line of lines) {
    const trimmed = line.trim();
    // Ignorer les commentaires (// et lignes vides)
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed === '') continue;
    // Chercher output: 'export' ou output: "export" dans le code actif
    if (/output\s*:\s*['"]export['"]/i.test(trimmed)) {
      hasExport = true;
      break;
    }
  }
  
  if (hasExport) {
    console.error('[pre-build] ❌ ERREUR: next.config.js contient output: export !');
    console.error('[pre-build] Les API routes ne fonctionneront pas avec output: export');
    console.error('[pre-build] Veuillez retirer output: export de next.config.js');
    process.exit(1);
  } else {
    console.log('[pre-build] ✓ Configuration Next.js correcte (pas de output: export)');
  }
} catch (e) {
  console.error('[pre-build] Erreur lors de la vérification de next.config.js:', e.message);
  // Ne pas faire échouer le build si on ne peut pas lire le fichier
}

// Vérifier que les routes API existent (restaurer depuis backup si nécessaire)
console.log('[pre-build] Vérification des routes API...');

if (!fs.existsSync(apiDir) && fs.existsSync(backupDir)) {
  console.log('[pre-build] ⚠️  Dossier API manquant détecté, restauration depuis backup...');
  try {
    fs.renameSync(backupDir, apiDir);
    console.log('[pre-build] ✓ Dossier API restauré');
  } catch (e) {
    console.error('[pre-build] ERREUR lors de la restauration:', e.message);
    process.exit(1);
  }
} else if (fs.existsSync(apiDir)) {
  console.log('[pre-build] ✓ Routes API présentes');
  // Lister les routes pour vérification
  try {
    const routes = fs.readdirSync(apiDir, { recursive: true });
    const routeFiles = routes.filter(r => r.endsWith('.js') || r.endsWith('.ts'));
    if (routeFiles.length > 0) {
      console.log('[pre-build] Routes trouvées:', routeFiles.slice(0, 5).join(', '), routeFiles.length > 5 ? '...' : '');
    }
  } catch (e) {
    console.log('[pre-build] Impossible de lister les routes:', e.message);
  }
} else {
  console.error('[pre-build] ⚠️  Dossier API introuvable - les routes API ne fonctionneront pas !');
  console.error('[pre-build] Chemin attendu:', apiDir);
  // Ne pas faire échouer le build, juste avertir (peut être normal si pas encore créé)
}

// Injecter la version dans le Service Worker
console.log('[pre-build] Injection de la version dans le Service Worker...');
try {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const swPath = path.join(__dirname, '..', 'public', 'sw.js');
  
  if (fs.existsSync(packageJsonPath) && fs.existsSync(swPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version || '1.0.0';
    const swContent = fs.readFileSync(swPath, 'utf8');
    
    // Remplacer CACHE_VERSION par la version du package.json
    const updatedSwContent = swContent.replace(
      /const CACHE_VERSION = ['"][^'"]*['"];?/,
      `const CACHE_VERSION = '${version}';`
    );
    
    fs.writeFileSync(swPath, updatedSwContent, 'utf8');
    console.log(`[pre-build] ✓ Version ${version} injectée dans sw.js`);
  } else {
    console.warn('[pre-build] ⚠️  Impossible d\'injecter la version (fichiers manquants)');
  }
} catch (e) {
  console.error('[pre-build] Erreur lors de l\'injection de la version:', e.message);
  // Ne pas faire échouer le build
}

// Générer un fichier build-info.js avec la date du dernier commit Git
console.log('[pre-build] Génération de src/build-info.js avec la date du dernier commit Git...');
try {
  let commitDate = null;
  try {
    // %cI = date ISO 8601 du dernier commit (auteur)
    commitDate = execSync('git log -1 --format=%cI', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    console.log('[pre-build] Dernier commit Git trouvé avec la date =', commitDate);
  } catch (e) {
    console.warn('[pre-build] Impossible de récupérer la date du dernier commit via git:', e.message);
  }

  const targetPath = path.join(__dirname, '..', 'src', 'build-info.js');
  const content =
    `// Fichier généré automatiquement par scripts/pre-build.js\n` +
    `// Date ISO du dernier commit Git déployé (ou null si inconnue)\n` +
    `export const buildCommitTimestamp = ${commitDate ? `'${commitDate}'` : 'null'};\n`;

  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(
    '[pre-build] ✓ Fichier build-info.js généré avec la date du dernier commit =',
    commitDate || 'null'
  );
} catch (e) {
  console.error('[pre-build] Erreur lors de la génération de build-info.js:', e.message);
  // Ne pas faire échouer le build pour cette fonctionnalité
}

console.log('[pre-build] Pre-build terminé avec succès');
