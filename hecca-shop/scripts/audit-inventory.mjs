// Read-only inventory & catalog health audit.
// Reads data/catalog.json (run fetch-catalog.mjs first), writes reports/inventory-audit.md
// Usage:
//   node scripts/audit-inventory.mjs
//   node scripts/audit-inventory.mjs --low 10
//   node scripts/audit-inventory.mjs --in fixtures/catalog.fixture.json   # test fixture
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const argOf = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const inArg = argOf("--in", null);
const dataFile = inArg
  ? (isAbsolute(inArg) ? inArg : join(process.cwd(), inArg))
  : join(here, "..", "data", "catalog.json");
const reportDir = join(here, "..", "reports");
const reportFile = join(reportDir, "inventory-audit.md");

const LOW = Number(argOf("--low", "5"));

if (!existsSync(dataFile)) {
  console.error(`Missing ${dataFile}\nRun: node scripts/fetch-catalog.mjs`);
  process.exit(1);
}

const { shop, locations, products, fetchedAt, productCountFetched } = JSON.parse(
  readFileSync(dataFile, "utf8"),
);

const variants = [];
for (const p of products) {
  for (const v of p.variants.nodes) variants.push({ ...v, _product: p });
}

const available = (v) => {
  const levels = v.inventoryItem?.inventoryLevels?.nodes ?? [];
  return levels.reduce(
    (sum, l) => sum + (l.quantities.find((q) => q.name === "available")?.quantity ?? 0),
    0,
  );
};

// ── Stock ──────────────────────────────────────────────────────────────────
const tracked = variants.filter((v) => v.inventoryItem?.tracked);
const untracked = variants.filter((v) => !v.inventoryItem?.tracked);
const oos = tracked.filter((v) => available(v) <= 0);
const low = tracked.filter((v) => available(v) > 0 && available(v) <= LOW);
const negative = tracked.filter((v) => available(v) < 0);
const oversell = variants.filter((v) => v.inventoryPolicy === "CONTINUE");
const totalUnits = tracked.reduce((n, v) => n + Math.max(0, available(v)), 0);

const productsAllOos = products.filter((p) => {
  const tv = p.variants.nodes.filter((v) => v.inventoryItem?.tracked);
  return tv.length > 0 && tv.every((v) => available(v) <= 0);
});

// ── Data quality ───────────────────────────────────────────────────────────
const noSku = variants.filter((v) => !v.sku?.trim());
const skuMap = new Map();
for (const v of variants) {
  const k = v.sku?.trim();
  if (!k) continue;
  if (!skuMap.has(k)) skuMap.set(k, []);
  skuMap.get(k).push(v);
}
const dupSkus = [...skuMap.entries()].filter(([, list]) => list.length > 1);
const noBarcode = variants.filter((v) => !v.barcode?.trim());
const badPrice = variants.filter((v) => !v.price || Number(v.price) <= 0);
const badCompareAt = variants.filter(
  (v) => v.compareAtPrice && Number(v.compareAtPrice) <= Number(v.price),
);
const noImage = products.filter(
  (p) => !p.featuredImage && !p.variants.nodes.some((v) => v.image),
);

// ── SEO ────────────────────────────────────────────────────────────────────
const noSeoTitle = products.filter((p) => !p.seo?.title?.trim());
const noSeoDesc = products.filter((p) => !p.seo?.description?.trim());
const longSeoTitle = products.filter((p) => (p.seo?.title?.trim().length ?? 0) > 60);
const longSeoDesc = products.filter((p) => (p.seo?.description?.trim().length ?? 0) > 160);

// ── Status / publishing ────────────────────────────────────────────────────
const byStatus = { ACTIVE: 0, DRAFT: 0, ARCHIVED: 0 };
for (const p of products) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
const unpublished = products.filter((p) => !p.publishedAt);

// ── Variants per product ───────────────────────────────────────────────────
const variantCounts = products.map((p) => p.variants.nodes.length);
const singleVariant = variantCounts.filter((n) => n === 1).length;
const multiVariant = variantCounts.filter((n) => n > 1).length;

const list = (arr, fmt) => (arr.length ? arr.map((x) => `- ${fmt(x)}`).join("\n") : "_none_");
const h = (n) => `\n## ${n}\n`;

