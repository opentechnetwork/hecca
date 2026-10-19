// Import HECCA products from a product definition file.
//
//   node scripts/products.mjs                      # plan (no writes)
//   node scripts/products.mjs --apply              # create + repair + publish
//   node scripts/products.mjs --verify             # detailed live state
//   node scripts/products.mjs --file data/x.mjs    # alternate definition file
//
// Products are matched by handle, so this is idempotent. Re-running --apply
// does not duplicate anything; it repairs anything that is out of sync
// (title, vendor, tags, SEO, price, inventory, tracking, publication).
//
// Per product:
//   1. productCreate   — title, vendor, type, tags, SEO, description + images.
//                        Shopify downloads each source URL and re-hosts it on
//                        its own CDN, so we do not depend on Mercari staying up.
//   2. variant update  — price, inventory policy, tracked inventory
//   3. inventoryActivate — stocks the item at the location and sets qty 1
//   4. publish         — onto the Online Store sales channel
//
// Vintage pieces are one-of-a-kind, so quantity is deliberately 1. When one
// sells the variant hits zero and reads as out of stock — the correct signal
// for an archive piece rather than a restock.
import { graphql } from "./shopify.mjs";

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");
const fileArg = process.argv.indexOf("--file");
const FILE = fileArg !== -1 ? process.argv[fileArg + 1] : "../data/vintage-products.mjs";

const { VINTAGE_PRODUCTS } = await import(FILE);
const HANDLES = new Set(VINTAGE_PRODUCTS.map((p) => p.handle));

const Q = (s) => `query { ${s} }`;

const CREATE = `mutation CreateProduct($product: ProductCreateInput, $media: [CreateMediaInput!]) {
  productCreate(product: $product, media: $media) {
    product { id handle title variants(first: 1) { nodes { id inventoryItem { id } } } }
    userErrors { field message }
  }
}`;

const UPDATE_VARIANT = `mutation SetVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id price }
    userErrors { field message }
  }
}`;

const ACTIVATE = `mutation Activate($inventoryItemId: ID!, $locationId: ID!, $available: Int) {
  inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
    inventoryLevel { id quantities(names: ["available"]) { name quantity } }
    userErrors { field message }
  }
}`;

const SET_QTY = `mutation SetQty($input: InventorySetQuantitiesInput!) {
  inventorySetQuantities(input: $input) {
    inventoryAdjustmentGroup { reason }
    userErrors { field message }
  }
}`;

const PUBLISH = `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) { userErrors { field message } }
}`;

const PRODUCT_UPDATE = `mutation UpdateProduct($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id handle }
    userErrors { field message }
  }
}`;

const LIST = `query Existing($cursor: String) {
  products(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id handle title status tags vendor publishedAt
      seo { title description }
      variants(first: 1) { nodes { id price sku barcode inventoryQuantity inventoryItem { id tracked sku } } }
      media(first: 30) { nodes { id alt status } }
    }
  }
}`;

async function fetchProducts() {
  const map = new Map();
  let cursor = null;
  for (;;) {
    const d = await graphql(LIST, { cursor });
    for (const p of d.products.nodes) map.set(p.handle, p);
    if (!d.products.pageInfo.hasNextPage) break;
    cursor = d.products.pageInfo.endCursor;
  }
  return map;
}

async function context() {
  const d = await graphql(
    Q(`locations(first: 10) { nodes { id name } } publications(first: 10) { nodes { id name } }`),
  );
  return {
    location: d.locations.nodes[0] ?? null,
    online: d.publications.nodes.find((p) => /online store/i.test(p.name)) ?? null,
  };
}

const mediaSummary = (p) => {
  const nodes = p.media?.nodes ?? [];
  const ok = nodes.filter((m) => m.status === "READY").length;
  const bad = nodes.filter((m) => m.status && m.status !== "READY").map((m) => m.status);
  return bad.length ? `${ok}/${nodes.length} ready (${[...new Set(bad)].join(",")})` : `${ok}/${nodes.length} ready`;
};

// Vendor must never be empty: Shopify substitutes the shop name ("HECCA Shop"),
// which implies HECCA manufactured the piece. Fall back to "Unbranded" instead.
const vendorFor = (p) => p.vendor || "Unbranded";

