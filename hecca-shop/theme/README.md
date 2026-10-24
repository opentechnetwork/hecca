# Theme CSS

`hecca.css` is the storefront stylesheet. It carries the type hierarchy, the
brand colours, the surface pairs and the glow/halo classes. It is a **separate
asset**, never a patch to the theme's own CSS, so a theme update never has to be
merged by hand.

Two rules:

1. Brand rules go in `hecca.css` — never in `base.css`, `section-*.css` or
   `layout/theme.liquid`.
2. The theme's own files stay stock. The only line we add to the theme is the
   `<link>` below.

---

## Install (once per theme)

Shopify does not let an app write theme files without a special exemption, so
this is done by hand. It takes about two minutes.

1. Shopify admin → **Online Store → Themes**.
2. On the theme you are publishing, click **⋯ → Edit code**.
3. In the left sidebar under **Assets**, click **Add a new asset**.
   - Choose **Upload a file** and select `hecca.css` from this folder.
   - If the dialog only offers a blank file, create `hecca.css` and paste the
     contents of this file into it.
4. Open **layout/theme.liquid**. Press <kbd>Ctrl</kbd>+<kbd>F</kbd> and search
   for `base.css`. You will land on:

   ```liquid
   {{ 'base.css' | asset_url | stylesheet_tag }}
   ```

5. Directly **under** that line, paste:

   ```liquid
   {%- comment -%} hecca:css {%- endcomment -%}
   {{ 'hecca.css' | asset_url | stylesheet_tag }}
   {%- comment -%} /hecca:css {%- endcomment -%}
   ```

6. **Save**.

The comment markers matter: they are how the block is found again when the CSS
needs to be moved or removed, and they make a second install a no-op.

## Verify

- In the code editor, the file appears as `assets/hecca.css`.
- Preview the theme, view page source, and search for `hecca.css`. It should
  appear once, after `base.css`.
- Headings should switch to Cormorant Garamond in caps, body text to
  Montserrat.

If the storefront is behind the password page, remember that the password page
uses `layout/password.liquid`, so the brand stylesheet does not apply there
unless the same link is added to that layout too.

## After a theme update

Shopify never updates a theme in place. A theme update means downloading a new
version and adding it as a **new theme**, which starts with stock files and no
`hecca.css`. So:

1. Install `hecca.css` in the new theme — the same six steps above.
2. Publish the new theme.

Nothing is lost: `hecca.css` in this repo is the source of truth, and the theme
copy is a deployment of it.

## Zero-touch alternative

If you would rather never touch the theme again when the CSS changes, point the
link at the copy GitHub Pages already serves:

```liquid
<link rel="stylesheet" href="https://opentechnetwork.github.io/hecca/hecca-shop/theme/hecca.css">
```

Then every CSS change is `git push` and nothing else. Trade-off: the storefront
now depends on GitHub Pages being reachable, and the browser makes one extra
request. Recommended only if you would rather have the zero-touch workflow than
the local copy.

## Why not the theme's Custom CSS box

Customize → Theme settings → Custom CSS also survives *code* edits, but it is a
single text blob stored in the theme's settings, so it is lost just the same when
a new theme is added, and it cannot be reviewed, diffed or versioned. Keeping the
stylesheet as a real file in this repo gives history, review and rollback.

## Script

`scripts/theme-css.mjs` is the automated version of the above. It plans the
upload and the exact line to insert:

```
node scripts/theme-css.mjs            # plan, no writes
node scripts/theme-css.mjs --apply    # upload asset + insert the link
node scripts/theme-css.mjs --remove   # take the link back out
```

`--apply` currently stops at Shopify's `ACCESS_DENIED` on `themeFilesUpsert`:
the app has `write_themes` but Shopify requires an exemption for apps to modify
theme files. The script prints the manual steps when that happens. If the app is
ever granted the exemption, `--apply` starts working with no changes.
