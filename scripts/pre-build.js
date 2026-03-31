const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
const apiDir = path.join(__dirname, '../src/app/api');
const backupDir = path.join(__dirname, '../src/app/_api_backup');

// Vérifier que la config Next.js est correcte (pas de output: 'export')
try {
  const content = fs.readFileSync(nextConfigPath, 'utf8');
  const lines = content.split('\n');
  let hasExport = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed === '') continue;
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
  }
} catch (e) {
  console.error('[pre-build] Erreur lors de la vérification de next.config.js:', e.message);
}

// Vérifier que les routes API existent (restaurer depuis backup si nécessaire)
if (!fs.existsSync(apiDir) && fs.existsSync(backupDir)) {
  console.log('[pre-build] ⚠️  Restauration des routes API depuis backup...');
  try {
    fs.renameSync(backupDir, apiDir);
    console.log('[pre-build] ✓ Routes API restaurées');
  } catch (e) {
    console.error('[pre-build] ERREUR lors de la restauration:', e.message);
    process.exit(1);
  }
} else if (!fs.existsSync(apiDir)) {
  console.error('[pre-build] ⚠️  Dossier API introuvable - les routes API ne fonctionneront pas !');
}

// Injecter la version dans le Service Worker
try {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const swPath = path.join(__dirname, '..', 'public', 'sw.js');
  
  if (fs.existsSync(packageJsonPath) && fs.existsSync(swPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version || '1.0.0';
    const swContent = fs.readFileSync(swPath, 'utf8');
    
    const updatedSwContent = swContent.replace(
      /const CACHE_VERSION = ['"][^'"]*['"];?/,
      `const CACHE_VERSION = '${version}';`
    );
    
    fs.writeFileSync(swPath, updatedSwContent, 'utf8');
  }
} catch (e) {
  console.error('[pre-build] Erreur injection version SW:', e.message);
}

// Générer un fichier build-info.js avec la date du dernier commit Git
try {
  let commitDate = null;
  try {
    commitDate = execSync('git log -1 --format=%cI', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (e) {
    // Silencieux si Git n'est pas disponible
  }

  const targetPath = path.join(__dirname, '..', 'src', 'build-info.js');
  const content =
    `// Fichier généré automatiquement par scripts/pre-build.js\n` +
    `// Date ISO du dernier commit Git déployé (ou null si inconnue)\n` +
    `export const buildCommitTimestamp = ${commitDate ? `'${commitDate}'` : 'null'};\n`;

  fs.writeFileSync(targetPath, content, 'utf8');
} catch (e) {
  console.error('[pre-build] Erreur génération build-info.js:', e.message);
}

