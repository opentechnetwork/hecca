# HECCA Shopify Store — Project Recap

Comprehensive record of everything built so far. Last updated: 2026-10-31.

## Store
- **Store:** hecca-nmec6dmd.myshopify.com ("HECCA Shop")
- **Owner:** Heather
- **Storefront password:** `hecca`
- **Live theme:** test-data (Dawn-based, t/3 on CDN)
- **Themes on store:** test-data (MAIN), Dawn, Updated copy of Dawn, Horizon, debut-vintage-theme (unpublished)
- **Token scopes:** read_analytics, read_locations, write_content, write_inventory, write_products, write_publications, write_themes

## Phase 1 — Store backend & data
- Auth via client-credentials grant (`scripts/shopify.mjs`).
- 35 collections live; demo data purged.
- 88 products: 3 published vintage + 47 Mercari drafts + 38 Depay drafts.
- Imported marketplace stock stays DRAFT, vendor "Unbranded".
- Taxonomy: categories Jewelry, Apparel, Accessories, Home Decor, Vintage, Beauty + lines FEMME/HOMME/WILD/AURA (`data/taxonomy.mjs`).
- Rule: only add products to collections that already exist; never reuse marketplace copy; never invent provenance/era/condition.

## Phase 2 — Brand & theme CSS
- Palette: Hybrid Gold `#D4A64A`, Deep Plum `#5C2D5C`, Emerald `#1F5F4A`. Blues removed.
- Logo v2: gold wordmark + plum halo glow.
- CSS ships as `assets/hecca.css` + one marker'd `<link>` block after `base.css` in `layout/theme.liquid` (markers `{%- comment -%} hecca:css`).
- App cannot write theme files (`themeFilesUpsert` ACCESS_DENIED) → manual upload; `scripts/theme-css.mjs` prints steps.
- Heading fixes, paragraphs/h3/h4 inherit colour, small print opacity, dark-forcing block left commented (page colour owned by theme colour schemes).
- Shadow tokens `--hecca-card-shadow` / `--hecca-card-shadow-hover`. Final form: shadow + padding on `.card__media`/`.media` (12px inset, `--hecca-ink` bg, 2px radius), image geometry `!important`, `.card`/`.card-wrapper` get `box-shadow: none`.
- User's 25px L/R card text padding stays independent of `hecca.css`.
- Hairline dividers: `::before`/`::after` on `.shopify-section`, inset to content width (1.5rem / 5rem @750px+).
- ATC button gold styling + collection page cleanup (commit `b7177ca`).

## Phase 3 — Collection plates
- `logos/hecca-glyphs.mjs` glyphs; `scripts/build-collection-images.mjs` → 35 SVG + 2048px PNGs.
- Variant "b": black field, faint halo, hairline gold frame, crest, Cormorant name, Montserrat label. Subcollections inherit parent field colour + print parent name as label.
- Escaped `&` in aria-label ("Mats & Rugs").
- All 35 collection images uploaded via staged upload + `collectionUpdate`, SHA-256 manifest in `reports/collection-images.json` (git-ignored).
- Dawn collection-list defaults to square ratio (plates not cropped).

## Phase 4 — Theme install & verification
- `hecca-shop/theme/README.md` documents install/update + recovery.
- Heather installed manually; verified live (hecca.css loads from CDN, h1 Cormorant gold caps, body Montserrat).
- Card shadow rework image-only (`c9a74f2`); dividers (`63f2147`, `98d1b7e`); ATC + cleanup (`b7177ca`) verified via injected preview then uploaded.
- Heather added collections to nav; discovered collections list page (`/collections`).
- Live CSS history: image-inset shadows + dividers + typography working; ATC + collection cleanup live after re-upload.

