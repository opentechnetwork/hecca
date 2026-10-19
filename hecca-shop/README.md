# hecca-shop

Working folder for the Shopify store **hecca-nmec6dmd.myshopify.com**.

Completely separate from the `family-law-results` Next.js project — nothing here is
imported by that site. This is a standalone tooling/audit space for the Shopify store.

## Setup

Shopify retired admin-created custom apps on **1 Jan 2026**. There is no longer an
`shpat_` token shown in the UI. Apps are now created in the **Dev Dashboard** and
authenticate with the **OAuth client credentials grant**.

1. Open the [Dev Dashboard](https://dev.shopify.com/dashboard/) → **Apps** → your app.
2. **Versions** → set the Admin API scopes and click **Release**:

   ```
   write_products
   write_inventory
   read_locations
   write_publications
   write_content
   write_themes
   read_analytics
   write_online_store_navigation
   ```

   A `write_` scope implies its `read_` counterpart, so there is no need to
   declare `read_products`, `read_inventory`, etc. alongside them.

   `write_online_store_navigation` is required to build the navigation menus
   (`menuCreate` / `menuUpdate`). Without it the collections exist but cannot be
   placed into a dropdown, and the `menus` query returns `ACCESS_DENIED`.

3. **Install app** on `hecca-nmec6dmd` (the OAuth flow opens in a new tab).
4. **Settings → Credentials** → copy the **Client ID** and **Client secret**.
5. Put them in `.env`:

   ```
   SHOPIFY_STORE=hecca-nmec6dmd.myshopify.com
   SHOPIFY_API_VERSION=2025-07
   SHOPIFY_CLIENT_ID=...
   SHOPIFY_CLIENT_SECRET=...
   ```

The `.env` file is git-ignored. Do not commit it or paste the values into chat.

`scripts/shopify.mjs` exchanges those credentials for a 24-hour access token on
demand, caches it, and refreshes it 60 seconds before expiry. There is nothing to
manually renew.

> **Not needed:** the **App Automation Token** button in the Dev Dashboard. That
> authenticates the **Shopify CLI** in CI/CD (`SHOPIFY_APP_AUTOMATION_TOKEN`) and
> cannot be used for Admin API requests.

### `shop_not_permitted` error

The client credentials grant only works when the app **and** the store are in the
**same Shopify organization**. Verify in the Dev Dashboard that the store appears
under **Dev stores**. A store created from the Shopify admin (rather than the Dev
Dashboard) won't be in the org and needs a different grant.


## Plan

1. Inventory audit (read-only): stock by location, low/out-of-stock, variant/SKU health.
2. SEO audit: meta titles/descriptions/H1s, schema, sitemap, canonicals, collections.
3. AEO pass: FAQ/Product schema gaps, `llms.txt`, answer-shaped content.
4. Theme fixes: clone live theme to a duplicate before editing production.
5. Bulk inventory fixes: applied in batches after approval.

No writes to the store happen until the specific change is approved.

## Agreed build route

- **Theme work:** Shopify CLI + git (duplicate the live theme first — ClickUp task D1)
- **First workstream:** products & inventory (ClickUp tasks D13–D15)
- **Tooling installed:** Shopify CLI `4.9.4` via npm
  (note: npm 12 blocks install scripts by default; esbuild needed
  `npm install -g --allow-scripts=esbuild @shopify/cli@latest`)

## Commands

```sh
node scripts/ping.mjs                                   # verify token, show locations/channels/themes
node scripts/fetch-catalog.mjs                          # pull full catalog -> data/catalog.json (read-only)
node scripts/audit-inventory.mjs                        # inventory & catalog health -> reports/inventory-audit.md
node scripts/audit-inventory.mjs --low 10               # custom low-stock threshold
node scripts/audit-inventory.mjs --in fixtures/catalog.fixture.json   # run against the test fixture

node scripts/collections.mjs                            # plan collection changes (no writes)
node scripts/collections.mjs --apply                    # create / re-rule collections + publish
node scripts/collections.mjs --verify                   # live collections with product counts

node scripts/products.mjs                               # plan product changes (no writes)
node scripts/products.mjs --apply                       # create + repair products
node scripts/products.mjs --verify                      # live product state (price/qty/images/SEO)

node scripts/navigation.mjs                             # plan the storefront menu (no writes)
node scripts/navigation.mjs --apply                     # create / update the main-menu
node scripts/navigation.mjs --verify                    # dump the live menu tree

node scripts/purge-demo.mjs                             # plan demo-data deletion (no writes)
node scripts/purge-demo.mjs --apply                     # permanently delete demo products/collections

node scripts/schema.mjs productCreate                   # print a mutation's exact signature
node scripts/schema.mjs --input ProductCreateInput      # print an input type's fields
```

`collections.mjs`, `products.mjs` and `navigation.mjs` are **read-only by default** and
idempotent: they match on handle, create what is missing, and repair what has drifted.
Re-running `--apply` never duplicates anything.

`schema.mjs` reads signatures from the live schema, which matters because Shopify's
docs and its actual API disagree in several places (see API notes).

The audit is read-only and writes nothing to Shopify. `fixtures/catalog.fixture.json` is a
synthetic catalog with known defects, used to verify the analysis logic without store access.

## API notes

- Use the **GraphQL Admin API** for products/collections/variants — Shopify deprecated
  the REST product endpoints.
- `read_themes`/`write_themes` lets us read and write Liquid, CSS, JS, and JSON templates
  through the Asset API without the CLI, if a quick fix is ever needed.
- Shopify ships JSON-LD for products already; customisation happens in the theme.
- GA4 / Meta pixel go through **Customer Events** custom pixels, not theme scripts.
- Cookie consent can use Shopify's built-in GDPR banner (Privacy & compliance).

### Gotchas that cost us time

These are all live-schema behaviours that the public docs get wrong or omit. Check
`node scripts/schema.mjs` before believing the documentation.

- **`tag contains` does not exist.** On a smart-collection rule, the `TAG` column only
  supports exact `EQUALS`. Prefix matching is impossible, so a parent collection cannot
  be built from a tag prefix. Parents are instead the **disjunctive union of their
  children's tags** (`appliedDisjunctively: true`, one `EQUALS` rule per child).
  `collections.mjs` generates this from the taxonomy automatically.
- **Collections are flat.** There is no native nesting. Visible hierarchy lives in the
  navigation menu; URL hierarchy lives in the handle prefix (`jewelry`, `jewelry-rings`).
- **New collections are unpublished.** They must be pushed to the Online Store
  publication with `publishablePublish`, or they never appear on the storefront.
- **`productCreate` takes `product:`, not `input:`.** Renamed in 2024-04, and images go
  in a separate `media: [CreateMediaInput!]` argument. Shopify downloads each
  `originalSource` URL and re-hosts it, so external image URLs do not need to be
  pre-uploaded — but they must stay reachable long enough for Shopify to fetch them.
- **Inventory quantities cannot be set in `productVariantsBulkUpdate`** on an existing
  variant ("can only be provided during create"). Use `inventorySetQuantities`.
- **`inventoryActivate` cannot set a quantity on an already-active item.** It stocks the
  item; `inventorySetQuantities` sets the count.
- **`InventorySetQuantitiesInput.ignoreCompareQuantity` is required but hidden.** It is
  marked deprecated, so `includeDeprecated: false` — and the public docs — omit it. Without
  it every call fails with `compareQuantity argument must be given`.
- **Cost limits are real.** `fetch-catalog.mjs` page sizes are load-bearing; a query over
  the 1000-point cost budget fails with `MAX_COST_EXCEEDED`.

## Collections & tagging model

Source of truth: **`data/taxonomy.mjs`**. Run `collections.mjs --apply` to sync it.

Two independent axes, and **one namespaced tag per axis per product**:

| Axis | Tag shape | Example |
|---|---|---|
| Category | `category:subcategory` | `jewelry:rings` |
| Vintage | `vintage:category` | `vintage:accessories` |
| Brand line | `line:name` | `line:wild` |

A vintage homme shirt carries exactly three tags — `apparel:shirts`, `vintage:apparel`,
`line:homme` — and surfaces in four collections with nothing maintained by hand.

**Vintage is cross-cutting, not exclusive.** A vintage ring is both *Jewelry › Rings* and
*Vintage › Vintage Jewelry*.

`data/taxonomy.mjs` holds a `deferred` array per category. We started with two
subcollections each; promoting one is a one-line move from `deferred` into `children`,
then re-run `collections.mjs --apply`. The script detects that an existing parent's rules
have drifted and updates it.

## Vintage archive import

`data/vintage-products.mjs` holds curated archive pieces. Provenance:
`data/mercari-vintage.json` (candidates + verdicts) and `data/mercari-listings.json`
(raw profile capture of the HCSYLVAN Mercari account).

Curating that account yields very little for a luxury store: it is predominantly
mainstream resale (SHEIN, Nike, mall brands) and used cosmetics. Only genuine
archive pieces with a real label or era are imported.

**Rules for imported copy:**
- Never reuse the seller's description. Harvest the facts, write the copy in HECCA voice.
- Never invent provenance, era, or condition. Every claim must trace to the source listing.
- Designer names appear as the **vendor** and as *"Vintage «Designer»"* in the title, so the
  piece sits clearly in an archive context and never implies HECCA manufactured it.

Vintage stock is one-of-a-kind: quantity is always 1, and `inventoryPolicy: DENY` so a sold
piece reads as out of stock rather than silently overselling.

SKUs use a sequential archive scheme — `HECCA-VIN-0001`, `HECCA-VIN-0002`, … — so each
one-off piece is identifiable in the Shopify admin **Inventory** view. A SKU is required
for a stock row to be workable; without one the item appears but cannot be reconciled.
`products.mjs` treats a missing or wrong SKU as drift and repairs it on `--apply`.

## Removing demo data

`purge-demo.mjs` clears out Shopify's demo dataset (snowboards, ski wax, a gift
card, and their template collections).