const md = `# HECCA — Inventory & Catalog Audit

**Store:** ${shop?.name} (\`${shop?.myshopifyDomain}\`) · ${shop?.currencyCode}
**Fetched:** ${fetchedAt}
**Scope:** ${productCountFetched} products · ${variants.length} variants · ${locations.length} location(s)
**Low-stock threshold:** ≤ ${LOW} units

## Locations

| Location | Active | Fulfills online |
| --- | --- | --- |
${locations.map((l) => `| ${l.name} | ${l.isActive} | ${l.fulfillsOnlineOrders} |`).join("\n")}
${h("Stock position")}
| Metric | Value |
| --- | --- |
| Total available units | ${totalUnits} |
| Variants tracked | ${tracked.length} |
| Variants **not** tracked | ${untracked.length} |
| Out of stock (≤ 0) | ${oos.length} |
| Low stock (1–${LOW}) | ${low.length} |
| Negative available | ${negative.length} |
| Products fully out of stock | ${productsAllOos.length} |
| Allow overselling (policy CONTINUE) | ${oversell.length} |
${h(`Out of stock (${oos.length})`)}
${list(oos, (v) => `${v._product.title} — ${v.title}${v.sku ? ` (${v.sku})` : ""}`)}
${h(`Low stock, ≤ ${LOW} (${low.length})`)}
${list(low, (v) => `${v._product.title} — ${v.title} · ${available(v)} left${v.sku ? ` (${v.sku})` : ""}`)}
${h(`Negative stock (${negative.length})`)}
${list(negative, (v) => `${v._product.title} — ${v.title} · ${available(v)}`)}
${h("Product status")}
| Status | Count |
| --- | --- |
| Active | ${byStatus.ACTIVE ?? 0} |
| Draft | ${byStatus.DRAFT ?? 0} |
| Archived | ${byStatus.ARCHIVED ?? 0} |
| Not published | ${unpublished.length} |

Variant structure: **${singleVariant}** single-variant, **${multiVariant}** multi-variant
${h("Data quality")}
| Issue | Count |
| --- | --- |
| Missing SKU | ${noSku.length} |
| Duplicate SKU | ${dupSkus.length} |
| Missing barcode | ${noBarcode.length} |
| Missing / zero price | ${badPrice.length} |
| compareAtPrice ≤ price | ${badCompareAt.length} |
| No product or variant image | ${noImage.length} |
| Variants not inventory-tracked | ${untracked.length} |
${h(`Duplicate SKUs (${dupSkus.length})`)}
${list(dupSkus, ([sku, list_]) => `\`${sku}\` → ${list_.map((v) => v._product.title).join(" | ")}`)}
${h(`Missing price (${badPrice.length})`)}
${list(badPrice, (v) => `${v._product.title} — ${v.title}`)}
${h(`Bad compare-at price (${badCompareAt.length})`)}
${list(badCompareAt, (v) => `${v._product.title} — ${v.title} · price ${v.price}, compareAt ${v.compareAtPrice}`)}
${h(`No image (${noImage.length})`)}
${list(noImage, (p) => `${p.title} (${p.handle})`)}
${h("SEO fields (catalog)")}
| Issue | Count |
| --- | --- |
| Missing SEO title | ${noSeoTitle.length} |
| Missing SEO description | ${noSeoDesc.length} |
| SEO title > 60 chars | ${longSeoTitle.length} |
| SEO description > 160 chars | ${longSeoDesc.length} |
${h(`Missing SEO title (${noSeoTitle.length})`)}
${list(noSeoTitle, (p) => `${p.title} (${p.handle})`)}
${h(`Missing SEO description (${noSeoDesc.length})`)}
${list(noSeoDesc, (p) => `${p.title} (${p.handle})`)}

---
_Read-only audit. No changes were made to the store._
`;

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportFile, md);

console.log(`Store: ${shop?.name} — ${productCountFetched} products, ${variants.length} variants, ${locations.length} location(s)\n`);
console.log(`Total available units : ${totalUnits}`);
console.log(`Tracked / untracked   : ${tracked.length} / ${untracked.length}`);
console.log(`Out of stock          : ${oos.length}`);
console.log(`Low stock (<= ${LOW})      : ${low.length}`);
console.log(`Negative stock        : ${negative.length}`);
console.log(`Products fully OOS    : ${productsAllOos.length}`);
console.log("");
console.log(`Missing SKU           : ${noSku.length}`);
console.log(`Duplicate SKU         : ${dupSkus.length}`);
console.log(`Missing price         : ${badPrice.length}`);
console.log(`Bad compare-at        : ${badCompareAt.length}`);
console.log(`No image              : ${noImage.length}`);
console.log(`Missing SEO title     : ${noSeoTitle.length}`);
console.log(`Missing SEO desc      : ${noSeoDesc.length}`);
console.log(`Not published         : ${unpublished.length}`);
console.log(`\nReport: ${reportFile}`);
