# HECCA Homepage — Section Plan

Source of truth for the storefront homepage build. Last updated: 2026-10-26.

## Final homepage section order (8 sections)

1. **Video hero** — Custom Liquid (done). Video + poster on Shopify CDN; flat overlay `rgba(15,15,15,0.5)`.
2. **Brand intro** — Custom Liquid (Section A below). Answer-first "what is HECCA".
3. **Collection list** — native Dawn "Collection list" section, 4 brand lines: FEMME, HOMME, WILD, AURA.
4. **Category grid** — native Dawn "Collection list" section, all 6 categories: Jewelry, Apparel, Accessories, Home Decor, Vintage, Beauty. Reuses existing collection plates.
5. **Featured collection grid** — native Dawn "Featured collection" section, pointed at bestsellers/new arrivals, 4 columns.
6. **Editorial block** — native Dawn "Image with text" section, buying-guide copy + link.
7. **FAQ** — Custom Liquid (Section B below) with FAQPage JSON-LD schema.
8. **Newsletter** — native, keep, fix copy.

Plus header (announcement bar + nav) and footer (quick links, social, credit line).

## Sections to remove from current homepage (Dawn demo content)

- "Stay hydrated" (beverage-themed demo)
- "Row" (multicolumn demo)
- empty section
- Contact form → move to `/pages/contact`
- "Crystal Haze Serena Hoop Earrings" featured product → replace with featured collection grid
- "Talk about your brand" rich text → replace with Brand intro (Section A)

## SEO/AEO rationale

- Brand intro + FAQ are answer-first, keyword-rich, citable by AI engines.
- FAQ ships `FAQPage` JSON-LD for AEO.
- Category grid + collection list provide internal links to all collection pages (crawlability).
- Editorial block targets long-tail keywords (buying guides).
- Hero H1 carries primary keyword; brand intro H2 answers "what is HECCA".
- Meta titles/descriptions are separate from product titles (planned, not yet implemented — see products pipeline).

## Section A — Brand intro (Custom Liquid)

```liquid
<section class="hecca-intro">
  <div class="hecca-intro__inner">
    <p class="hecca-intro__eyebrow">HECCA</p>
    <h2 class="hecca-intro__title">Hybrid By Design</h2>
    <p class="hecca-intro__body">
      HECCA is a hybrid house of jewelry, apparel, accessories, and home —
      built for men and women who want pieces that work across every part of life.
      We curate fine and vintage jewelry, sculptural apparel, considered accessories,
      and objects for the home, chosen for craftsmanship, material, and wearability.
      Every piece is selected to be worn, used, and lived with — not saved for later.
    </p>
    <p class="hecca-intro__body">
      Shop by category — Jewelry, Apparel, Accessories, Home Decor, Vintage, Beauty —
      or by our four lines: FEMME, HOMME, WILD, and AURA. Single quantities,
      sourced and authenticated, with new pieces added as the archive grows.
    </p>
    <a href="/collections" class="hecca-intro__cta">Explore the collections</a>
  </div>
</section>
```

CSS:

```css
.hecca-intro{padding:5rem 1.5rem;background:var(--hecca-white)}
.hecca-intro__inner{max-width:720px;margin:0 auto;text-align:center}
.hecca-intro__eyebrow{font-family:var(--hecca-font-body);font-size:var(--hecca-label-size);letter-spacing:.3em;text-transform:uppercase;color:var(--hecca-gold);margin-bottom:1rem}
.hecca-intro__title{font-family:var(--hecca-font-display);font-size:var(--hecca-h2-size);letter-spacing:var(--hecca-h2-track);line-height:var(--hecca-h2-leading);text-transform:uppercase;color:var(--hecca-ink);margin-bottom:1.5rem}
.hecca-intro__body{font-family:var(--hecca-font-body);font-size:var(--hecca-body-size);line-height:var(--hecca-body-leading);color:var(--hecca-ink);margin-bottom:1.25rem;opacity:.85}
.hecca-intro__cta{display:inline-block;margin-top:.5rem;padding:12px 32px;background:var(--hecca-gold);color:var(--hecca-black);font-family:var(--hecca-font-body);font-weight:700;font-size:var(--hecca-label-size);letter-spacing:.18em;text-transform:uppercase;text-decoration:none;border-radius:2px}
```

## Section B — FAQ (Custom Liquid, with FAQPage JSON-LD)