It is a **whitelist** purge: everything is deleted unless it is defined in
`data/vintage-products.mjs` (products) or `data/taxonomy.mjs` (collections). Add a
real product or collection to those files and it is protected automatically — there
is no exclusion list to maintain. It refuses to run if either protected set comes
back empty, so a broken import can never turn into a wiped store.

Deletion is permanent, so the script is a dry run unless `--apply` is passed.

## Store state

Verified live (see `collections.mjs --verify` and `products.mjs --verify`):

- **20 collections** — 5 category parents + 11 subcollections + 4 brand lines, all
  published to the Online Store.
- **2 archive products**, ACTIVE, published, quantity 1, tracked, SKUs assigned, all
  12 images re-hosted on Shopify's own CDN (Mercari is not a runtime dependency):
  - Vintage Christian Lacroix Crossbody — $55.00 · `HECCA-VIN-0001`
  - Vintage Esprit 90s Wallet Purse — $48.00 · `HECCA-VIN-0002`
- **Demo data removed.** The store shipped with Shopify's snowboard test catalog
  (17 products, 3 collections). `purge-demo.mjs` deleted all of it, so the catalog
  is now exclusively HECCA. The inventory audit reports **zero** missing SKUs,
  prices, images, or SEO fields.

Blocked / outstanding:

- **Navigation menu** — needs `write_online_store_navigation` on the app version.
  `navigation.mjs` is written and its query shape is validated; it will run the
  moment the scope is granted.
- **Collection page bodies** — the taxonomy carries descriptions but they are only
  written to the collection `descriptionHtml` on create, not on update.
- **Store is a dev store** on *Basic App Development*. It cannot be opened publicly
  until it is moved to a paid plan.
- **Product copy has not been reviewed by the owner** and is currently published.
- Mercari sweep is partial: 50 of the 118 reported listings were captured.
- **Rotate the app client secret** — the previous one was exposed in plain text.

### Growth path (not yet needed)

The store is pinned to **API `2025-07`**. The newer `sources` / `subCollections`
taxonomy model that landed in later API versions is unavailable here, which is why
children are linked by handle prefix and rules rather than by native nesting.
Upgrading the API version is the path to native subcollections when the catalog
grows large enough to justify it.
