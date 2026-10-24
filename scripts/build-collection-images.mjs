// Builds the collection plate images (2048 x 2048 SVG).
//
//   node scripts/build-collection-images.mjs            all collections, chosen variant
//   node scripts/build-collection-images.mjs --variant=a
//   node scripts/build-collection-images.mjs --only=jewelry --all-variants
//
// Type is converted to outlines from logos/hecca-glyphs.mjs, so the files need
// no fonts installed. Rasterise with sharp before uploading to Shopify.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DISPLAY, BODY } from "../logos/hecca-glyphs.mjs";
import { MONOGRAM } from "../logos/hecca-paths.mjs";
import { TAXONOMY } from "../hecca-shop/data/taxonomy.mjs";

const S = 2048; // canvas
const CX = S / 2;
const PAD = 112; // hairline frame inset

const C = {
  black: "#0F0F0F",
  gold: "#D4A64A",
  goldHi: "#EFD49A",
  white: "#F7F7F7",
  plum: "#5C2D5C",
  emerald: "#1F5F4A",
};

// Each top-level collection gets a curated label; its children inherit the same
// field colour and carry the parent's name as their label, so the grid reads as
// families. Children come straight from the taxonomy — adding a subcollection
// there is enough for a plate to appear here.
const FIELD = {
  jewelry: "plum",
  apparel: "emerald",
  accessories: "plum",
  "home-decor": "emerald",
  beauty: "plum",
  vintage: "gold",
};

const PARENTS = [
  { handle: "jewelry", name: "Jewelry", label: "RINGS · NECKLACES · EARRINGS · BRACELETS", field: "plum" },
  { handle: "apparel", name: "Apparel", label: "SHIRTS · DRESSES · OUTERWEAR · SHOES", field: "emerald" },
  { handle: "accessories", name: "Accessories", label: "BAGS · BELTS · HATS · HAIR", field: "plum" },
  { handle: "home-decor", name: "Home Decor", label: "BEDDING · MATS & RUGS", field: "emerald" },
  { handle: "vintage", name: "Vintage", label: "ONE OF ONE · ARCHIVE", field: "gold" },
  { handle: "beauty", name: "Beauty", label: "SKINCARE · MAKEUP · TOOLS", field: "plum" },
  { handle: "hecca-femme", name: "Hecca Femme", label: "SATIN · LACE · FLORAL", field: "plum" },
  { handle: "hecca-homme", name: "Hecca Homme", label: "TAILORING · HARDWARE", field: "emerald" },
  { handle: "hecca-wild", name: "Hecca Wild", label: "LEOPARD · ZEBRA · PYTHON", field: "gold" },
  { handle: "hecca-aura", name: "Hecca Aura", label: "IRIDESCENT · SHEER", field: "emerald" },
];

const CHILDREN = [
  ...TAXONOMY.categories.flatMap((cat) =>
    cat.children.map((sub) => ({
      handle: sub.handle,
      name: sub.name,
      label: cat.name.toUpperCase(),
      field: FIELD[cat.handle],
    })),
  ),
  ...TAXONOMY.vintage.children.map((sub) => ({
    handle: sub.handle,
    name: sub.name,
    label: "ONE OF ONE",
    field: "gold",
  })),
];

const COLLECTIONS = [...PARENTS, ...CHILDREN];

/** Every handle the taxonomy defines — used to prove no plate is missing. */
const TAXONOMY_HANDLES = [
  ...TAXONOMY.categories.map((c) => c.handle),
  ...TAXONOMY.categories.flatMap((c) => c.children.map((s) => s.handle)),
  TAXONOMY.vintage.handle,
  ...TAXONOMY.vintage.children.map((s) => s.handle),
  ...TAXONOMY.brandLines.map((l) => l.handle),
];

const FIELD_HEX = { plum: C.plum, emerald: C.emerald, gold: C.gold };

/* ---------- text as outlines ---------- */

function measure(text, font, size, trackEm) {
  const s = size / font.unitsPerEm;
  const track = trackEm * size;
  let w = 0;
  for (const ch of text) w += (font.glyphs[ch]?.advance ?? 0) * s + track;
  return { width: w - track, track, scale: s };
}

function place(text, font, size, trackEm, cx, baseline, fill) {
  const { width, track, scale } = measure(text, font, size, trackEm);
  let x = cx - width / 2;
  let out = "";
  for (const ch of text) {
    const g = font.glyphs[ch];
    if (!g) { x += track; continue; }
    if (ch !== " ") {
      out += `<path d="${g.d}" fill="${fill}" transform="translate(${x.toFixed(1)} ${baseline.toFixed(1)}) scale(${scale.toFixed(4)})"/>`;
    }
    x += g.advance * scale + track;
  }
  return out;
}

