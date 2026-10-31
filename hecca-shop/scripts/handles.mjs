// Sync product handles to their (current) titles.
//
// Shopify does NOT auto-update a handle when a title changes, so after title
// edits the URL and the title drift apart. This script renames the handle to a
// slug of the title and (on --apply) creates a 301 redirect from the old URL
// to the new one, so existing links and SEO equity survive.
//
//   node scripts/handles.mjs            # plan (no writes) — shows old -> new
//   node scripts/handles.mjs --apply    # rename handles + create redirects
//   node scripts/handles.mjs --verify   # list products whose handle != slug(title)
//
// Scope: products only (not collections). Handles are slugs of the title with
// no prefix or suffix. Idempotent: products already in sync are skipped;
// redirects that already exist are skipped.
//
// NOTE on redirects: creating URL redirects via the API requires the
// `write_online_store_navigation` scope. If the app token does not have it
// (current default scopes do not), redirects cannot be created by this script.
// In that case the script records the needed redirects to
// reports/handle-redirects.csv so they can be imported in the Shopify admin
// (Online Store -> Navigation -> URL Redirects -> Import), or you can add the
// scope to the app and re-run. Renaming handles still works either way.
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { graphql } from "./shopify.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const REPORT = join(root, "reports", "handles.json");
const REDIRECT_CSV = join(root, "reports", "handle-redirects.csv");

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");

const LIST = `query Existing($cursor: String) {
  products(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes { id handle title status }
  }
}`;

const UPDATE = `mutation UpdateHandle($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id handle title }
    userErrors { field message }
  }
}`;

const REDIRECT = `mutation Redirect($urlRedirect: UrlRedirectInput!) {
  urlRedirectCreate(urlRedirect: $urlRedirect) {
    urlRedirect { id path target }
    userErrors { field message }
  }
}`;

async function fetchProducts() {
  const list = [];
  let cursor = null;
  for (;;) {
    const d = await graphql(LIST, { cursor });
    for (const p of d.products.nodes) list.push(p);
    if (!d.products.pageInfo.hasNextPage) break;
    cursor = d.products.pageInfo.endCursor;
  }
  return list;
}