```liquid
<section class="hecca-faq">
  <div class="hecca-faq__inner">
    <h2 class="hecca-faq__title">Frequently Asked Questions</h2>
    <div class="hecca-faq__item">
      <h3 class="hecca-faq__q">What is HECCA?</h3>
      <p class="hecca-faq__a">HECCA is a hybrid house of jewelry, apparel, accessories, and home — curating fine and vintage pieces for men and women, built to be worn, used, and lived with rather than saved.</p>
    </div>
    <div class="hecca-faq__item">
      <h3 class="hecca-faq__q">What do you sell?</h3>
      <p class="hecca-faq__a">Jewelry, apparel, accessories, home decor, vintage archive pieces, and beauty — across six categories and four lines: FEMME, HOMME, WILD, and AURA.</p>
    </div>
    <div class="hecca-faq__item">
      <h3 class="hecca-faq__q">Are the vintage pieces authentic?</h3>
      <p class="hecca-faq__a">Yes. Vintage and archive pieces are sourced and authenticated before listing, and each is a single quantity.</p>
    </div>
    <div class="hecca-faq__item">
      <h3 class="hecca-faq__q">Do you ship internationally?</h3>
      <p class="hecca-faq__a">Yes — shipping options and rates are shown at checkout for your destination.</p>
    </div>
    <div class="hecca-faq__item">
      <h3 class="hecca-faq__q">How do I care for my pieces?</h3>
      <p class="hecca-faq__a">Care guidance is included on each product page; in general, keep jewelry away from water, perfume, and harsh chemicals, and store pieces separately.</p>
    </div>
  </div>
</section>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"What is HECCA?","acceptedAnswer":{"@type":"Answer","text":"HECCA is a hybrid house of jewelry, apparel, accessories, and home — curating fine and vintage pieces for men and women, built to be worn, used, and lived with rather than saved."}},
    {"@type":"Question","name":"What do you sell?","acceptedAnswer":{"@type":"Answer","text":"Jewelry, apparel, accessories, home decor, vintage archive pieces, and beauty — across six categories and four lines: FEMME, HOMME, WILD, and AURA."}},
    {"@type":"Question","name":"Are the vintage pieces authentic?","acceptedAnswer":{"@type":"Answer","text":"Yes. Vintage and archive pieces are sourced and authenticated before listing, and each is a single quantity."}},
    {"@type":"Question","name":"Do you ship internationally?","acceptedAnswer":{"@type":"Answer","text":"Yes — shipping options and rates are shown at checkout for your destination."}},
    {"@type":"Question","name":"How do I care for my pieces?","acceptedAnswer":{"@type":"Answer","text":"Care guidance is included on each product page; in general, keep jewelry away from water, perfume, and harsh chemicals, and store pieces separately."}}
  ]
}
</script>
```

CSS:

```css
.hecca-faq{padding:5rem 1.5rem;background:var(--hecca-beige)}
.hecca-faq__inner{max-width:760px;margin:0 auto}
.hecca-faq__title{font-family:var(--hecca-font-display);font-size:var(--hecca-h2-size);letter-spacing:var(--hecca-h2-track);text-transform:uppercase;color:var(--hecca-ink);margin-bottom:2rem;text-align:center}
.hecca-faq__item{margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--hecca-line)}
.hecca-faq__item:last-child{border-bottom:none}
.hecca-faq__q{font-family:var(--hecca-font-display);font-size:var(--hecca-h4-size);color:var(--hecca-plum);margin-bottom:.5rem}
.hecca-faq__a{font-family:var(--hecca-font-body);font-size:var(--hecca-body-size);line-height:var(--hecca-body-leading);color:var(--hecca-ink);opacity:.85}
```

## Hero reference (current)

- Custom Liquid section with video + poster on Shopify CDN.
- Video: `https://cdn.shopify.com/videos/c/o/v/0f83b6b5885c4611bdf611803b0c1d1f.mp4`
- Poster: `https://cdn.shopify.com/s/files/1/1006/7001/3720/files/hero-poster.jpg?v=1793023810`
- Hero CSS recorded in `hecca-shop/theme/hecca.css` (commit d6d5c20) — flat `rgba(15,15,15,0.5)` overlay.

## Pending decisions

- Page colour scheme: dark `#0F0F0F`/`#F7F7F7`/`#D4A64A` vs light + `--hecca-gold-low` accent.
- Homepage demo content still needs replacing (see section list above).
- `hecca.html` stale copy: Electric/Sky Blue in palette section, "The Standard of Hybrid Luxury" closing line, "Made by Copilot" footer.
- `layout/password.liquid` should get the same `<link>` if password page should be styled.
- Rotate Shopify client secret (exposed in chat earlier).
- Meta titles/descriptions pipeline (planned, not built).
- Plum/emerald hex values pending Heather's sign-off (currently `#5C2D5C` / `#1F5F4A`).
- Footer credit line for Matthias Groeneveld (Pixabay video).

## How to use this file later

In any future session, say "read the homepage plan" or point at `hecca-shop/docs/homepage-plan.md` and the full section order + code blocks above will be available.
