// HECCA collection taxonomy — the source of truth.
//
// Two independent axes:
//   1. CATEGORY   (what the thing is)       -> collections, nested via handles
//   2. BRAND LINE (which collection story)  -> FEMME / HOMME / WILD / AURA
//
// VINTAGE is a cross-cutting flag: a vintage ring is BOTH Jewelry › Rings AND
// Vintage › Jewelry. It is not an exclusive category.
//
// ── Tag model (one namespaced tag per product, per axis) ───────────────────
//   Category   jewelry:rings     -> the leaf collection matches it exactly
//   Vintage    vintage:jewelry   -> the leaf collection matches it exactly
//   Brand line line:wild
//
// So a vintage homme shirt carries exactly three tags:
//   apparel:shirts, vintage:apparel, line:homme
//
// IMPORTANT: Shopify supports only exact tag matches (EQUALS) on TAG rules —
// there is no "tag contains" relation. A parent collection is therefore the
// DISJUNCTIVE UNION of its children's tags, generated from this file by
// scripts/collections.mjs. Add a child here and the parent's rule set is
// rewritten automatically; a product never carries a separate "parent" tag.
//
// NOTE: we started with 2 subcollections per category. The rest live in each
// category's `deferred` array — move them into `children` when you want them.

export const TAXONOMY = {
  categories: [
    {
      name: "Jewelry",
      handle: "jewelry",
      tagPrefix: "jewelry:",
      description:
        "Sculptural metalwork, rare stone, and hand-finished detail. Pieces made to be worn as statements, not accessories.",
      children: [
        { name: "Rings", handle: "jewelry-rings", tag: "jewelry:rings",
          description: "Bold signets, stacked bands, and stone-set statements." },
        { name: "Necklaces", handle: "jewelry-necklaces", tag: "jewelry:necklaces",
          description: "Layered chains, pendants, and collars built to catch light." },
      ],
      deferred: [
        { name: "Bracelets", handle: "jewelry-bracelets", tag: "jewelry:bracelets",
          description: "Cuffs, bangles, and linked pieces with real weight and presence." },
        { name: "Earrings", handle: "jewelry-earrings", tag: "jewelry:earrings",
          description: "From architectural studs to floor-length statement drops." },
      ],
    },
    {
      name: "Apparel",
      handle: "apparel",
      tagPrefix: "apparel:",
      description:
        "Tailoring with intent. Fabric, silhouette, and structure weighted in equal measure.",
      children: [
        { name: "Shirts", handle: "apparel-shirts", tag: "apparel:shirts",
          description: "Woven shirting in silk, poplin, and heavy cotton." },
        { name: "Shorts", handle: "apparel-shorts", tag: "apparel:shorts",
          description: "Tailored and relaxed cuts built for heat." },
      ],
      deferred: [
        { name: "Tops", handle: "apparel-tops", tag: "apparel:tops",
          description: "Bodies, tanks, and second-skin layers." },
        { name: "Dresses", handle: "apparel-dresses", tag: "apparel:dresses",
          description: "Floor-length, sheer, and structured silhouettes." },
        { name: "Bottoms", handle: "apparel-bottoms", tag: "apparel:bottoms",
          description: "Trousers and denim with deliberate drape." },
        { name: "Outerwear", handle: "apparel-outerwear", tag: "apparel:outerwear",
          description: "Coats and jackets that carry the room." },
        { name: "Suiting", handle: "apparel-suiting", tag: "apparel:suiting",
          description: "Heavy woven suiting and precision-cut tailoring." },
        { name: "Knitwear", handle: "apparel-knitwear", tag: "apparel:knitwear",
          description: "Dense knits and heritage fibre." },
      ],
    },
    {
      name: "Accessories",
      handle: "accessories",
      tagPrefix: "accessories:",
      description: "The finishing layer. Hardware, leather, and small luxuries.",
      children: [
        { name: "Bags", handle: "accessories-bags", tag: "accessories:bags",
          description: "Structured, handheld, and shoulder pieces." },
        { name: "Belts", handle: "accessories-belts", tag: "accessories:belts",
          description: "Hardware-forward leather and statement buckles." },
      ],
      deferred: [
        { name: "Hats", handle: "accessories-hats", tag: "accessories:hats",
          description: "Headwear with shape and attitude." },
        { name: "Scarves", handle: "accessories-scarves", tag: "accessories:scarves",
          description: "Silk, print, and oversized wraps." },
        { name: "Eyewear", handle: "accessories-eyewear", tag: "accessories:eyewear",
          description: "Frames chosen for line and proportion." },
      ],
    },
    {
      name: "Home Decor",
      handle: "home-decor",
      tagPrefix: "home-decor:",
      description: "Considered objects for the space you live in.",
      children: [
        { name: "Bedding", handle: "home-decor-bedding", tag: "home-decor:bedding",
          description: "Sheets and covers in luxury weights." },
        { name: "Mats & Rugs", handle: "home-decor-mats-rugs", tag: "home-decor:mats-rugs",
          description: "Floor pieces with texture and presence." },
      ],
      deferred: [
        { name: "Curtains", handle: "home-decor-curtains", tag: "home-decor:curtains",
          description: "Drapes that control light and mood." },
        { name: "Cushions", handle: "home-decor-cushions", tag: "home-decor:cushions",
          description: "Accent pieces in signature textures." },
        { name: "Throws", handle: "home-decor-throws", tag: "home-decor:throws",
          description: "Layers for warmth and texture." },
        { name: "Wall Art", handle: "home-decor-wall-art", tag: "home-decor:wall-art",
          description: "Statement pieces for the wall." },
      ],
    },
  ],

  // Cross-cutting. Products also sit in their own category.
  vintage: {
    name: "Vintage",
    handle: "vintage",
    tagPrefix: "vintage:",
    description:
      "One-of-a-kind archive pieces. Sourced, authenticated, and offered in single quantities.",
    children: [
      { name: "Vintage Jewelry", handle: "vintage-jewelry", tag: "vintage:jewelry",
        description: "Archive rings, necklaces, bracelets, and earrings." },
      { name: "Vintage Apparel", handle: "vintage-apparel", tag: "vintage:apparel",
        description: "Archive garments, sourced in single quantities." },
      { name: "Vintage Accessories", handle: "vintage-accessories", tag: "vintage:accessories",
        description: "Archive bags, belts, scarves, and eyewear." },
    ],
    deferred: [
      { name: "Vintage Home", handle: "vintage-home", tag: "vintage:home-decor",
        description: "Archive objects and textiles for the home." },
    ],
  },

  // From the brand guide (§09 Collection Identity). A parallel browse axis.
  brandLines: [
    { name: "HECCA FEMME", handle: "hecca-femme", tag: "line:femme",
      description: "Satin, lace, and floral. Sensual luxury, feminine power." },
    { name: "HECCA HOMME", handle: "hecca-homme", tag: "line:homme",
      description: "Heavy woven suiting and hardware. Authority, precision, modern masculinity." },
    { name: "HECCA WILD", handle: "hecca-wild", tag: "line:wild",
      description: "Faux leopard, zebra, and python. Fearless, primal luxury." },
    { name: "HECCA AURA", handle: "hecca-aura", tag: "line:aura",
      description: "Iridescent, holographic, sheer. Otherworldly and exclusive." },
  ],
};
