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

 Options:
   --background [color]      Add a background color (default: white if no color given)
   --white                   Force white background
   --black                   Force black background
   --rounded [percent]       Round the background corners (default: 20%)
                             Use 50 for a full circle. Example: --rounded 30

 Color formats accepted: named colors (red, blue...), hex (#ff0000), rgb(r,g,b)
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import toIco from "png-to-ico";

function parseArgs() {
  const args = process.argv.slice(2);

  // --black / --white shortcuts
  let background = null;
  if (args.includes("--black")) background = {r: 0, g: 0, b: 0, alpha: 1};
  else if (args.includes("--white")) background = {r: 255, g: 255, b: 255, alpha: 1};
  else {
    const bgIndex = args.indexOf("--background");
    if (bgIndex === -1) {
      background = {r: 0, g: 0, b: 0, alpha: 0};
    } else {
      const colorArg = args[bgIndex + 1];
      if (!colorArg || colorArg.startsWith("--")) {
        background = {r: 255, g: 255, b: 255, alpha: 1};
      } else {
        background = parseColor(colorArg);
      }
    }
  }

  // --rounded [percent]
  let rounded = null;
  const roundedIndex = args.indexOf("--rounded");
  if (roundedIndex !== -1) {
    const roundedArg = args[roundedIndex + 1];
    if (!roundedArg || roundedArg.startsWith("--")) {
      rounded = 20; // default favicon corner radius
    } else {
      const parsed = parseFloat(roundedArg);
      rounded = isNaN(parsed) ? 20 : Math.min(50, Math.max(0, parsed));
    }
  }

  return {background, rounded};
}

function parseColor(color) {
  const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    return {r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]), alpha: 1};
  }

  const hexMatch = color.match(/^#([0-9a-f]{3,6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      alpha: 1,
    };
  }

  const named = {
    white:  {r: 255, g: 255, b: 255},
    black:  {r: 0,   g: 0,   b: 0  },
    red:    {r: 255, g: 0,   b: 0  },
    green:  {r: 0,   g: 128, b: 0  },
    blue:   {r: 0,   g: 0,   b: 255},
    yellow: {r: 255, g: 255, b: 0  },
    gray:   {r: 128, g: 128, b: 128},
    grey:   {r: 128, g: 128, b: 128},
  };
  if (named[color.toLowerCase()]) {
    return {...named[color.toLowerCase()], alpha: 1};
  }

  console.warn(`Unknown color "${color}", falling back to white.`);
  return {r: 255, g: 255, b: 255, alpha: 1};
}

function buildRoundedMask(size, radiusPercent) {
  const r = Math.round((radiusPercent / 100) * size);
  // SVG mask: white rounded rect on black background
  const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="white"/>
        </svg>`;
  return Buffer.from(svg);
}

async function generatePng(svgPath, outPath, size, background, rounded) {
  const hasBackground = background.alpha === 1;
  const hasRounded = rounded !== null && hasBackground;

  if (!hasBackground) {
    // Fully transparent, no background at all
    await sharp(svgPath, {density: 512})
        .resize(size, size, {fit: "contain", background: {r: 0, g: 0, b: 0, alpha: 0}})
        .png({compressionLevel: 9})
        .toFile(outPath);
    return;
  }

  if (!hasRounded) {
    // Flat background, no rounding
    await sharp(svgPath, {density: 512})
        .resize(size, size, {fit: "contain", background})
        .flatten({background})
        .png({compressionLevel: 9})
        .toFile(outPath);
    return;
  }

  // Step 1 – render favicon icon on transparent canvas
  const iconBuffer = await sharp(svgPath, {density: 512})
      .resize(size, size, {fit: "contain", background: {r: 0, g: 0, b: 0, alpha: 0}})
      .png()
      .toBuffer();

  // Step 2 – create flat background square
  const bgBuffer = await sharp({
    create: {width: size, height: size, channels: 4, background},
  })
      .png()
      .toBuffer();

  // Step 3 – composite icon on top of background
  const composited = await sharp(bgBuffer)
      .composite([{input: iconBuffer, blend: "over"}])
      .png()
      .toBuffer();

  // Step 4 – build rounded SVG mask and apply it
  const maskSvg = buildRoundedMask(size, rounded);
  const maskBuffer = await sharp(maskSvg)
      .resize(size, size)
      .png()
      .toBuffer();

  // Step 5 – use the mask as alpha channel
  await sharp(composited)
      .composite([{input: maskBuffer, blend: "dest-in"}])
      .png({compressionLevel: 9})
      .toFile(outPath);
}

async function generateIco(pngBuffers, outPath) {
  const icoBuffer = await toIco(pngBuffers);
  await fs.promises.writeFile(outPath, icoBuffer);
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, {recursive: true});
}

async function main() {
  const {background, rounded} = parseArgs();

  const bgDesc = background.alpha === 0
      ? "transparent"
      : `rgb(${background.r}, ${background.g}, ${background.b})`;
  const roundedDesc = rounded !== null ? `${rounded}%` : "none";
  console.log(`Background : ${bgDesc}`);
  console.log(`Rounded    : ${roundedDesc}`);

  const publicDir = path.join(process.cwd(), "public");
  const svgPath   = path.join(publicDir, "favicon.svg");
  const outDir    = path.join(publicDir, "favicon");

  if (!fs.existsSync(svgPath)) {
    console.error("Missing source SVG at public/favicon.svg");
    process.exit(1);
  }

  await ensureDir(outDir);

  const outputs = [
    {name: "android-chrome-512x512.png", size: 512},
    {name: "android-chrome-192x192.png", size: 192},
    {name: "apple-touch-icon.png",        size: 180},
    {name: "favicon-48x48.png",           size: 48 },
    {name: "favicon-32x32.png",           size: 32 },
    {name: "favicon-16x16.png",           size: 16 },
  ];

  for (const {name, size} of outputs) {
    const outPath = path.join(outDir, name);
    await generatePng(svgPath, outPath, size, background, rounded);
    console.log("Generated", name);
  }

  const icoPngNames = ["favicon-16x16.png", "favicon-32x32.png", "favicon-48x48.png"];
  const icoBuffers  = [];
  for (const n of icoPngNames) {
    icoBuffers.push(await fs.promises.readFile(path.join(outDir, n)));
  }

  await generateIco(icoBuffers, path.join(outDir, "favicon.ico"));
  console.log("Generated favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});