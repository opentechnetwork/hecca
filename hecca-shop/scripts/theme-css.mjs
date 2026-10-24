// Install the brand stylesheet into a Shopify theme, as its own asset.
//
//   node scripts/theme-css.mjs                 # plan, no writes
//   node scripts/theme-css.mjs --apply         # upload asset + add the <link>
//   node scripts/theme-css.mjs --remove        # take the <link> back out
//   node scripts/theme-css.mjs --theme=Dawn    # target a theme by name or id
//
// Why a separate asset rather than appending to base.css: the theme's own files
// stay stock, so a new theme version can be dropped in without a merge, and the
// only thing to re-apply is one asset plus one line in layout/theme.liquid.
// Running --apply again after a theme update is the whole migration.
//
// The link is wrapped in a marker comment, so the script can find, replace or
// remove it without guessing, and a second run is a no-op.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { graphql } from "./shopify.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SRC = join(root, "theme", "hecca.css");
const BACKUP = join(root, "theme", "backup");
const ASSET = "assets/hecca.css";
const LAYOUT = "layout/theme.liquid";

const OPEN = "{%- comment -%} hecca:css {%- endcomment -%}";
const CLOSE = "{%- comment -%} /hecca:css {%- endcomment -%}";
const BLOCK = `    ${OPEN}
    {{ 'hecca.css' | asset_url | stylesheet_tag }}
    ${CLOSE}`;

const APPLY = process.argv.includes("--apply");
const REMOVE = process.argv.includes("--remove");
const want = (process.argv.find((a) => a.startsWith("--theme=")) ?? "").split("=")[1] || "MAIN";

const THEMES = `{ themes(first: 20) { nodes { id name role } } }`;
const themeList = await graphql(THEMES);
const theme =
  themeList.themes.nodes.find(
    (t) => t.id === want || t.name.toLowerCase() === want.toLowerCase() || t.role === want.toUpperCase(),
  ) ?? null;
if (!theme) {
  console.log("Themes:");
  for (const t of themeList.themes.nodes) console.log(`  ${t.role.padEnd(12)} ${t.name}  ${t.id}`);
  throw new Error(`no theme matched --theme=${want}`);
}

const READ = `query Read($id: ID!, $names: [String!]!) {
  theme(id: $id) {
    files(filenames: $names) {
      nodes { filename body { ... on OnlineStoreThemeFileBodyText { content } } }
    }
  }
}`;

const UPSERT = `mutation Upsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
  themeFilesUpsert(themeId: $themeId, files: $files) {
    upsertedThemeFiles { filename }
    userErrors { field message }
  }
}`;

async function readFiles(names) {
  const d = await graphql(READ, { id: theme.id, names });
  const out = {};
  for (const f of d.theme.files.nodes) out[f.filename] = f.body.content;
  return out;
}

async function writeFile(filename, content) {
  const res = await graphql(UPSERT, {
    themeId: theme.id,
    files: [{ filename, body: { type: "TEXT", value: content } }],
  });
  const errs = res.themeFilesUpsert.userErrors;
  if (errs?.length) throw new Error(errs.map((e) => `${e.field}: ${e.message}`).join("; "));
}

/** Where the block should sit: right after the theme's main stylesheet. */
function insertionIndex(lines) {
  // The theme's own base stylesheet is the natural anchor. Inserting after it
  // keeps the brand sheet later in the cascade without landing inside a
  // conditional (Dawn loads predictive-search.css inside an {% if %}).
  const base = lines.findIndex((l) => /base\.css/.test(l) && /stylesheet_tag|rel=["']stylesheet/i.test(l));
  if (base !== -1) return base + 1;

  // Fallback: last thing in <head>, which is after every stylesheet.
  const close = lines.findIndex((l) => /<\/head>/i.test(l));
  return close === -1 ? lines.length : close;
}

const css = readFileSync(SRC, "utf8");
const before = await readFiles([LAYOUT]);
let layout = before[LAYOUT];
if (!layout) throw new Error(`${LAYOUT} not found in ${theme.name}`);

const hasBlock = layout.includes(OPEN);
console.log(`theme     ${theme.name}  (${theme.role})`);
console.log(`source    theme/hecca.css  ${(css.length / 1024).toFixed(1)} KB`);
console.log(`asset     ${ASSET}`);
console.log(`layout    ${LAYOUT}  ${hasBlock ? "— link already present" : "— link will be added"}`);

let next = layout;
if (REMOVE) {
  if (!hasBlock) {
    console.log("\nNothing to remove.");
    process.exit(0);
  }
  next = layout.replace(new RegExp(`\\n?[ \\t]*${escape(OPEN)}[\\s\\S]*?${escape(CLOSE)}`), "");
  console.log("\nremove    the hecca.css <link> block");
} else if (!hasBlock) {
  const lines = layout.split("\n");
  const at = insertionIndex(lines);
  lines.splice(at, 0, BLOCK);
  next = lines.join("\n");
  console.log(`\ninsert    after line ${at} of ${LAYOUT}:`);
  for (const l of BLOCK.split("\n")) console.log(`  + ${l.trim()}`);
} else {
  console.log("\nlink      already installed — nothing to change in the layout");
}

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply.");
  process.exit(0);
}

// Keep a local copy of the layout before touching it, so a bad edit is easy to
// reverse even if the theme has no version to roll back to. Written after the
// remote update succeeds, from the copy already held in memory.
function backupLayout() {
  mkdirSync(BACKUP, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(BACKUP, `${theme.name.replace(/[^\w-]+/g, "-")}-theme.liquid.${stamp}`);
  writeFileSync(file, layout, "utf8");
  return file;
}

/** Shopify requires an exemption before an app may write theme files. */
function printManual() {
  console.log(`
Shopify denied the write (themeFilesUpsert needs an exemption for apps).
Install it by hand — about two minutes:

  1. Admin → Online Store → Themes → ⋯ → Edit code
  2. Assets → Add a new asset → upload hecca-shop/theme/hecca.css
  3. layout/theme.liquid → find {{ 'base.css' | asset_url | stylesheet_tag }}
  4. Paste this directly under it:

${BLOCK}

  5. Save.

Full walkthrough: hecca-shop/theme/README.md`);
}

try {
  if (!REMOVE) {
    await writeFile(ASSET, css);
    console.log(`\nuploaded  ${ASSET} → ${theme.name}`);
  }

  if (next !== layout) {
    await writeFile(LAYOUT, next);
    console.log(`updated   ${LAYOUT} → ${theme.name}`);
    console.log(`backup    ${backupLayout()}`);
  }

  console.log("\nDone. Open the theme editor and confirm the storefront still renders.");
} catch (err) {
  if (/ACCESS_DENIED|exemption/i.test(err.message)) {
    printManual();
    process.exit(0);
  }
  throw err;
}

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
