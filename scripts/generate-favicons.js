/*
 Generates raster favicons from public/favicon.svg.
 Outputs to public/favicon/ the following files:
 - android-chrome-512x512.png
 - android-chrome-192x192.png
 - apple-touch-icon.png (180x180)
 - favicon-48x48.png
 - favicon-32x32.png
 - favicon-16x16.png
 - favicon.ico (16,32,48)
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function generatePng(svgPath, outPath, size) {
  await sharp(svgPath, { density: 512 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function generateIco(pngBuffers, outPath) {
  let toIco;
  try {
    toIco = require("png-to-ico");
  } catch (e) {
    console.error("png-to-ico is not installed. Install it with: npm i -D png-to-ico");
    throw e;
  }
  const icoBuffer = await toIco(pngBuffers);
  await fs.promises.writeFile(outPath, icoBuffer);
}

async function main() {
  const publicDir = path.join(process.cwd(), "public");
  const svgPath = path.join(publicDir, "favicon.svg");
  const outDir = path.join(publicDir, "favicon");

  if (!fs.existsSync(svgPath)) {
    console.error("Missing source SVG at public/favicon.svg");
    process.exit(1);
  }

  await ensureDir(outDir);

  const outputs = [
    { name: "android-chrome-512x512.png", size: 512 },
    { name: "android-chrome-192x192.png", size: 192 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "favicon-48x48.png", size: 48 },
    { name: "favicon-32x32.png", size: 32 },
    { name: "favicon-16x16.png", size: 16 },
  ];

  for (const { name, size } of outputs) {
    const outPath = path.join(outDir, name);
    await generatePng(svgPath, outPath, size);
    console.log("Generated", name);
  }

  // Build ICO from 16/32/48
  const icoPngNames = ["favicon-16x16.png", "favicon-32x32.png", "favicon-48x48.png"]; 
  const icoBuffers = [];
  for (const n of icoPngNames) {
    const buf = await fs.promises.readFile(path.join(outDir, n));
    icoBuffers.push(buf);
  }
  const icoPath = path.join(outDir, "favicon.ico");
  await generateIco(icoBuffers, icoPath);
  console.log("Generated favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


