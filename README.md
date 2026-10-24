# HECCA

Two unrelated-to-anything-else workstreams for the HECCA Shopify build:

| Folder | What it is |
| --- | --- |
| `clickup/` | ClickUp integration - builds/assigns the Website Build tasks (dev vs owner) |
| `hecca-shop/` | Shopify store work - Admin API tooling + theme (Shopify CLI) |
| `logos/` | Logo files - SVG (vector) and PNG (transparent, 2x-4x) |
| `scripts/` | Brand-level tooling (logo build) |
| `hecca.html` | Brand identity / style guide (hosted via GitHub Pages) |
| `logo.html` | Logo system spec sheet - glow options, lockups, colourways, files |
| `index.html` | Brand landing page |

## Logo

Open `logo.html` for the spec sheet. Source files live in `logos/`:

| File | Use |
| --- | --- |
| `hecca-wordmark-plum.svg` | Primary wordmark with plum halo (screen) |
| `hecca-wordmark-flat.svg` | Flat gold, no glow (print, embroidery, small sizes) |
| `hecca-wordmark-black.svg` / `-white.svg` | One-colour, no glow |
| `hecca-lockup-horizontal-plum.svg` | Store header, receipts |
| `hecca-lockup-horizontal-tagline-plum.svg` | Store header + receipts with "Hybrid By Design" under the name |
| `hecca-lockup-stacked-plum.svg` | Hero, packaging, social |
| `hecca-monogram-plum.svg` | Favicon, hardware |
| `hecca-app-icon.svg` | 512 square app/social icon |
| `png/` | Transparent PNG exports at 512-1600px |

The type is converted to outlines, so the SVGs need no fonts installed.

Rebuild after changing the palette or geometry:

```
node scripts/build-logos.mjs
```

`logos/hecca-paths.mjs` holds the generated outline data (Cormorant Garamond 700).
To rasterize PNGs, `npm i sharp` then run the rasterizer.


## Secrets

Both subfolders keep their own `.env` (git-ignored). The root `.gitignore` guards them
again so a nested config can never leak a token into this repo.

## Conventions

- `*.env` files are never committed and tokens are never pasted into files that are.
- Every script supports `--dry-run` where it writes to a remote service.
- Remote changes are previewed before they are applied.
