// Remove Shopify demo / test data (snowboards, ski wax, template collections).
//
// The store was created from a Shopify demo dataset, so it ships with products
// and collections that have nothing to do with HECCA.
//
// This is a WHITELIST purge, not a blacklist. Everything is deleted unless it
// is defined by our own source of truth:
//
//   products    -> data/vintage-products.mjs
//   collections -> data/taxonomy.mjs
//
// That keeps the rule self-maintaining: add a real product or collection to the
// source files and it is protected automatically. Nothing has to be remembered.
//
//   node scripts/purge-demo.mjs           # plan (no writes) — ALWAYS run first
//   node scripts/purge-demo.mjs --apply   # delete permanently
//
// DELETION IS PERMANENT. Shopify has no undo for a deleted product. Several
// Shopify-created records (the gift card product, default system collections)
// may refuse deletion; those are reported rather than treated as failures.
import { graphql } from "./shopify.mjs";
import { TAXONOMY } from "../data/taxonomy.mjs";
import { VINTAGE_PRODUCTS } from "../data/vintage-products.mjs";

const APPLY = process.argv.includes("--apply");

// ── what we must keep ──────────────────────────────────────────────────────
const keepProducts = new Set(VINTAGE_PRODUCTS.map((p) => p.handle));

const keepCollections = new Set();
for (const cat of TAXONOMY.categories) {
  keepCollections.add(cat.handle);
  for (const sub of cat.children) keepCollections.add(sub.handle);
}
keepCollections.add(TAXONOMY.vintage.handle);
for (const sub of TAXONOMY.vintage.children) keepCollections.add(sub.handle);
for (const line of TAXONOMY.brandLines) keepCollections.add(line.handle);

// Safety rail: never run a purge when the whitelist is empty. That state means
// the definition files failed to load, and proceeding would wipe the store.
if (keepProducts.size === 0 || keepCollections.size === 0) {
  console.error("✗ Refusing to run: the protected sets are empty. Check that");
  console.error("  data/vintage-products.mjs and data/taxonomy.mjs still export.");
  process.exit(1);
}

// ── fetch everything ───────────────────────────────────────────────────────
const PRODUCTS = `query($cursor: String) {
  products(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes { id handle title status vendor productType }
  }
}`;

const COLLECTIONS = `query($cursor: String) {
  collections(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes { id handle title productsCount { count } }
  }
}`;

const DELETE_PRODUCT = `mutation($id: ID!) {
  productDelete(input: { id: $id }) {
    deletedProductId
    userErrors { field message }
  }
}`;

const DELETE_COLLECTION = `mutation($id: ID!) {
  collectionDelete(input: { id: $id }) {
    deletedCollectionId
    userErrors { field message }
  }
}`;

async function fetchAll(query, key) {
  const out = [];
  let cursor = null;
  for (;;) {
    const d = await graphql(query, { cursor });
    out.push(...d[key].nodes);
    if (!d[key].pageInfo.hasNextPage) break;
    cursor = d[key].pageInfo.endCursor;
  }
  return out;
}

const products = await fetchAll(PRODUCTS, "products");
const collections = await fetchAll(COLLECTIONS, "collections");

const deadProducts = products.filter((p) => !keepProducts.has(p.handle));
const deadCollections = collections.filter((c) => !keepCollections.has(c.handle));

console.log(`Store: ${products.length} products · ${collections.length} collections`);
console.log(
  `Protected: ${keepProducts.size} product(s) · ${keepCollections.size} collection(s)\n`,
);

console.log(`Products to DELETE (${deadProducts.length}):`);
for (const p of deadProducts) {
  console.log(`  ✗ ${p.title.padEnd(38)} [${p.status}]  ${p.vendor ?? "—"}`);
}

console.log(`\nCollections to DELETE (${deadCollections.length}):`);
for (const c of deadCollections) {
  console.log(
    `  ✗ ${c.title.padEnd(38)} /collections/${c.handle.padEnd(24)} ${c.productsCount.count} product(s)`,
  );
}

if (!APPLY) {
  console.log("\nDry run — nothing deleted. Re-run with --apply to delete permanently.");
  process.exit(0);
}

// ── apply ──────────────────────────────────────────────────────────────────
let delP = 0;
let delC = 0;
const refused = [];

for (const p of deadProducts) {
  const res = await graphql(DELETE_PRODUCT, { id: p.id });
  const errs = res.productDelete.userErrors;
  if (errs?.length || !res.productDelete.deletedProductId) {
    const why = errs?.length ? errs.map((e) => e.message).join("; ") : "not deleted";
    console.log(`  ! ${p.title}: ${why}`);
    refused.push(`product "${p.title}" — ${why}`);
    continue;
  }
  console.log(`  ✓ deleted product  ${p.title}`);
  delP++;
}

for (const c of deadCollections) {
  const res = await graphql(DELETE_COLLECTION, { id: c.id });
  const errs = res.collectionDelete.userErrors;
  if (errs?.length || !res.collectionDelete.deletedCollectionId) {
    const why = errs?.length ? errs.map((e) => e.message).join("; ") : "not deleted";
    console.log(`  ! ${c.title}: ${why}`);
    refused.push(`collection "${c.title}" — ${why}`);
    continue;
  }
  console.log(`  ✓ deleted collection  ${c.title}`);
  delC++;
}

console.log(`\nDeleted ${delP} product(s) · ${delC} collection(s)`);
if (refused.length) {
  console.log(`\n${refused.length} refused by Shopify (usually system records):`);
  for (const r of refused) console.log(`  - ${r}`);
}
console.log("\nRe-check with: node scripts/collections.mjs --verify");