## Phase 5 — Homepage hero
- Custom Liquid section with full-width `<video>` + overlay + "HECCA / Hybrid By Design" + gold CTA.
- `hero-poster.jpg` generated (champagne field, gold H crest, hairline frame) — currently the full (H + frame) version; halo-only simplification was discussed but not applied.
- Video sourced from Pixabay (Matthias Groeneveld) → uploaded to Shopify media CDN (hashed URL).
- Poster also routed to Shopify media CDN (hashed URL).
- Overlay iterations: original gradient → radial+text-shadow → final flat `rgba(15,15,15,0.5)` (chosen for simplicity). Text set black with bold weights; "HECCA" label set to half the title size (clamp 32–40px).
- Subtext rewritten to hybrid description: "Jewelry, apparel, accessories, and home — curated for the way you actually live. Hybrid by design, worn as statements."
- Hero CSS recorded in `hecca.css` (commit `d6d5c20`).
- Footer credit line for the video (Option A) offered but not confirmed placed.

## Phase 6 — Homepage plan & SEO/AEO content blocks
- 8-section homepage plan saved to `hecca-shop/docs/homepage-plan.md`.
- Brand intro + FAQ Custom Liquid blocks with FAQPage JSON-LD schema.
- Native-section guidance (collection list, featured collection, image with text).
- Cleanup list for Dawn demo sections.
- AEO/SEO rationale documented.

## Phase 7 — Handles pipeline
- `scripts/handles.mjs` built and tested (commit `0e02298`).
- 88 products scanned, 20 out of sync, 0 collisions.
- Modes: default dry run, `--apply` (rename + 301 redirects), `--verify`.
- Idempotent; multi-pass rename for chain collisions; redirects skip if already exist.
- Report: `reports/handles.json` (git-ignored).
- Ready to run when product titles are finalized.

## Pending decisions
- Page colour scheme: dark `#0F0F0F`/`#F7F7F7`/`#D4A64A` vs light + `--hecca-gold-low` accent.
- Homepage demo content still needs replacing (see homepage plan).
- `hecca.html` stale copy: Electric/Sky Blue in palette section, "The Standard of Hybrid Luxury" closing line, "Made by Copilot" footer.
- `layout/password.liquid` should get the same `<link>` if password page should be styled.
- Rotate Shopify client secret (exposed earlier).
- Meta titles/descriptions pipeline (planned, not built).
- Plum/emerald hex values pending Heather's sign-off (`#5C2D5C` / `#1F5F4A`).
- Footer credit line for Matthias Groeneveld (Pixabay video).
- Halo-only poster simplification (empty ring vs. bare field) — undecided.

## Key files
- `hecca-shop/theme/hecca.css` — source-of-truth storefront stylesheet
- `hecca-shop/theme/README.md` — install/update walkthrough
- `hecca-shop/scripts/shopify.mjs` — API client
- `hecca-shop/scripts/theme-css.mjs` — theme CSS plan/insert (prints manual steps)
- `hecca-shop/scripts/collection-images.mjs` — collection image uploads
- `hecca-shop/scripts/handles.mjs` — product handle sync
- `hecca-shop/scripts/products.mjs` — product import/repair
- `hecca-shop/data/taxonomy.mjs` — 35-collection source of truth
- `hecca-shop/docs/homepage-plan.md` — homepage section plan + content blocks
- `logos/hecca-glyphs.mjs`, `logos/hecca-paths.mjs` — glyph outlines + monogram
- `scripts/build-collection-images.mjs` — generates all 35 plates
- `hecca.html` — brand guide (has stale copy)
- `reports/collection-images.json`, `reports/handles.json` — git-ignored manifests

## Git
- Root: `C:\Users\David\OneDrive\Documents\hecca\`, branch main.
- Commit messages go via `git commit -F <file>` (PowerShell corrupts inline quotes).
- Latest commits: `48056fc` (docs), `0e02298` (handles), `dcd2b35` (homepage plan), `d6d5c20` (hero CSS), `f3adaef` (poster fix), `eacfe59` (poster).

## How to reference
In any future session, say "read the project recap" (this file) or "read the homepage plan" (`hecca-shop/docs/homepage-plan.md`).
