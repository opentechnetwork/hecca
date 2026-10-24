// Builds the HECCA logo files from the outlined type in logos/hecca-paths.mjs.
// No dependencies. Run: node scripts/build-logos.mjs
//
// Output: logos/*.svg
//   wordmark   HECCA only        (header, receipts, embroidery)
//   lockup     crest + HECCA     (horizontal and stacked)
//   monogram   crest only        (favicon, app icon, hardware)
// Each file is framed with enough margin to contain its own glow.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FONT, MONOGRAM, TAGLINE, TAGLINE_FONT, WORDMARK } from "../logos/hecca-paths.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "logos");

const C = {
  gold: "#D4A64A",
  black: "#0F0F0F",
  white: "#F7F7F7",
  plum: "#5C2D5C",
  emerald: "#1F5F4A",
};

// Halo recipes. `dx` shifts a glow sideways to build a two-tone bloom.
const GLOWS = {
  plum: [
    { color: C.plum, blur: 30, opacity: 0.95 },
    { color: C.gold, blur: 8, opacity: 0.75 },
  ],
  emerald: [
    { color: C.emerald, blur: 30, opacity: 0.95 },
    { color: C.gold, blur: 8, opacity: 0.75 },
  ],
  dual: [
    { color: C.plum, blur: 28, opacity: 0.9, dx: -18 },
    { color: C.emerald, blur: 28, opacity: 0.9, dx: 18 },
    { color: C.white, blur: 6, opacity: 0.5 },
  ],
  gold: [
    { color: C.gold, blur: 26, opacity: 0.55 },
    { color: C.gold, blur: 7, opacity: 0.6 },
  ],
  none: [],
};

const EM = FONT.sourceSize; // 200
const CAP = (FONT.capHeight / FONT.unitsPerEm) * EM; // 125
const TAG_CAP = (TAGLINE_FONT.capHeight / TAGLINE_FONT.unitsPerEm) * TAGLINE_FONT.sourceSize; // 140
const f = (v) => Number(v.toFixed(2));

/* ---------- glow ---------- */

function filterDefs(glows, prefix) {
  return glows
    .map(
      (g, i) => `<filter id="${prefix}-${i}" x="-60%" y="-140%" width="220%" height="380%">
      <feGaussianBlur stdDeviation="${g.blur}"/>
    </filter>`
    )
    .join("\n    ");
}

function glowLayers(d, glows, prefix) {
  if (!glows.length) return "";
  return (
    glows
      .map((g, i) => {
        const t = g.dx ? ` transform="translate(${g.dx} 0)"` : "";
        return `<path d="${d}" fill="${g.color}" opacity="${g.opacity}" filter="url(#${prefix}-${i})"${t}/>`;
      })
      .join("\n    ") + "\n    "
  );
}

/* ---------- placement ---------- */

/** Frame: union of placed boxes plus glow padding. */
function frame(boxes, pad) {
  const left = Math.min(...boxes.map((b) => b.left)) - pad;
  const right = Math.max(...boxes.map((b) => b.right)) + pad;
  const top = Math.min(...boxes.map((b) => b.top)) - pad;
  const bottom = Math.max(...boxes.map((b) => b.bottom)) + pad;
  return {
    viewBox: `${f(left)} ${f(top)} ${f(right - left)} ${f(bottom - top)}`,
    width: right - left,
    height: bottom - top,
  };
}

/** Place the wordmark: left edge at x, cap-height centre at cy. */
function placeWordmark(x, cy, scale, fill, glows, prefix) {
  const baseline = cy + (CAP * scale) / 2;
  const right = x + WORDMARK.advanceWidth * scale;
  return {
    markup: `<g transform="translate(${f(x)} ${f(baseline)}) scale(${f(scale)})">
    ${glowLayers(WORDMARK.d, glows, prefix)}<path d="${WORDMARK.d}" fill="${fill}"/></g>`,
    box: {
      left: x,
      right,
      top: baseline + WORDMARK.bbox.minY * scale,
      bottom: baseline + WORDMARK.bbox.maxY * scale,
    },
  };
}

