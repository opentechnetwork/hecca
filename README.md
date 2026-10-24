# HECCA

Two unrelated-to-anything-else workstreams for the HECCA Shopify build:

| Folder | What it is |
| --- | --- |
| `clickup/` | ClickUp integration - builds/assigns the Website Build tasks (dev vs owner) |
| `hecca-shop/` | Shopify store work - Admin API tooling + theme (Shopify CLI) |
| `hecca.html` | Brand identity / style guide (hosted via GitHub Pages) |
| `index.html` | Brand landing page |

## Secrets

Both subfolders keep their own `.env` (git-ignored). The root `.gitignore` guards them
again so a nested config can never leak a token into this repo.

## Conventions

- `*.env` files are never committed and tokens are never pasted into files that are.
- Every script supports `--dry-run` where it writes to a remote service.
- Remote changes are previewed before they are applied.
