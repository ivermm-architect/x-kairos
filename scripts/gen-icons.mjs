// One-off brand-icon generator.
//
// Source of truth is the raster monogram (no vector original exists). We trace
// it to a clean SVG, snap the colors to brand tokens, then rasterize crisp
// PNG app icons. Run with the trace/raster deps installed transiently:
//
//   npm i --no-save sharp imagetracerjs
//   node scripts/gen-icons.mjs
//
// Deps are NOT in package.json on purpose — this is a design-time tool.

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const ImageTracer = require("imagetracerjs");

const SRC = "assets/brand-src/logo-kairos-mark.png";
const SRC_FULL = "assets/brand-src/logo-kairos.png";
const OUT = "public/brand";
const TRACE_RES = 1024;

// Brand targets the trace colors snap to.
const PINK = { r: 240, g: 37, b: 140, hex: "#f0258c" }; // K
const PEACH = { r: 255, g: 159, b: 125, hex: "#ff9f7d" }; // R (coral-400)
const GREEN = { hex: "#6fd98a" }; // "Kairos" script (mint-300)

// The source art is pastel/low-contrast, so distance to the saturated brand
// targets is unreliable. Separate the elements by HUE instead:
//   green  — the "Kairos" script (G is the dominant channel)
//   pink   — the K (warm, but leans blue: B > G)
//   peach  — the R / "Importadora" (warm: G >= B)
// Drop the low-saturation light outline (the "ugly border") and transparency.
function classify(r, g, b, a) {
  if (a < 128) return null; // transparent
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx - mn < 22) return null; // gray/white outline
  if (g >= r && g >= b) return "green"; // script wordmark
  return b > g ? "pink" : "peach"; // warm letters
}

// Build a 2-tone imagedata (opaque magenta where `which`, transparent else).
function maskImageData(raw, w, h, which) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const r = raw[i * 4],
      g = raw[i * 4 + 1],
      b = raw[i * 4 + 2],
      a = raw[i * 4 + 3];
    if (classify(r, g, b, a) === which) {
      out[i * 4] = 255;
      out[i * 4 + 1] = 0;
      out[i * 4 + 2] = 255;
      out[i * 4 + 3] = 255;
    }
  }
  return { width: w, height: h, data: out };
}

const TRACE_OPTS = {
  numberofcolors: 2,
  colorsampling: 0,
  pathomit: 6,
  ltres: 0.4,
  qtres: 0.4,
  blurradius: 2,
  blurdelta: 20,
  strokewidth: 0,
  linefilter: true,
  roundcoords: 2,
  viewbox: true,
};

// Smoother fit for fine art (the cursive "Kairos" script): longer spline
// segments and more noise omission so edges read crisp, not jagged.
const TRACE_OPTS_SMOOTH = {
  ...TRACE_OPTS,
  pathomit: 12,
  ltres: 2,
  qtres: 2,
  blurradius: 8,
  blurdelta: 48,
  linefilter: true,
  roundcoords: 1,
};

// Pull just the opaque (magenta) path d-strings out of a traced SVG.
function extractPaths(svg) {
  const paths = [];
  const re = /<path[^>]*fill="rgb\((\d+),(\d+),(\d+)\)"[^>]*\sd="([^"]+)"/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, r, g, b, d] = m;
    // keep the magenta shape, drop the (near-black) background layer
    if (Number(r) > 150 && Number(b) > 150 && Number(g) < 120) paths.push(d);
  }
  return paths;
}

async function tracePaths(raw, w, h, which, fill, opts = TRACE_OPTS) {
  const svg = ImageTracer.imagedataToSVG(maskImageData(raw, w, h, which), opts);
  const ds = extractPaths(svg);
  return ds.map((d) => `<path d="${d}" fill="${fill}"/>`).join("\n");
}

async function main() {
  const { data, info } = await sharp(SRC)
    .resize(TRACE_RES, TRACE_RES, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width,
    h = info.height;
  const pinkPaths = await tracePaths(data, w, h, "pink", PINK.hex);
  const peachPaths = await tracePaths(data, w, h, "peach", PEACH.hex);

  // Peach sits behind the pink (the R is the back layer in the logo).
  const markInner = `${peachPaths}\n${pinkPaths}`;
  const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="none">\n${markInner}\n</svg>\n`;
  fs.writeFileSync(path.join(OUT, "logo-mark.svg"), markSvg);
  console.log("wrote logo-mark.svg");

  // Icon master: full-bleed cold-ink gradient + centered mark (maskable-safe).
  function iconSvg(size) {
    const scale = (size * 0.56) / w;
    const tx = (size - w * scale) / 2;
    const ty = (size - h * scale) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#171b26"/>
      <stop offset="1" stop-color="#0b0f16"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(${tx},${ty}) scale(${scale})">${markInner}</g>
</svg>`;
  }

  const targets = [
    ["icon-512.png", 512],
    ["icon-192.png", 192],
    ["apple-touch-icon.png", 180],
  ];
  for (const [name, size] of targets) {
    await sharp(Buffer.from(iconSvg(size)))
      .png()
      .toFile(path.join(OUT, name));
    console.log("wrote", name);
  }

  fs.writeFileSync(path.join(OUT, "icon.svg"), iconSvg(512));
  console.log("wrote icon.svg");

  // Full logotype (monogram + "Kairos" script + "Importadora"), kept as-is.
  const full = await sharp(SRC_FULL)
    .resize({ width: 2048, kernel: "lanczos3" })
    .blur(1.2) // soften lanczos ringing so the hard mask threshold reads clean
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const fw = full.info.width,
    fh = full.info.height;
  const O = TRACE_OPTS_SMOOTH;
  const fGreen = await tracePaths(full.data, fw, fh, "green", GREEN.hex, O);
  const fPeach = await tracePaths(full.data, fw, fh, "peach", PEACH.hex, O);
  const fPink = await tracePaths(full.data, fw, fh, "pink", PINK.hex, O);
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fw} ${fh}" fill="none">
${fGreen}
${fPeach}
${fPink}
</svg>
`;
  fs.writeFileSync(path.join(OUT, "logo-full.svg"), fullSvg);
  console.log("wrote logo-full.svg");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