/** Tagline: left edge at x, cap-height centre at cy, scaled to a target width. */
function placeTagline(x, cy, targetWidth, fill) {
  const scale = targetWidth / TAGLINE.advanceWidth;
  const cap = TAG_CAP * scale;
  const baseline = cy + cap / 2;
  return {
    markup: `<g transform="translate(${f(x)} ${f(baseline)}) scale(${f(scale)})">
    <path d="${TAGLINE.d}" fill="${fill}"/></g>`,
    box: {
      left: x,
      right: x + targetWidth,
      top: baseline - cap,
      bottom: baseline,
    },
  };
}

/** Crest: ring + monogram H, centred on (cx, cy) with radius r. */
function placeCrest(cx, cy, r, opts = {}) {
  const { color = C.gold, ring = 3, inner = 1.5, hScale = 0.7, glow = true } = opts;
  const cap = CAP * hScale;
  const hx = cx - (MONOGRAM.bbox.width * hScale) / 2 - MONOGRAM.bbox.minX * hScale;
  const baseline = cy + cap / 2;
  const halos = glow
    ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${f(ring * 3)}" opacity="0.3" filter="url(#crestGlow)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${f(ring * 1.7)}" opacity="0.4" filter="url(#crestGlowSm)"/>`
    : "";
  return {
    defs: glow
      ? `<filter id="crestGlow" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="${f(r * 0.22)}"/>
    </filter>
    <filter id="crestGlowSm" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="${f(r * 0.06)}"/>
    </filter>`
      : "",
    markup: `${halos}
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${ring}"/>
  <circle cx="${cx}" cy="${cy}" r="${f(r * 0.88)}" fill="none" stroke="${color}" stroke-width="${inner}" opacity="0.45"/>
  <g transform="translate(${f(hx)} ${f(baseline)}) scale(${f(hScale)})">
    <path d="${MONOGRAM.d}" fill="${color}"/>
  </g>`,
    box: { left: cx - r, right: cx + r, top: cy - r, bottom: cy + r },
  };
}

/* ---------- assembly ---------- */

function svg({ box, defs = "", body, label = "HECCA" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.viewBox}" width="${f(box.width)}" height="${f(box.height)}" role="img" aria-labelledby="t">
  <title id="t">${label}</title>
  <defs>
    ${defs}
  </defs>
  ${body}
</svg>
`;
}

/* ---------- builds ---------- */

function buildWordmark(glowName, fill, pad = 64) {
  const glows = GLOWS[glowName];
  const wm = placeWordmark(0, 0, 1, fill, glows, "wm");
  return svg({
    box: frame([wm.box], pad),
    defs: filterDefs(glows, "wm"),
    body: `  ${wm.markup}`,
    label: "HECCA wordmark",
  });
}

function buildHorizontal(glowName, fill, pad = 56) {
  const glows = GLOWS[glowName];
  const r = 72;
  const gap = 34;
  const c = placeCrest(r, r, r, { color: fill, glow: glowName !== "none" });
  const wm = placeWordmark(r * 2 + gap, r, 0.86, fill, glows, "wm");
  return svg({
    box: frame([c.box, wm.box], pad),
    defs: `${filterDefs(glows, "wm")}\n    ${c.defs}`,
    body: `  ${c.markup}\n  ${wm.markup}`,
    label: "HECCA horizontal lockup",
  });
}

function buildHorizontalTagline(glowName, fill, pad = 56) {
  const glows = GLOWS[glowName];
  const r = 72;
  const gap = 34;
  const wmScale = 0.86;
  const wmCap = CAP * wmScale;
  const tagTarget = WORDMARK.advanceWidth * wmScale * 0.64;
  const tagScale = tagTarget / TAGLINE.advanceWidth;
  const tagCap = TAG_CAP * tagScale;
  const tagGap = 18;

  const blockH = wmCap + tagGap + tagCap;
  const blockTop = r - blockH / 2;
  const x = r * 2 + gap;

  const c = placeCrest(r, r, r, { color: fill, glow: glowName !== "none" });
  const wm = placeWordmark(x, blockTop + wmCap / 2, wmScale, fill, glows, "wm");
  const tag = placeTagline(x, blockTop + wmCap + tagGap + tagCap / 2, tagTarget, fill);

  return svg({
    box: frame([c.box, wm.box, tag.box], pad),
    defs: `${filterDefs(glows, "wm")}\n    ${c.defs}`,
    body: `  ${c.markup}\n  ${wm.markup}\n  ${tag.markup}`,
    label: "HECCA horizontal lockup with tagline",
  });
}

function buildStacked(glowName, fill, pad = 56) {
  const glows = GLOWS[glowName];
  const r = 72;
  const gap = 30;
  const scale = 0.78;
  const wmWidth = WORDMARK.advanceWidth * scale;
  const totalW = Math.max(r * 2, wmWidth);
  const cx = totalW / 2;
  const wmCy = r * 2 + gap + (CAP * scale) / 2;
  const c = placeCrest(cx, r, r, { color: fill, glow: glowName !== "none" });
  const wm = placeWordmark((totalW - wmWidth) / 2, wmCy, scale, fill, glows, "wm");
  return svg({
    box: frame([c.box, wm.box], pad),
    defs: `${filterDefs(glows, "wm")}\n    ${c.defs}`,
    body: `  ${c.markup}\n  ${wm.markup}`,
    label: "HECCA stacked lockup",
  });
}

function buildMonogram(glowName, fill, pad = 44) {
  const r = 110;
  const c = placeCrest(r, r, r, { color: fill, glow: glowName !== "none" });
  return svg({
    box: frame([c.box], pad),
    defs: c.defs,
    body: `  ${c.markup}`,
    label: "HECCA monogram",
  });
}

function buildAppIcon() {
  const S = 512;
  const c = placeCrest(S / 2, S / 2, S * 0.25, {
    color: C.gold,
    glow: true,
    ring: 4,
    inner: 2,
    hScale: 0.72,
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-labelledby="t">
  <title id="t">HECCA app icon</title>
  <defs>
    ${c.defs}
    <radialGradient id="bgGrad" cx="50%" cy="36%" r="78%">
      <stop offset="0%" stop-color="#3A1B3A"/>
      <stop offset="62%" stop-color="${C.black}"/>
      <stop offset="100%" stop-color="${C.black}"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" rx="112" fill="url(#bgGrad)"/>
  <rect x="1.5" y="1.5" width="${S - 3}" height="${S - 3}" rx="110.5" fill="none" stroke="${C.gold}" stroke-opacity="0.22"/>
  ${c.markup}
</svg>
`;
}

/* ---------- write ---------- */

mkdirSync(OUT, { recursive: true });

const files = {
  "hecca-wordmark-plum.svg": buildWordmark("plum", C.gold),
  "hecca-wordmark-emerald.svg": buildWordmark("emerald", C.gold),
  "hecca-wordmark-dual.svg": buildWordmark("dual", C.white),
  "hecca-wordmark-gold.svg": buildWordmark("gold", C.gold),
  "hecca-wordmark-flat.svg": buildWordmark("none", C.gold),
  "hecca-wordmark-black.svg": buildWordmark("none", C.black),
  "hecca-wordmark-white.svg": buildWordmark("none", C.white),
  "hecca-lockup-horizontal-plum.svg": buildHorizontal("plum", C.gold),
  "hecca-lockup-horizontal-tagline-plum.svg": buildHorizontalTagline("plum", C.gold),
  "hecca-lockup-horizontal-emerald.svg": buildHorizontal("emerald", C.gold),
  "hecca-lockup-stacked-plum.svg": buildStacked("plum", C.gold),
  "hecca-monogram-plum.svg": buildMonogram("plum", C.gold),
  "hecca-monogram-flat.svg": buildMonogram("none", C.gold),
  "hecca-app-icon.svg": buildAppIcon(),
};

for (const [name, markup] of Object.entries(files)) {
  writeFileSync(join(OUT, name), markup, "utf8");
}

console.log(`Wrote ${Object.keys(files).length} logo files to logos/`);
for (const name of Object.keys(files)) console.log("  ", name);