/** Drift in the product-level fields (as opposed to the variant). */
function productDrift(live, p) {
  const d = [];
  if (live.title !== p.title) d.push("title");
  if ((live.vendor ?? "") !== vendorFor(p)) {
    d.push(`vendor "${live.vendor ?? "—"}" → "${vendorFor(p)}"`);
  }
  const liveTags = [...(live.tags ?? [])].sort().join(",");
  const wantTags = [...p.tags].sort().join(",");
  if (liveTags !== wantTags) d.push("tags");
  if ((live.seo?.title ?? "") !== (p.seoTitle ?? "")) d.push("seo title");
  if ((live.seo?.description ?? "") !== (p.seoDescription ?? "")) d.push("seo description");
  return d;
}

// ── verify ─────────────────────────────────────────────────────────────────
if (VERIFY) {
  const all = await fetchProducts();
  const mine = [...all.values()].filter((p) => HANDLES.has(p.handle));
  if (!mine.length) {
    console.log("No defined products exist in Shopify yet.");
    process.exit(0);
  }
  for (const p of mine) {
    const v = p.variants.nodes[0] ?? {};
    console.log(`\n${p.title}   [${p.status}]${p.publishedAt ? " · published" : " · NOT published"}`);
    console.log(`  /products/${p.handle}`);
    console.log(`  vendor: ${p.vendor ?? "—"}   price: ${v.price ?? "—"}   qty: ${v.inventoryQuantity ?? "—"}   tracked: ${v.inventoryItem?.tracked ?? "—"}`);
    console.log(`  sku: ${v.inventoryItem?.sku || "(none)"}   barcode: ${v.barcode || "(none)"}   item: ${v.inventoryItem?.id ?? "—"}`);
    console.log(`  tags: ${(p.tags ?? []).join(", ") || "(none)"}`);
    console.log(`  images: ${mediaSummary(p)}`);
    console.log(`  seo: ${p.seo?.title ?? "—"}`);
  }
  process.exit(0);
}

// ── plan ───────────────────────────────────────────────────────────────────
const existing = await fetchProducts();
const ctx = await context();

console.log(`Definition file: ${FILE}`);
console.log(`Location:        ${ctx.location ? `${ctx.location.name} (${ctx.location.id})` : "⚠ none found"}`);
console.log(`Online Store:    ${ctx.online ? ctx.online.id : "⚠ not found"}\n`);

for (const p of VINTAGE_PRODUCTS) {
  const hit = existing.get(p.handle);
  if (!hit) {
    console.log(`  [NEW   ] ${p.title}  $${p.price}  ${p.images.length} image(s)`);
    console.log(`           tags: ${p.tags.join(", ")}`);
  } else {
    const v = hit.variants.nodes[0] ?? {};
    const drift = [];
    if (v.price !== p.price) drift.push(`price ${v.price} → ${p.price}`);
    if (v.inventoryQuantity !== 1) drift.push(`qty ${v.inventoryQuantity} → 1`);
    if (v.inventoryItem?.sku !== p.sku) drift.push(`sku ${v.inventoryItem?.sku || "—"} → ${p.sku}`);
    if (!v.inventoryItem?.tracked) drift.push("tracking off → on");
    if (!hit.publishedAt) drift.push("unpublished → published");
    for (const f of productDrift(hit, p)) drift.push(f);
    console.log(
      `  [${drift.length ? "REPAIR" : "ok    "}] ${p.title}` +
        (drift.length ? `  ${drift.join(", ")}` : ""),
    );
  }
}

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply to create and repair.");
  process.exit(0);
}
if (!ctx.location) {
  console.log("\n✗ No location available — cannot set inventory. Aborting.");
  process.exit(1);
}

// ── apply (create + repair) ────────────────────────────────────────────────
let created = 0;
let repaired = 0;
let failed = 0;

