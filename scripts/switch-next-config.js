const fs = require('fs');
const path = require('path');

// Usage:
//   node scripts/switch-next-config.js web
//   node scripts/switch-next-config.js mobile

const modeArg = (process.argv[2] || '').toLowerCase();
const buildMode = modeArg || (process.env.BUILD_MODE || '').toLowerCase();

if (!buildMode || !['web', 'mobile'].includes(buildMode)) {
  console.error('Please specify build mode: web | mobile');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const target = path.join(ROOT, 'next.config.js');

const source = buildMode === 'mobile'
  ? path.join(ROOT, 'mobile-config', 'next.config.mobile.js')
  : path.join(ROOT, 'next.config.web.js');

if (!fs.existsSync(source)) {
  console.error(`Config source not found: ${source}`);
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log(`✓ next.config.js switched to ${buildMode} mode -> ${path.relative(ROOT, source)}`);


