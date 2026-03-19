/**
 * Remplace des wrappers TS/TSX qui ré-exportent des fichiers JS par le contenu JS directement,
 * puis supprime le fichier JS référencé.
 *
 * Objectif: "pas importer des fichiers js depuis un fichier tsx".
 *
 * Règle: on ne traite que les fichiers TS/TSX dont le contenu ne contient que des export(s) vers "./*.js".
 */
const fs = require("fs");
const path = require("path");

const srcRoot = path.join(process.cwd(), "src");

function walk(dir, onFile) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, onFile);
      continue;
    }
    if (entry.isFile()) onFile(fullPath);
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function isTsLike(filePath) {
  return filePath.endsWith(".ts") || filePath.endsWith(".tsx");
}

function isInlineCandidate(filePath, content) {
  // Contenu court + export vers un seul module JS relatif
  if (content.length > 400) return false;
  if (!/\.\/[^"']+\.js/.test(content)) return false;

  // Autoriser seulement export * from "./x.js" / export { default } from "./x.js" / export { ... } from "./x.js"
  // + éventuel commentaire ts-nocheck / directives.
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return false;

  const okLine = (l) => {
    if (l.startsWith("//")) return true; // commentaires: @ts-nocheck, etc.
    const m1 = l.match(/^export\s+\*\s+from\s+["']\.\/[^"']+\.js["'];?$/);
    if (m1) return true;
    const m2 = l.match(/^export\s+\{[^}]+\}\s+from\s+["']\.\/[^"']+\.js["'];?$/);
    if (m2) return true;
    return false;
  };

  return lines.every(okLine);
}

function findReferencedJsFiles(wrapperDir, content) {
  // Cherche tous les "./xxx.js" dans exports
  const matches = [...content.matchAll(/["']\.\/([^"']+\.js)["']/g)];
  const relJs = matches.map((m) => m[1]);
  // Dédup
  return [...new Set(relJs)];
}

let inlined = 0;
let deleted = 0;
let skipped = 0;

walk(srcRoot, (fullPath) => {
  if (!isTsLike(fullPath)) return;
  const content = read(fullPath);
  if (!isInlineCandidate(fullPath, content)) {
    skipped += 1;
    return;
  }

  const wrapperDir = path.dirname(fullPath);
  const referencedJsFiles = findReferencedJsFiles(wrapperDir, content);

  if (referencedJsFiles.length !== 1) {
    // On est strict: wrapper de 1 module js
    skipped += 1;
    return;
  }

  const jsFilePath = path.join(wrapperDir, referencedJsFiles[0]);
  if (!fs.existsSync(jsFilePath)) {
    skipped += 1;
    return;
  }

  const jsContent = read(jsFilePath);
  // On supprime les imports types et ré-export wrappers: on remplace par le contenu JS.
  const newContent = `// @ts-nocheck\n${jsContent}\n`;
  fs.writeFileSync(fullPath, newContent, "utf8");
  inlined += 1;

  fs.unlinkSync(jsFilePath);
  deleted += 1;
});

console.log(
  `[inline-js-from-ts-wrappers] inlined=${inlined}, deletedJs=${deleted}, skipped=${skipped}`,
);

