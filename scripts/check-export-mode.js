const fs = require('fs');
const path = require('path');

const nextConfigPath = path.join(__dirname, '..', 'next.config.js');

if (!fs.existsSync(nextConfigPath)) {
  console.error('next.config.js introuvable');
  process.exit(1);
}

const content = fs.readFileSync(nextConfigPath, 'utf8');
const lines = content.split('\n');

// Chercher output: 'export' en ignorant les commentaires
let hasExport = false;
for (const line of lines) {
  const trimmed = line.trim();
  // Ignorer les commentaires (// et /* */)
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed === '') continue;
  // Chercher output: 'export' ou output: "export"
  if (/output\s*:\s*['"]export['"]/i.test(trimmed)) {
    hasExport = true;
    break;
  }
}

// Exit code 1 si export trouvé, 0 sinon
process.exit(hasExport ? 1 : 0);

