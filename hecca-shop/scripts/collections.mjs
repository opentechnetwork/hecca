// Create / verify HECCA collections from data/taxonomy.mjs.
//
// Read-only by default — it plans and prints. Nothing is written without --apply.
//
//   node scripts/collections.mjs            # plan (no writes)
//   node scripts/collections.mjs --apply    # create missing collections + publish
//   node scripts/collections.mjs --verify   # list live collections with product counts
//
// Idempotent: existing handles are matched and skipped, so it is safe to re-run.
// New collections are unpublished by default in Shopify, so each one is
// published to the Online Store as it is created.
import { graphql } from "./shopify.mjs";
import { TAXONOMY } from "../data/taxonomy.mjs";

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");

const tagRule = (relation, condition) => ({ column: "TAG", relation, condition });

/** Flatten the taxonomy into the concrete list of collections we want. */
function buildDesired() {
  const out = [];

  const node = (o) => out.push(o);

  for (const cat of TAXONOMY.categories) {
    // Shopify does NOT support "tag contains" — only exact tag matches. A parent
    // collection is therefore the disjunctive union of its children's tags,
    // generated from the taxonomy so adding a child updates the parent.
    const catRules = cat.children.map((c) => tagRule("EQUALS", c.tag));
    node({
      group: "Categories",
      title: cat.name,
      handle: cat.handle,
      description: cat.description,
      rules: catRules,
      disjunctive: true,
      ruleLabel: catRules.map((r) => `"${r.condition}"`).join(" OR "),
      indent: 0,
    });
    for (const sub of cat.children) {
      node({
        group: "Categories",
        title: sub.name,
        handle: sub.handle,
        description: sub.description,
        rules: [tagRule("EQUALS", sub.tag)],
        ruleLabel: `tag equals "${sub.tag}"`,
        indent: 1,
      });
    }
  }

  const v = TAXONOMY.vintage;
  const vintageRules = v.children.map((c) => tagRule("EQUALS", c.tag));
  node({
    group: "Categories",
    title: v.name,
    handle: v.handle,
    description: v.description,
    rules: vintageRules,
    disjunctive: true,
    ruleLabel: vintageRules.map((r) => `"${r.condition}"`).join(" OR "),
    indent: 0,
  });
  for (const sub of v.children) {
    node({
      group: "Categories",
      title: sub.name,
      handle: sub.handle,
      description: sub.description,
      rules: [tagRule("EQUALS", sub.tag)],
      ruleLabel: `tag equals "${sub.tag}"`,
      indent: 1,
    });
  }

  for (const line of TAXONOMY.brandLines) {
    node({
      group: "Brand lines",
      title: line.name,
      handle: line.handle,
      description: line.description,
      rules: [tagRule("EQUALS", line.tag)],
      ruleLabel: `tag equals "${line.tag}"`,
      indent: 0,
    });
  }

  return out;
}

const EXISTING = `query Existing($cursor: String) {
  collections(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes { id handle title ruleSet { appliedDisjunctively rules { column relation condition } } }
  }
}`;

async function fetchExisting() {
  const map = new Map();
  let cursor = null;
  for (;;) {
    const d = await graphql(EXISTING, { cursor });
    for (const c of d.collections.nodes) map.set(c.handle, c);
    if (!d.collections.pageInfo.hasNextPage) break;
    cursor = d.collections.pageInfo.endCursor;
  }
  return map;
}

const CREATE = `mutation Create($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection { id handle title }
    userErrors { field message }
  }
}`;

const UPDATE = `mutation Update($input: CollectionInput!) {
  collectionUpdate(input: $input) {
    collection { id handle title }
    userErrors { field message }
  }
}`;

/** Has the live rule set drifted from what the taxonomy says it should be? */
function rulesDiffer(hit, d) {
  const live = hit.ruleSet;
  if (!live) return true;
  const key = (rs) =>
    (rs.rules ?? [])
      .map((r) => `${r.column} ${r.relation} ${r.condition}`)
      .sort()
      .join(" | ");
  if (key(live) !== key({ rules: d.rules })) return true;
  return !!live.appliedDisjunctively !== !!d.disjunctive;
}

const PUBLISH = `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    userErrors { field message }
  }
}`;

async function onlineStorePublicationId() {
  const d = await graphql(`{ publications(first: 10) { nodes { id name } } }`);
  return d.publications.nodes.find((p) => /online store/i.test(p.name))?.id ?? null;
}

