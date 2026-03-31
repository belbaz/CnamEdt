const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification des routes API...\n');

const apiDir = path.join(__dirname, '../src/app/api');

if (!fs.existsSync(apiDir)) {
  console.error('❌ ERREUR: Le dossier src/app/api n\'existe pas !');
  process.exit(1);
}

console.log('✓ Dossier API trouvé:', apiDir);

// Vérifier les routes API
const routes = [
  { path: 'fetch-ics/route.js', name: '/api/fetch-ics' }
];

let allValid = true;

for (const route of routes) {
  const routePath = path.join(apiDir, route.path);
  if (fs.existsSync(routePath)) {
    const content = fs.readFileSync(routePath, 'utf8');
    const hasGet = /export\s+async\s+function\s+GET/.test(content);
    const hasDynamic = /export\s+const\s+dynamic/.test(content);
    const hasRuntime = /export\s+const\s+runtime/.test(content);
    
    console.log(`\n✓ ${route.name}:`);
    console.log(`  - Fichier trouvé: ${routePath}`);
    console.log(`  - Fonction GET: ${hasGet ? '✓' : '❌'}`);
    console.log(`  - Dynamic export: ${hasDynamic ? '✓' : '⚠️'}`);
    console.log(`  - Runtime export: ${hasRuntime ? '✓' : '⚠️'}`);
    
    if (!hasGet) {
      console.error(`  ❌ ERREUR: Fonction GET manquante !`);
      allValid = false;
    }
  } else {
    console.error(`\n❌ ERREUR: Route ${route.name} introuvable: ${routePath}`);
    allValid = false;
  }
}

// Vérifier next.config.js
const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  const content = fs.readFileSync(nextConfigPath, 'utf8');
  // Vérifier que output: 'export' existe réellement (pas dans un commentaire)
  // On cherche une ligne qui contient output: suivi de 'export' ou "export", pas précédé de //
  const lines = content.split('\n');
  let hasExport = false;
  for (const line of lines) {
    const trimmed = line.trim();
    // Ignorer les commentaires
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    // Chercher output: 'export' ou output: "export"
    if (/output\s*:\s*['"]export['"]/i.test(trimmed)) {
      hasExport = true;
      break;
    }
  }
  
  console.log('\n📋 Configuration Next.js:');
  console.log(`  - next.config.js: ✓`);
  console.log(`  - Mode export statique: ${hasExport ? '❌ (Désactive les API routes!)' : '✓ (Mode web normal)'}`);
  
  if (hasExport) {
    console.error('\n❌ ERREUR: next.config.js est en mode export statique !');
    console.error('   Les routes API ne fonctionneront pas avec output: export');
    console.error('\n   Tentative de correction automatique...');
    
    // Essayer de corriger automatiquement
    const webConfigPath = path.join(__dirname, '..', 'next.config.web.js');
    if (fs.existsSync(webConfigPath)) {
      try {
        fs.copyFileSync(webConfigPath, nextConfigPath);
        console.log('   ✓ Configuration web copiée');
        
        // Vérifier à nouveau
        const newContent = fs.readFileSync(nextConfigPath, 'utf8');
        const newLines = newContent.split('\n');
        let stillHasExport = false;
        for (const line of newLines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
          if (/output\s*:\s*['"]export['"]/i.test(trimmed)) {
            stillHasExport = true;
            break;
          }
        }
        
        if (stillHasExport) {
          console.error('   ❌ La correction a échoué, le fichier contient toujours output: export');
          console.error('\n   Contenu du fichier:');
          console.error(newContent.substring(0, 500));
          allValid = false;
        } else {
          console.log('   ✓ Configuration corrigée avec succès !');
          // Ne pas échouer si on a corrigé
        }
      } catch (e) {
        console.error(`   ❌ Erreur lors de la correction: ${e.message}`);
        allValid = false;
      }
    } else {
      console.error('   ❌ next.config.web.js introuvable, impossible de corriger');
      allValid = false;
    }
  }
} else {
  console.error('\n❌ ERREUR: next.config.js introuvable !');
  allValid = false;
}

console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('✅ Toutes les routes API sont correctement configurées !');
  process.exit(0);
} else {
  console.error('❌ Des erreurs ont été détectées dans les routes API !');
  process.exit(1);
}

