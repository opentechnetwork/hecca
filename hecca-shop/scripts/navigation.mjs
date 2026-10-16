// Build the HECCA storefront navigation menu from data/taxonomy.mjs.
//
// Shopify collections are FLAT — there is no native nesting. The two-level
// hierarchy a customer actually sees lives entirely in the navigation menu,
// while the URL hierarchy lives in the handle prefixes (jewelry,
// jewelry-rings). One menu drives the whole storefront header.
//
//   node scripts/navigation.mjs           # plan (no writes)
//   node scripts/navigation.mjs --apply   # create/update the menu
//   node scripts/navigation.mjs --verify  # dump the live menu tree
//
// REQUIRES the write_online_store_navigation scope. Without it the `menus`
// query returns ACCESS_DENIED and this script stops with guidance. Schema
// validation runs BEFORE access control, so a malformed query still surfaces
// as an undefinedField error even while the scope is missing — useful for
// checking the query shape ahead of time.
//
// Layout produced:
//   Jewelry        → /collections/jewelry        ▸ Rings, Necklaces
//   Apparel        → /collections/apparel        ▸ Shirts, Shorts
//   Accessories    → /collections/accessories    ▸ Bags, Belts
//   Home Decor     → /collections/home-decor     ▸ Bedding, Mats & Rugs
//   Vintage        → /collections/vintage        ▸ Vintage Jewelry/Apparel/Accessories
//   Collections    → /collections                ▸ FEMME, HOMME, WILD, AURA
import { graphql } from "./shopify.mjs";
import { TAXONOMY } from "../data/taxonomy.mjs";

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");

const MENU_HANDLE = "main-menu";
const MENU_TITLE = "Main menu"; // only used when the menu has to be created
const LINES_TITLE = "Collections"; // label of the brand-line dropdown

const MENUS_QUERY = `query {
  menus(first: 20) {
    nodes {
      id handle title
      items { id title type resourceId url items { id title type resourceId url } }
    }
  }
}`;

const COLLECTIONS_QUERY = `query($cursor: String) {
  collections(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes { id handle title }
  }
}`;

const MENU_CREATE = `mutation Create($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
  menuCreate(title: $title, handle: $handle, items: $items) {
    menu { id handle title }
    userErrors { field message }
  }
}`;

const MENU_UPDATE = `mutation Update($id: ID!, $title: String!, $items: [MenuItemCreateInput!]!) {
  menuUpdate(id: $id, title: $title, items: $items) {
    menu { id handle title }
    userErrors { field message }
  }
}`;

async function fetchMenus() {
  const d = await graphql(MENUS_QUERY);
  return d.menus.nodes;
}

/** handle -> { id, title } for every live collection. */
async function collectionIndex() {
  const map = new Map();
  let cursor = null;
  for (;;) {
    const d = await graphql(COLLECTIONS_QUERY, { cursor });
    for (const c of d.collections.nodes) map.set(c.handle, c);
    if (!d.collections.pageInfo.hasNextPage) break;
    cursor = d.collections.pageInfo.endCursor;
  }
  return map;
}

/** The tree we want, in taxonomy order. `handle: null` means "group only". */
function desiredTree() {
  const tree = TAXONOMY.categories.map((cat) => ({
    title: cat.name,
    handle: cat.handle,
    children: cat.children.map((c) => ({ title: c.name, handle: c.handle })),
  }));

  const v = TAXONOMY.vintage;
  tree.push({
    title: v.name,
    handle: v.handle,
    children: v.children.map((c) => ({ title: c.name, handle: c.handle })),
  });

  tree.push({
    title: LINES_TITLE,
    handle: null,
    children: TAXONOMY.brandLines.map((l) => ({ title: l.name, handle: l.handle })),
  });

  return tree;
}