// ── verify mode ────────────────────────────────────────────────────────────
if (VERIFY) {
  const d = await graphql(`{
    collections(first: 100) {
      nodes {
        title
        handle
        productsCount { count }
        ruleSet { appliedDisjunctively rules { column relation condition } }
      }
    }
  }`);
  const rows = d.collections.nodes.sort((a, b) => a.handle.localeCompare(b.handle));
  console.log(`${rows.length} collection(s) in Shopify:\n`);
  console.log("  products  handle                        rule");
  console.log("  --------  ----------------------------  --------------------------------");
  for (const c of rows) {
    const joiner = c.ruleSet?.appliedDisjunctively ? " OR " : " AND ";
    const rule = (c.ruleSet?.rules ?? [])
      .map((r) => `${r.column} ${r.relation} ${r.condition}`)
      .join(joiner);
    console.log(
      `  ${String(c.productsCount.count).padStart(8)}  ${c.handle.padEnd(28)}  ${rule}`,
    );
  }
  process.exit(0);
}

// ── plan / apply ───────────────────────────────────────────────────────────
const desired = buildDesired();
console.log(`data/taxonomy.mjs defines ${desired.length} collections.\n`);

const existing = await fetchExisting();
console.log(`Shopify currently holds ${existing.size} collection(s).\n`);

let create = 0;
let changed = 0;
let same = 0;
let lastGroup = null;
const toCreate = [];
const toUpdate = [];

for (const d of desired) {
  if (d.group !== lastGroup) {
    console.log(`\n${d.group}`);
    lastGroup = d.group;
  }
  const hit = existing.get(d.handle);
  let status;
  if (!hit) {
    status = "NEW    ";
    create++;
    toCreate.push(d);
  } else if (rulesDiffer(hit, d)) {
    status = "UPDATE ";
    changed++;
    toUpdate.push({ d, id: hit.id });
  } else {
    status = "exists ";
    same++;
  }
  console.log(
    `  [${status}] ${"  ".repeat(d.indent)}${d.title.padEnd(20 - d.indent * 2)}` +
      ` /collections/${d.handle.padEnd(26)} ${d.ruleLabel}`,
  );
}

console.log(`\n${same} unchanged · ${create} to create · ${changed} to update`);

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply to create them.");
  process.exit(0);
}

if (create === 0 && changed === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

const pubId = await onlineStorePublicationId();
console.log(`\nPublishing to: ${pubId ?? "⚠ Online Store publication not found"}\n`);

let created = 0;
let updated = 0;
let failed = 0;

// Rule drift first — an existing parent must absorb new child tags.
for (const { d, id } of toUpdate) {
  const res = await graphql(UPDATE, {
    input: {
      id,
      ruleSet: { appliedDisjunctively: d.disjunctive ?? false, rules: d.rules },
    },
  });
  const errs = res.collectionUpdate.userErrors;
  if (errs?.length) {
    console.log(`  ✗ ${d.title} (update): ${errs.map((e) => e.message).join("; ")}`);
    failed++;
    continue;
  }
  console.log(`  ↻ ${d.title} rules updated → ${d.ruleLabel}`);
  updated++;
}

for (const d of toCreate) {
  const res = await graphql(CREATE, {
    input: {
      title: d.title,
      handle: d.handle,
      descriptionHtml: d.description,
      seo: { title: `${d.title} — HECCA`, description: d.description },
      ruleSet: { appliedDisjunctively: d.disjunctive ?? false, rules: d.rules },
    },
  });

  const errs = res.collectionCreate.userErrors;
  if (errs?.length) {
    console.log(`  ✗ ${d.title}: ${errs.map((e) => e.message).join("; ")}`);
    failed++;
    continue;
  }

  const id = res.collectionCreate.collection.id;
  if (pubId) {
    const pub = await graphql(PUBLISH, { id, input: [{ publicationId: pubId }] });
    const pubErrs = pub.publishablePublish.userErrors;
    if (pubErrs?.length) {
      console.log(`  ~ ${d.title}: created but not published — ${pubErrs.map((e) => e.message).join("; ")}`);
    }
  }
  console.log(`  ✓ ${d.title}`);
  created++;
}

console.log(`\nCreated ${created} · updated ${updated} · failed ${failed}`);
console.log("Verify with: node scripts/collections.mjs --verify");