for (const p of VINTAGE_PRODUCTS) {
  let product = existing.get(p.handle);
  let variant;

  if (!product) {
    const res = await graphql(CREATE, {
      product: {
        title: p.title,
        handle: p.handle,
        descriptionHtml: p.descriptionHtml,
        vendor: vendorFor(p),
        productType: p.productType,
        tags: p.tags,
        status: "ACTIVE",
        seo: { title: p.seoTitle, description: p.seoDescription },
      },
      media: p.images.map((img) => ({
        originalSource: img.src,
        alt: img.alt,
        mediaContentType: "IMAGE",
      })),
    });
    const errs = res.productCreate.userErrors;
    if (errs?.length) {
      console.log(`  ✗ ${p.title}: ${errs.map((e) => `${(e.field ?? []).join(".")} ${e.message}`).join("; ")}`);
      failed++;
      continue;
    }
    product = res.productCreate.product;
    variant = product.variants.nodes[0];
    console.log(`  + created ${p.title}`);
    created++;
  } else {
    variant = product.variants.nodes[0];
    console.log(`  · ${p.title} (exists)`);
  }

  // price + tracking (inventory quantities cannot be set here on an existing variant)
  const vres = await graphql(UPDATE_VARIANT, {
    productId: product.id,
    variants: [
      {
        id: variant.id,
        price: p.price,
        inventoryPolicy: "DENY",
        inventoryItem: { tracked: true, requiresShipping: true, sku: p.sku },
      },
    ],
  });
  const verrs = vres.productVariantsBulkUpdate.userErrors;
  if (verrs?.length) {
    console.log(`    ! variant: ${verrs.map((e) => e.message).join("; ")}`);
    failed++;
    continue;
  }

  // Quantity 1. inventorySetQuantities sets the absolute available count, but it
  // only works once the item is stocked at the location. If it is not yet
  // stocked, fall back to inventoryActivate, which stocks it and seeds the count.
  const sres = await graphql(SET_QTY, {
    input: {
      name: "available",
      reason: "correction",
      ignoreCompareQuantity: true,
      quantities: [
        { inventoryItemId: variant.inventoryItem.id, locationId: ctx.location.id, quantity: 1 },
      ],
    },
  });
  const serrs = sres.inventorySetQuantities.userErrors;
  if (serrs?.length) {
    console.log(`    · setQuantities: ${serrs.map((e) => `${(e.field ?? []).join(".")} ${e.message}`).join("; ")}`);
    const ares = await graphql(ACTIVATE, {
      inventoryItemId: variant.inventoryItem.id,
      locationId: ctx.location.id,
      available: 1,
    });
    const aerrs = ares.inventoryActivate.userErrors;
    if (aerrs?.length) {
      console.log(`    ! inventory: ${aerrs.map((e) => e.message).join("; ")}`);
    }
  }

  // Product-level fields — title, vendor, tags, SEO. Re-applied on every run so
  // drift is repaired. Most importantly the VENDOR: Shopify silently rewrites an
  // empty vendor to the shop name, which would imply HECCA made the piece.
  if (existing.has(p.handle)) {
    const pdrift = productDrift(product, p);
    if (pdrift.length) {
      const ures = await graphql(PRODUCT_UPDATE, {
        product: {
          id: product.id,
          title: p.title,
          vendor: vendorFor(p),
          productType: p.productType,
          tags: p.tags,
          seo: { title: p.seoTitle, description: p.seoDescription },
        },
      });
      const uerrs = ures.productUpdate.userErrors;
      if (uerrs?.length) {
        console.log(`    ! product: ${uerrs.map((e) => e.message).join("; ")}`);
      } else {
        console.log(`    ↻ product: ${pdrift.join(", ")}`);
      }
    }
  }

  if (ctx.online) {
    const pres = await graphql(PUBLISH, { id: product.id, input: [{ publicationId: ctx.online.id }] });
    const perrs = pres.publishablePublish.userErrors;
    if (perrs?.length) console.log(`    ! publish: ${perrs.map((e) => e.message).join("; ")}`);
  }

  if (!existing.has(p.handle)) { /* already counted as created */ } else repaired++;
}

console.log(`\nCreated ${created} · repaired ${repaired} · failed ${failed}`);
console.log("Inspect with: node scripts/products.mjs --verify");
