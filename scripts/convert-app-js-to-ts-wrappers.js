/**
 * Génère automatiquement des wrappers TypeScript autour des fichiers Next.js encore en JS.
 *
 * - `src/app/.../page.js`      -> `src/app/.../page.tsx`
 * - `src/app/.../layout.js`    -> `src/app/.../layout.tsx`
 * - `src/app/api/.../route.js` -> `src/app/api/.../route.ts`
 *
 * Le but est de permettre au projet de "migrer" sans réécrire toute la logique immédiatement.
 * Les wrappers sont marqués avec `// @ts-nocheck` pour éviter les erreurs de types transitoires.
 */
const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const appRoot = path.join(projectRoot, "src", "app");

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

function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

function makeTsxWrapperDefaultExport(relJsPath) {
  // Relatif depuis le wrapper.
  return `// @ts-nocheck
export * from "${relJsPath}";
export { default } from "${relJsPath}";
`;
}

function makeTsWrapperNamedExports(relJsPath) {
  // Relatif depuis le wrapper.
  return `// @ts-nocheck
export * from "${relJsPath}";
`;
}

let created = 0;

walk(appRoot, (fullPath) => {
  const relFromApp = path.relative(appRoot, fullPath).split(path.sep).join("/");

  if (!relFromApp.endsWith(".js")) return;
  if (relFromApp.includes("node_modules/")) return;

  if (relFromApp.endsWith("/page.js")) {
    const target = fullPath.replace(/page\.js$/, "page.tsx");
    const relJs = "./page.js";
    if (ensureFile(target, makeTsxWrapperDefaultExport(relJs))) created += 1;
    return;
  }

  if (relFromApp.endsWith("/layout.js")) {
    const target = fullPath.replace(/layout\.js$/, "layout.tsx");
    const relJs = "./layout.js";
    if (ensureFile(target, makeTsxWrapperDefaultExport(relJs))) created += 1;
    return;
  }

  if (relFromApp.includes("/api/") && relFromApp.endsWith("/route.js")) {
    const target = fullPath.replace(/route\.js$/, "route.ts");
    const relJs = "./route.js";
    if (ensureFile(target, makeTsWrapperNamedExports(relJs))) created += 1;
    return;
  }
});

console.log(`[convert-app-js-to-ts-wrappers] Fichiers TS générés: ${created}`);

