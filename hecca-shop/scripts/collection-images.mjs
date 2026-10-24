// Attach the collection plate images to their Shopify collections.
//
// Read-only by default — it plans and prints. Nothing is uploaded without --apply.
//
//   node scripts/collection-images.mjs            # plan (no writes)
//   node scripts/collection-images.mjs --apply    # upload + attach
//   node scripts/collection-images.mjs --apply --force   # re-upload unchanged
//   node scripts/collection-images.mjs --verify   # which collections have an image
//
// The PNGs live in assets/collections/png/. A manifest in reports/ records the
// SHA-256 of what was uploaded per handle, so re-running --apply is a no-op
// unless the plate changed on disk.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { graphql } from "./shopify.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const PNG_DIR = join(root, "assets", "collections", "png");
const MANIFEST = join(root, "reports", "collection-images.json");

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");
const FORCE = process.argv.includes("--force");

const LIST = `query Collections($cursor: String) {
  collections(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes { id handle title image { url altText } }
  }
}`;

async function fetchCollections() {
  const map = new Map();
  let cursor = null;
  for (;;) {
    const d = await graphql(LIST, { cursor });
    for (const c of d.collections.nodes) map.set(c.handle, c);
    if (!d.collections.pageInfo.hasNextPage) break;
    cursor = d.collections.pageInfo.endCursor;
  }
  return map;
}

const STAGED = `mutation Staged($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}`;

const UPDATE = `mutation Update($input: CollectionInput!) {
  collectionUpdate(input: $input) {
    collection { id handle title image { url altText } }
    userErrors { field message }
  }
}`;

function loadManifest() {
  if (!existsSync(MANIFEST)) return {};
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf8"));
  } catch {
    return {};
  }
}

function saveManifest(m) {
  mkdirSync(dirname(MANIFEST), { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n", "utf8");
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Upload one PNG to Shopify's staging area and return its resourceUrl. */
async function stagedUpload(file, buf) {
  const res = await graphql(STAGED, {
    input: [
      {
        resource: "IMAGE",
        filename: file,
        mimeType: "image/png",
        fileSize: String(buf.length),
        httpMethod: "POST",
      },
    ],
  });
  const errs = res.stagedUploadsCreate.userErrors;
  if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));

  const target = res.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error("no staged target returned");

  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([buf], { type: "image/png" }), file);

  const up = await fetch(target.url, { method: "POST", body: form });
  if (!up.ok) {
    throw new Error(`staged upload failed: HTTP ${up.status} ${await up.text()}`);
  }
  return target.resourceUrl;
}

// ── plan ───────────────────────────────────────────────────────────────────
const files = readdirSync(PNG_DIR)
  .filter((f) => f.endsWith(".png"))
  .sort();
const live = await fetchCollections();
const manifest = loadManifest();

const plan = files.map((f) => {
  const handle = f.replace(/\.png$/, "");
  const buf = readFileSync(join(PNG_DIR, f));
  const hash = sha256(buf);
  const c = live.get(handle);
  const uploaded = manifest[handle]?.sha256 === hash;
  const status = !c ? "MISSING " : uploaded && c.image ? "current " : c.image ? "replace " : "attach  ";
  return { file: f, handle, buf, hash, collection: c, status };
});

// ── verify mode ────────────────────────────────────────────────────────────
if (VERIFY) {
  console.log(`${files.length} plate(s), ${live.size} collection(s) in Shopify:\n`);
  console.log("  handle                        image");
  console.log("  ----------------------------  -----------------------------------------");
  for (const p of plan) {
    const url = p.collection?.image?.url ?? "—";
    console.log(`  ${p.handle.padEnd(28)}  ${url === "—" ? url : url.split("?")[0].split("/").pop()}`);
  }
  process.exit(0);
}

// ── plan output ────────────────────────────────────────────────────────────
console.log(`assets/collections/png holds ${files.length} plate(s).\n`);
for (const p of plan) {
  const note =
    p.status === "MISSING "
      ? "⚠ no collection with this handle"
      : p.status === "current "
        ? "already up to date"
        : p.collection.image
          ? "will replace existing image"
          : "will attach";
  console.log(`  [${p.status}] ${p.handle.padEnd(28)} ${note}`);
}

const todo = plan.filter((p) => p.collection && (FORCE || p.status !== "current "));
console.log(
  `\n${plan.length - todo.length} up to date · ${todo.length} to upload · ` +
    `${plan.filter((p) => !p.collection).length} without a collection`,
);

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply to upload them.");
  process.exit(0);
}
if (!todo.length) {
  console.log("Nothing to do.");
  process.exit(0);
}

// ── apply ──────────────────────────────────────────────────────────────────
let done = 0;
let failed = 0;
for (const p of todo) {
  try {
    const resourceUrl = await stagedUpload(p.file, p.buf);
    const res = await graphql(UPDATE, {
      input: {
        id: p.collection.id,
        image: { src: resourceUrl, altText: `${p.collection.title} — HECCA` },
      },
    });
    const errs = res.collectionUpdate.userErrors;
    if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));

    manifest[p.handle] = {
      sha256: p.hash,
      bytes: p.buf.length,
      altText: `${p.collection.title} — HECCA`,
      updatedAt: new Date().toISOString(),
    };
    saveManifest(manifest);
    console.log(`  ✓ ${p.collection.title}`);
    done++;
  } catch (err) {
    console.log(`  ✗ ${p.handle}: ${err.message}`);
    failed++;
  }
}

console.log(`\nUploaded ${done} · failed ${failed}`);
console.log("Verify with: node scripts/collection-images.mjs --verify");
