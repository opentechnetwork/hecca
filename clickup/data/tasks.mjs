// Task definitions for the HECCA Website Build list.
// Derived from the HECCA Brand Identity Guide (opentechnetwork.github.io/hecca/hecca.html).

export const DEV = 132279308; // David Burns — developer
export const OWNER = 101385323; // Heather Sylvan — owner

/** @type {{name: string, description: string, assignees: number[], tags: string[]}[]} */
export const tasks = [
  // ───────────────────────── Developer ─────────────────────────
  {
    name: "Duplicate the live theme before any edits",
    description:
      "Clone the published theme to a working duplicate and do all build work there. Never edit the live theme directly.\n\nAcceptance: a named duplicate exists; production theme remains subscribed/published.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Implement brand color tokens as CSS variables",
    description:
      "Add the 8 brand colors from §04 of the Brand Identity Guide as CSS custom properties and wire them into Shopify theme settings.\n\nHybrid Gold #D4A64A · Deep Black #0F0F0F · Soft White #F7F7F7 · Boutique Pink #E84C7F · Electric Blue #3A6FB0 · Sky Blue #A7C7F2 · Leopard Tan #C8A97E · Stripe Beige #F5E9D2\n\nAcceptance: every color is editable in Theme settings and referenced via tokens (no hard-coded hex in templates).",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Load Cormorant Garamond + Montserrat and map to theme font settings",
    description:
      "Cormorant Garamond (display/headlines, weight 700; italic for pull quotes) and Montserrat (body/UI, 400; labels 600). Map both to the theme's font settings.\n\nRule from the guide: never use more than two font families in one composition.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Build the type scale per the brand hierarchy",
    description:
      "H1 Hero — Cormorant Garamond 700, 64–80px, 0.3em spacing\nH2 Section — Cormorant Garamond 700, 32–40px, 0.1em\nBody — Montserrat 400, 14–16px, normal\nPull Quote — Cormorant Garamond italic 400, 22–28px\nLabel — Montserrat 600, 10–12px, 0.15em uppercase\n\nRules: uppercase for labels/nav/CTAs; body line-height 1.5–1.6; headline letter-spacing never below 0.05em.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Prepare 4 logo SVGs + favicon and PWA icons",
    description:
      "Export and install the four crest variants as SVG:\n• Dual Aura Crest (primary — all official materials)\n• Gold + Pink (Femme — campaigns)\n• Gold + Blue (Homme — digital)\n• Gold + Leopard (Wild — editorial lookbooks)\n\nPlus favicon, apple-touch-icon, and PWA icon set derived from the primary crest.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Enforce logo usage rules in header and footer",
    description:
      "Implement the guide's logo rules:\n• Minimum size 24px digital\n• Clear space 1x the height of the 'H' on all sides\n• No stretch, rotation, off-palette recolor, or drop shadows\n• Only on Deep Black, Soft White, or approved photography",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Centered-logo header with minimal nav and gold hover states",
    description:
      "Per §08 Navigation: centered logo, minimal menu, gold (#D4A64A) hover states. Keep it sparse — negative space is luxury.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Mobile slide-out drawer navigation",
    description:
      "Slide-out drawer for mobile navigation with the same minimal menu and gold hover/active treatments.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Full-bleed homepage hero with gold CTA and per-drop rotation",
    description:
      "Per §08 Homepage Hero: full-bleed campaign imagery (2.39:1 cinematic), gold CTA. Must be swappable per collection drop without a code deploy.\n\nReference: 'HECCA FEMME SS26 — Shop Now'.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Dark product cards with gold price and desktop hover quick-add",
    description:
      "Per §08 Product Cards: dark cards, minimal info, price in gold, quick-add on hover for desktop. Mobile falls back to always-visible add button.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Build collection pages: FEMME / HOMME / WILD / AURA",
    description:
      "Four collection templates, each with its assigned single accent color:\n• FEMME — Boutique Pink #E84C7F\n• HOMME — Electric Blue #3A6FB0\n• WILD — Leopard Tan #C8A97E\n• AURA — Sky Blue #A7C7F2\n\nRule: one accent color per composition maximum; Hybrid Gold is the only color permitted to pair with any accent; never combine two accents.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Footer with brand line and brand@hecca.com",
    description:
      "Footer includes '© HECCA — The Standard of Hybrid Luxury' and contact address brand@hecca.com, styled on Deep Black.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Configure products, variants, and the reference price set",
    description:
      "Set up the product data model and reference products from §08:\nSilk Drape Blazer $1,280 · Leopard Print Coat $2,450 · Heritage Hoodie $680 · Aura Sheer Gown $3,100\n\nConfirm variants, sizing, and inventory tracking with the owner.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Configure shipping rates, taxes, and payments; place a test order",
    description:
      "Set up shipping zones/rates, tax settings, and the payment provider. Complete an end-to-end test order including confirmation email and refund path.\n\nAcceptance: test order completes and is refunded cleanly.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Build product import CSV template mapped to the brand data model",
    description:
      "Create a CSV template the owner can fill to bulk-upload products: handle, title, body (brand voice), vendor, type, tags, price, compare-at, SKU, inventory, images, SEO title/description.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Meta titles, descriptions, and canonicals across all templates",
    description:
      "Unique title tags and meta descriptions for home, collections (FEMME/HOMME/WILD/AURA), products, and pages. Correct self-referencing canonicals; no duplicate titles.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Structured data: Organization, Product, and BreadcrumbList",
    description:
      "Add JSON-LD for Organization (with logo + contact), Product (name, image, price, currency, availability, brand), and BreadcrumbList on all relevant templates. Validate with the Rich Results Test.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Add llms.txt and FAQ schema for answer engines (AEO)",
    description:
      "Publish /llms.txt describing brand and key pages, and add FAQPage schema to relevant templates so AI assistants (ChatGPT, Perplexity, AI Overviews) can cite HECCA accurately.",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Cinematic image pipeline: 2.39:1 crops, responsive srcset, WebP/AVIF",
    description:
      "Implement the imagery direction technically: cinematic aspect ratios for hero/campaign, responsive srcset/sizes, modern formats (WebP/AVIF), lazy loading below the fold, and preserved deep shadows/warm undertones (no cold or clinical processing).",
    assignees: [DEV],
    tags: ["dev"],
  },
  {
    name: "Install GA4, Meta pixel, and cookie consent",
    description:
      "Add GA4 and Meta pixel with ecommerce events (view_item, add_to_cart, begin_checkout, purchase) plus a compliant cookie consent banner that gates non-essential scripts.",
    assignees: [DEV],
    tags: ["dev"],
  },

  // ────────────────────────── Owner ────────────────────────────
  {
    name: "Approve final logo files and variant per collection",
    description:
      "Supply the production-ready logo files and confirm which crest variant applies where:\n• Dual Aura Crest — primary, all official materials\n• Gold + Pink — Femme campaigns\n• Gold + Blue — Homme digital\n• Gold + Leopard — Wild editorial lookbooks\n\nBlocks: logo installation and collection styling.",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Approve color pairing usage per collection",
    description:
      "Confirm the pairings from §04:\n• Power Pair (Gold + Black) — core branding, logo, headlines\n• Feminine Pair (Pink + Gold) — HECCA Femme, campaigns\n• Urban Pair (Blue + Black) — HECCA Homme, digital\n• Natural Pair (Tan + Beige) — HECCA Wild, packaging\n• Accent Combo (Sky + Gold) — HECCA Aura, limited editions",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Approve type hierarchy and the forbidden-words list",
    description:
      "Sign off on the type scale in §05 and the brand vocabulary rules in §07.\n\nWords HECCA avoids (never used in copy): cheap, basic, trendy, sale, discount, fast fashion, affordable, generic, average, ordinary.",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Provide or commission campaign and product photography",
    description:
      "Per §06 Imagery Style: high-contrast lighting with deep shadows; warm undertones (never cold/clinical); confident, culturally proud models; urban/architectural backdrops; visible textures (fabric grain, leather, hardware); 2.39:1 cinematic crops for hero. Minimalist product shots on solid black.",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Approve homepage hero copy and collection rotation plan",
    description:
      "Approve the hero headline/CTA and the rotation schedule per collection drop. Reference format: 'HECCA FEMME SS26 — Shop Now'.\n\nTone for website: elevated, editorial ('Discover the new chapter.').",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Write and approve collection descriptions for FEMME / HOMME / WILD / AURA",
    description:
      "FEMME — Satin, lace, floral; sensual luxury, feminine power\nHOMME — Heavy woven suiting, hardware; authority, precision\nWILD — Faux leopard, zebra, python; fearless, primal luxury\nAURA — Iridescent, holographic, sheer; otherworldly collectors' edition",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Write and approve product descriptions in brand voice",
    description:
      "Sensory and detailed, e.g. 'Italian silk. Midnight structure. Uncompromising.' Aspirational yet raw, poetic but direct. Apply the avoided-words rules.",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Approve final pricing",
    description:
      "Confirm retail pricing for the launch assortment (reference set: $680–$3,100). Reminder: never frame as sale/discount — luxury positioning only.",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Brand voice audit — remove avoided words from all copy",
    description:
      "Review existing and drafted copy to remove: cheap, basic, trendy, sale, discount, fast fashion, affordable, generic, average, ordinary. Confirm preferred vocabulary is used: exclusive, fearless, crafted, heritage, elevated, magnetic, bold, iconic, curated, statement.",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Register/verify hecca.com and set up brand@hecca.com email",
    description:
      "Confirm whether hecca.com is the real production domain or a placeholder from the guide. Register/verify the domain, connect it to Shopify, and set up the brand@hecca.com mailbox (used in the footer).",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Prepare legal and policy pages",
    description:
      "Draft and approve shipping policy, returns/refunds, privacy policy, and terms of service. Required before launch and referenced by the consent banner.",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Finalize packaging: stripe beige tissue and gold foil hang tags",
    description:
      "Per §10: Stripe Beige pattern, horizontal or diagonal stripes only, 4–8mm stripe width, for packaging/shopping bags/tissue. Gold foil (hot-stamped preferred) reserved for logo applications, hang tags, and premium print.",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Set up social handles and Instagram post template",
    description:
      "Secure handles across platforms and produce the Instagram post template: bold typography overlays on photography, one accent color per composition, style as shown in §11 ('HECCA WILD — Available Now').",
    assignees: [OWNER],
    tags: ["owner"],
  },
  {
    name: "Build launch marketing calendar and email flow",
    description:
      "Plan the launch drop: campaign sequence, social cadence, and email flow. Email tone is warm and exclusive ('You're invited before the world.'); social is raw, direct, magnetic ('Not for everyone. For the ones.').",
    assignees: [OWNER],
    tags: ["owner"],
  },
];