function fitSize(text, font, trackEm, maxWidth, start) {
  let size = start;
  while (measure(text, font, size, trackEm).width > maxWidth && size > 24) size -= 2;
  return size;
}

/* ---------- pieces ---------- */

function frame() {
  return `<rect x="${PAD}" y="${PAD}" width="${S - PAD * 2}" height="${S - PAD * 2}" fill="none" stroke="${C.gold}" stroke-width="2" opacity="0.22"/>`;
}

function bloom(hex, alpha = 0.3) {
  return `<defs><radialGradient id="b" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="${hex}" stop-opacity="${alpha}"/>
      <stop offset="55%" stop-color="${hex}" stop-opacity="${(alpha / 3).toFixed(2)}"/>
      <stop offset="100%" stop-color="${hex}" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="${S}" height="${S}" fill="url(#b)"/>`;
}

function crest(cx, cy, d, color) {
  const r = d / 2;
  const cap = d * 0.4;
  const hs = cap / 125; // MONOGRAM is drawn at cap 125
  const hx = cx - (MONOGRAM.bbox.width * hs) / 2 - MONOGRAM.bbox.minX * hs;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${(d * 0.014).toFixed(2)}"/>
  <circle cx="${cx}" cy="${cy}" r="${(r * 0.88).toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(d * 0.007).toFixed(2)}" opacity="0.45"/>
  <g transform="translate(${hx.toFixed(1)} ${(cy + cap / 2).toFixed(1)}) scale(${hs.toFixed(4)})"><path d="${MONOGRAM.d}" fill="${color}"/></g>`;
}

function rule(y) {
  return `<rect x="${CX - 150}" y="${y}" width="300" height="1.5" fill="${C.gold}" opacity="0.4"/>`;
}

/* ---------- variants ---------- */

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function plate(collection, variant) {
  const field = FIELD_HEX[collection.field];
  const name = collection.name.toUpperCase();
  const isField = variant === "c";

  const body = [];
  if (isField) {
    body.push(`<rect width="${S}" height="${S}" fill="${field}"/>`);
  } else {
    body.push(`<rect width="${S}" height="${S}" fill="${C.black}"/>`);
    // gold reads brighter than plum/emerald at the same alpha
    if (variant === "b") body.push(bloom(field, collection.field === "gold" ? 0.16 : 0.3));
  }
  body.push(frame());

  const withCrest = variant !== "a";
  const blockH = withCrest ? 560 : 300;
  const top = (S - blockH) / 2 - 40;

  if (withCrest) body.push(crest(CX, top + 112, 224, C.gold));

  const nameSize = fitSize(name, DISPLAY, 0.14, 1560, 168);
  const nameBaseline = top + blockH - 96;
  body.push(place(name, DISPLAY, nameSize, 0.14, CX, nameBaseline, C.gold));

  body.push(rule(nameBaseline + 46));

  const labelSize = fitSize(collection.label, BODY, 0.36, 1300, 34);
  body.push(place(collection.label, BODY, labelSize, 0.36, CX, nameBaseline + 118, C.white));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="${esc(collection.name)} collection">
${body.join("\n")}
</svg>
`;
}

/* ---------- cli ---------- */

const args = process.argv.slice(2);
const opt = (k, d) => {
  const hit = args.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split("=")[1] : d;
};
const variant = opt("variant", "b");
const only = opt("only", null);
const allVariants = args.includes("--all-variants");

const outDir = only ? "hecca-shop/assets/collections/_preview" : "hecca-shop/assets/collections";
mkdirSync(outDir, { recursive: true });

const list = only ? COLLECTIONS.filter((c) => c.handle === only) : COLLECTIONS;
if (!list.length) throw new Error(`unknown handle: ${only}`);

// Guard against the "some are still missing" case: the plate list must cover
// every handle in the taxonomy exactly once.
const built = new Set(COLLECTIONS.map((c) => c.handle));
const missing = TAXONOMY_HANDLES.filter((h) => !built.has(h));
const extra = [...built].filter((h) => !TAXONOMY_HANDLES.includes(h));
if (missing.length || extra.length) {
  if (missing.length) console.log(`⚠ no plate for: ${missing.join(", ")}`);
  if (extra.length) console.log(`⚠ plate but not in taxonomy: ${extra.join(", ")}`);
}

const variants = allVariants ? ["a", "b", "c"] : [variant];
let n = 0;
for (const c of list) {
  for (const v of variants) {
    const file = join(outDir, allVariants ? `${c.handle}-${v}.svg` : `${c.handle}.svg`);
    writeFileSync(file, plate(c, v), "utf8");
    n++;
  }
}
console.log(`wrote ${n} file(s) to ${outDir}`);