function slugify(s) {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

function plan(products) {
  const seen = new Map();
  const rows = [];
  const sorted = [...products].sort((a, b) => a.handle.localeCompare(b.handle));
  for (const p of sorted) {
    const desired = slugify(p.title) || p.handle;
    const collision = seen.has(desired) ? seen.get(desired) : null;
    if (!collision) seen.set(desired, p.title);
    rows.push({
      id: p.id,
      title: p.title,
      status: p.status,
      oldHandle: p.handle,
      newHandle: desired,
      collision,
    });
  }
  return rows;
}

function alreadySynced(r) {
  return r.oldHandle === r.newHandle && !r.collision;
}

const pendingRedirects = [];

async function applyOne(r) {
  const u = await graphql(UPDATE, { product: { id: r.id, handle: r.newHandle } });
  const uerrs = u.productUpdate.userErrors;
  if (uerrs?.length) {
    return { ok: false, step: "rename", errors: uerrs };
  }
  const liveHandle = u.productUpdate.product.handle;
  if (r.oldHandle !== liveHandle) {
    let redirectStatus = "created";
    try {
      const red = await graphql(REDIRECT, {
        urlRedirect: { path: `/products/${r.oldHandle}`, target: `/products/${liveHandle}` },
      });
      const rerrs = red.urlRedirectCreate.userErrors;
      const alreadyExists = rerrs?.some((e) =>
        /taken|exists|already/i.test((e.message || "") + " " + (e.field || []).join(" ")),
      );
      if (rerrs?.length && !alreadyExists) {
        // record for manual import
        pendingRedirects.push({ from: `/products/${r.oldHandle}`, to: `/products/${liveHandle}` });
        return { ok: true, handle: liveHandle, redirect: `pending (redirect failed: ${rerrs.map((e) => e.message).join("; ")})` };
      }
      redirectStatus = alreadyExists ? "already existed" : "created";
    } catch (e) {
      const msg = String(e.message || "");
      if (/ACCESS_DENIED|write_online_store_navigation/i.test(msg)) {
        pendingRedirects.push({ from: `/products/${r.oldHandle}`, to: `/products/${liveHandle}` });
        return { ok: true, handle: liveHandle, redirect: "pending (scope missing - see handle-redirects.csv)" };
      }
      pendingRedirects.push({ from: `/products/${r.oldHandle}`, to: `/products/${liveHandle}` });
      return { ok: false, step: "redirect", errors: [{ message: msg }], handle: liveHandle };
    }
    return { ok: true, handle: liveHandle, redirect: redirectStatus };
  }
  return { ok: true, handle: liveHandle, redirect: "n/a (same handle)" };
}

function writeRedirectCsv(list) {
  if (!list.length) return;
  mkdirSync(join(root, "reports"), { recursive: true });
  const lines = ["Redirect from,Redirect to"];
  for (const r of list) lines.push(`${r.from},${r.to}`);
  writeFileSync(REDIRECT_CSV, lines.join("\n") + "\n", "utf8");
}

async function main() {
  const products = await fetchProducts();
  const rows = plan(products);
  const collisions = rows.filter((r) => r.collision);
  const toRename = rows.filter((r) => !alreadySynced(r) && !r.collision);

  if (VERIFY) {
    const outOfSync = rows.filter((r) => !alreadySynced(r));
    console.log(`\nProducts: ${products.length}  |  out of sync: ${outOfSync.length}  |  collisions: ${collisions.length}\n`);
    if (outOfSync.length) {
      console.log("  old handle                        -> new handle");
      for (const r of outOfSync) {
        const tag = r.collision ? "  [COLLISION]" : "";
        console.log(`  ${r.oldHandle.padEnd(30)} -> ${r.newHandle}${tag}   (${r.title})`);
      }
    } else {
      console.log("All product handles match their (slugified) titles. Nothing to do.");
    }
    if (collisions.length) {
      console.log("\nCollisions (rename one of the titles to resolve):");
      for (const r of collisions) {
        console.log(`  "${r.title}" and "${r.collision}" both slugify to "${r.newHandle}"`);
      }
    }
    return;
  }

  console.log(`\nProducts scanned: ${products.length}`);
  console.log(`Already in sync: ${rows.length - toRename.length - collisions.length}`);
  console.log(`To rename:       ${toRename.length}`);
  console.log(`Collisions:      ${collisions.length}\n`);

  if (collisions.length) {
    console.log("Collisions (these will be skipped - rename one of the titles to resolve):");
    for (const r of collisions) {
      console.log(`  "${r.title}" and "${r.collision}" both slugify to "${r.newHandle}"`);
    }
    console.log("");
  }

  if (!toRename.length) {
    console.log("Nothing to rename. Handles already reflect titles.");
    writeReport(rows, []);
    return;
  }

  console.log("  old handle                        -> new handle");
  for (const r of toRename) {
    console.log(`  ${r.oldHandle.padEnd(30)} -> ${r.newHandle}   (${r.title})`);
  }
  console.log("");

  if (!APPLY) {
    console.log("Dry run - no writes. Re-run with --apply to rename handles (+ redirects).");
    writeReport(rows, []);
    return;
  }

  console.log("NOTE: redirect creation needs the `write_online_store_navigation` scope.");
  console.log("      If it is missing, redirects are recorded to reports/handle-redirects.csv");
  console.log("      for manual import in the Shopify admin.\n");

  const pending = [...toRename];
  const results = [];
  let progress = true;
  while (progress && pending.length) {
    progress = false;
    const stillPending = [];
    for (const r of pending) {
      const blocker = pending.find((q) => q !== r && q.oldHandle === r.newHandle);
      if (blocker) {
        stillPending.push(r);
        continue;
      }
      process.stdout.write(`  renaming ${r.oldHandle} -> ${r.newHandle} ... `);
      try {
        const res = await applyOne(r);
        if (res.ok) {
          console.log(`ok (${res.redirect})`);
          results.push({ ...r, newHandle: res.handle, redirect: res.redirect, ok: true });
        } else {
          console.log(`FAILED [${res.step}]: ${res.errors.map((e) => e.message).join("; ")}`);
          results.push({ ...r, ok: false, step: res.step, errors: res.errors });
        }
      } catch (e) {
        console.log(`ERROR: ${e.message}`);
        results.push({ ...r, ok: false, step: "exception", errors: [{ message: e.message }] });
      }
      progress = true;
    }
    pending.splice(0, pending.length, ...stillPending);
  }
  if (pending.length) {
    console.log(`\nBlocked (target handle still occupied): ${pending.length}`);
    for (const r of pending) console.log(`  ${r.oldHandle} -> ${r.newHandle}  (blocked by ${r.newHandle})`);
    results.push(...pending.map((r) => ({ ...r, ok: false, step: "blocked", errors: [{ message: "target handle occupied" }] })));
  }

  if (pendingRedirects.length) {
    writeRedirectCsv(pendingRedirects);
    console.log(`\n${pendingRedirects.length} redirect(s) could not be created via API.`);
    console.log("Recorded to reports/handle-redirects.csv for manual import:");
    console.log("  Shopify admin -> Online Store -> Navigation -> URL Redirects -> Import");
    console.log("  (CSV columns: 'Redirect from,Redirect to')");
  }

  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  console.log(`\nDone: ${ok} renamed, ${fail} failed/blocked.`);
  writeReport(rows, results);
}

function writeReport(rows, results) {
  const report = {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    inSync: rows.filter(alreadySynced).length,
    toRename: rows.filter((r) => !alreadySynced(r) && !r.collision).length,
    collisions: rows.filter((r) => r.collision).length,
    pendingRedirects,
    rows,
    results,
  };
  mkdirSync(join(root, "reports"), { recursive: true });
  writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(`Report written: reports/handles.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
