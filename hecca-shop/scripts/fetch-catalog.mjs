// Fetch the full product catalog + inventory into data/catalog.json.
// Read-only. Run: node scripts/fetch-catalog.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { graphql, config } from "./shopify.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "data");
const outFile = join(outDir, "catalog.json");

const PRODUCTS = `
query Catalog($cursor: String) {
  shop { name myshopifyDomain currencyCode ianaTimezone plan { displayName } }
  locations(first: 10) { nodes { id name isActive fulfillsOnlineOrders } }
  productsCount { count }
  products(first: 25, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      legacyResourceId
      title
      handle
      status
      vendor
      productType
      tags
      totalInventory
      createdAt
      updatedAt
      publishedAt
      seo { title description }
      featuredImage { url }
      variants(first: 25) {
        pageInfo { hasNextPage }
        nodes {
          id
          legacyResourceId
          title
          sku
          barcode
          price
          compareAtPrice
          position
          inventoryPolicy
          selectedOptions { name value }
          image { url }
          inventoryItem {
            id
            tracked
            unitCost { amount }
            inventoryLevels(first: 5) {
              nodes {
                id
                location { id name }
                quantities(names: ["available", "committed", "incoming"]) { name quantity }
              }
            }
          }
        }
      }
    }
  }
}`;

const { host } = config();
console.log(`Fetching catalog from ${host} ...`);

const products = [];
let cursor = null;
let page = 0;
let shop = null;
let locations = [];
let productsCount = 0;

while (true) {
  const data = await graphql(PRODUCTS, { cursor });
  page++;
  if (page === 1) {
    shop = data.shop;
    locations = data.locations.nodes;
    productsCount = data.productsCount.count;
    console.log(`Shop: ${shop.name} (${shop.currencyCode})`);
    console.log(`Locations: ${locations.map((l) => l.name).join(", ") || "(none)"}`);
    console.log(`productsCount reports: ${productsCount}`);
  }
  for (const p of data.products.nodes) products.push(p);
  process.stdout.write(`  page ${page}: +${data.products.nodes.length} (total ${products.length})\n`);
  if (!data.products.pageInfo.hasNextPage) break;
  cursor = data.products.pageInfo.endCursor;
}

const truncation = products.filter((p) => p.variants.pageInfo.hasNextPage);
if (truncation.length) {
  console.warn(
    `\n⚠ ${truncation.length} product(s) have more than 25 variants; variants were truncated:\n` +
      truncation.map((p) => `   - ${p.title}`).join("\n"),
  );
}

mkdirSync(outDir, { recursive: true });
const payload = {
  fetchedAt: new Date().toISOString(),
  apiVersion: config().version,
  shop,
  locations,
  productsCount,
  productCountFetched: products.length,
  products,
};
writeFileSync(outFile, JSON.stringify(payload, null, 2));

console.log(`\nWrote ${outFile}`);
console.log(`Fetched ${products.length} products, ${products.reduce((n, p) => n + p.variants.nodes.length, 0)} variants.`);
