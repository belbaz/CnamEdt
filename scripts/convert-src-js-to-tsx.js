/**
 * Convertit automatiquement tous les fichiers `src/.../fichier.js` en `src/.../fichier.tsx`.
 * - Ajoute `// @ts-nocheck` pour éviter les erreurs de typage lors de la migration massive.
 * - Supprime le fichier `.js` après écriture du `.tsx`.
 *
 * IMPORTANT: conversion uniquement dans `src/` (pas dans `scripts/`, pas dans `public/`).
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
    } else if (entry.isFile()) {
      onFile(fullPath);
    }
  }
}

function convertFile(jsPath) {
  if (!jsPath.endsWith(".js")) return false;

  const tsxPath = jsPath.slice(0, -3) + ".tsx";
  // Si jamais la cible existe déjà, on évite de l'écraser (migration déjà faite quelque part)
  if (fs.existsSync(tsxPath)) return false;

  const jsContent = fs.readFileSync(jsPath, "utf8");
  const tsxContent = `// @ts-nocheck\n${jsContent}\n`;
  fs.mkdirSync(path.dirname(tsxPath), { recursive: true });
  fs.writeFileSync(tsxPath, tsxContent, "utf8");
  fs.unlinkSync(jsPath);
  return true;
}

let converted = 0;
let skipped = 0;

walk(srcRoot, (fullPath) => {
  if (!fullPath.endsWith(".js")) return;
  const ok = convertFile(fullPath);
  if (ok) converted += 1;
  else skipped += 1;
});

console.log(`[convert-src-js-to-tsx] converted=${converted}, skipped=${skipped}`);