// ── verify ─────────────────────────────────────────────────────────────────
if (VERIFY) {
  const menus = await fetchMenus();
  if (!menus.length) console.log("No menus defined.");
  for (const m of menus) {
    console.log(`\n${m.title}   (handle: ${m.handle})   ${m.id}`);
    for (const it of m.items) {
      console.log(`  • ${it.title.padEnd(24)} [${it.type}] ${it.resourceId ?? it.url ?? ""}`);
      for (const c of it.items ?? []) {
        console.log(`      – ${c.title.padEnd(20)} [${c.type}] ${c.resourceId ?? c.url ?? ""}`);
      }
    }
  }
  process.exit(0);
}

// ── plan / apply ───────────────────────────────────────────────────────────
let menus;
try {
  menus = await fetchMenus();
} catch (err) {
  const msg = String(err.message ?? err);
  if (/ACCESS_DENIED/.test(msg)) {
    console.error(
      "\n✗ Access denied for the `menus` field.\n\n" +
        "  The app is missing the write_online_store_navigation scope. Shopify\n" +
        "  issues tokens from the app VERSION's declared scope list, so the scope\n" +
        "  must be added to a new version and released, then the app re-installed.\n" +
        "  Verify with:  node scripts/ping.mjs   (the Navigation row should list\n" +
        "  the menu handles rather than an error).\n",
    );
    process.exit(1);
  }
  throw err;
}

const cols = await collectionIndex();
const tree = desiredTree();

const missing = [];
for (const node of tree) {
  if (node.handle && !cols.has(node.handle)) missing.push(node.handle);
  for (const c of node.children) if (!cols.has(c.handle)) missing.push(c.handle);
}

console.log(`Menu: ${MENU_HANDLE}  ·  ${tree.length} top-level items  ·  ${cols.size} collections live\n`);
for (const node of tree) {
  const link = node.handle ? `/collections/${node.handle}` : "/collections";
  console.log(`  • ${node.title.padEnd(14)} → ${link}`);
  for (const c of node.children) {
    console.log(`      – ${c.title.padEnd(18)} → /collections/${c.handle}`);
  }
}

if (missing.length) {
  console.log(`\n⚠ ${missing.length} handle(s) have no live collection: ${missing.join(", ")}`);
  console.log("  Run `node scripts/collections.mjs --apply` first, or they will be dropped.");
}

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply to write the menu.");
  process.exit(0);
}

/** Turn a desired node into a MenuItemCreateInput, skipping missing collections. */
function toInput(node) {
  const items = node.children
    .map((c) => cols.get(c.handle))
    .filter(Boolean)
    .map((c) => ({ title: c.title, type: "COLLECTION", resourceId: c.id }));

  const input = { title: node.title };
  if (items.length) input.items = items;

  const col = node.handle ? cols.get(node.handle) : null;
  if (col) {
    input.type = "COLLECTION";
    input.resourceId = col.id;
  } else {
    // Group-only parent (brand lines). Links to the all-collections page.
    input.type = "COLLECTIONS";
  }
  return input;
}

const items = tree.map(toInput);
const existing = menus.find((m) => m.handle === MENU_HANDLE);

if (existing) {
  const res = await graphql(MENU_UPDATE, { id: existing.id, title: existing.title, items });
  const errs = res.menuUpdate.userErrors;
  if (errs?.length) {
    console.log(`\n✗ menuUpdate: ${errs.map((e) => `${(e.field ?? []).join(".")} ${e.message}`).join("; ")}`);
    process.exit(1);
  }
  console.log(`\n✓ Updated "${res.menuUpdate.menu.title}" (${res.menuUpdate.menu.handle})`);
} else {
  const res = await graphql(MENU_CREATE, { title: MENU_TITLE, handle: MENU_HANDLE, items });
  const errs = res.menuCreate.userErrors;
  if (errs?.length) {
    console.log(`\n✗ menuCreate: ${errs.map((e) => `${(e.field ?? []).join(".")} ${e.message}`).join("; ")}`);
    process.exit(1);
  }
  console.log(`\n✓ Created "${res.menuCreate.menu.title}" (${res.menuCreate.menu.handle})`);
}

console.log("Verify with: node scripts/navigation.mjs --verify");
