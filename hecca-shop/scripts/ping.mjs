// Connectivity + credentials + scope check. Run: node scripts/ping.mjs
import { config, graphql, getToken, grantedScopes, authMode } from "./shopify.mjs";

const { host, version } = config();
console.log(`Store:   ${host}`);
console.log(`API:     ${version}`);
console.log(`Auth:    ${authMode()}\n`);

// 1. Exchange credentials for a token.
try {
  await getToken({ force: true });
  console.log("✓ Token acquired");

  // The token is minted from the app version's declared scope list, and it is
  // what the API actually enforces. The installation can list more than the
  // token carries — that is what the merchant granted, not what this token has.
  const token = (grantedScopes() ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
  console.log(`  Token scopes   (${token.length}): ${token.join(", ") || "(none reported)"}`);

  try {
    const d = await graphql(`{ currentAppInstallation { accessScopes { handle } } }`);
    const inst = d.currentAppInstallation.accessScopes.map((s) => s.handle).sort();
    console.log(`  Install scopes (${inst.length}): ${inst.join(", ")}`);
    const onlyInstall = inst.filter((s) => !token.includes(s));
    if (onlyInstall.length) {
      console.log(`  ⚠ granted to the install but NOT carried by this token:`);
      console.log(`      ${onlyInstall.join(", ")}`);
      console.log("    → the token carries only the app version's declared scopes.");
      console.log("      Add them to the version in the Dev Dashboard and release it.");
    }
  } catch {
    console.log("  Install scopes: (unavailable)");
  }
} catch (err) {
  console.error(`✗ Authentication failed:\n${err.message}`);
  process.exit(1);
}

// 2. Core query — store identity, product count, locations.
try {
  const data = await graphql(`{
    shop {
      name
      myshopifyDomain
      currencyCode
      ianaTimezone
      createdAt
      plan { displayName }
    }
    productsCount { count }
    locations(first: 10) { nodes { id name isActive fulfillsOnlineOrders } }
  }`);
  const s = data.shop;
  console.log(`\n✓ Connected to "${s.name}"`);
  console.log(`  Domain:      ${s.myshopifyDomain}`);
  console.log(`  Plan:        ${s.plan?.displayName ?? "?"}`);
  console.log(`  Currency:    ${s.currencyCode}`);
  console.log(`  Timezone:    ${s.ianaTimezone}`);
  console.log(`  Created:     ${s.createdAt}`);
  console.log(`  Products:    ${data.productsCount.count}`);
  console.log(
    `  Locations:   ${data.locations.nodes.map((l) => `${l.name}${l.isActive ? "" : " (inactive)"}`).join(", ") || "(none)"}`,
  );
} catch (err) {
  console.error(`\n✗ Core query failed:\n${err.message}`);
  process.exit(1);
}

// 3. Optional queries — each guarded so a missing scope doesn't abort the check.
const optional = [
  ["Publications", "{ publications(first: 10) { nodes { id name } } }", (d) =>
    d.publications.nodes.map((p) => p.name).join(", ") || "(none)"],
  ["Themes", "{ themes(first: 10) { nodes { id name role } } }", (d) =>
    d.themes.nodes.map((t) => `${t.name} [${t.role}]`).join(", ") || "(none)"],
  ["Markets", "{ markets(first: 10) { nodes { name enabled } } }", (d) =>
    d.markets.nodes.map((m) => `${m.name}${m.enabled ? "" : " (off)"}`).join(", ") || "(none)"],
  ["Navigation", "{ menus(first: 10) { nodes { handle title } } }", (d) =>
    d.menus.nodes.map((m) => m.handle).join(", ") || "(none)"],
];

console.log("");
for (const [label, query, fmt] of optional) {
  try {
    const d = await graphql(query);
    console.log(`  ${label.padEnd(14)}${fmt(d)}`);
  } catch (err) {
    const msg = String(err.message).split("\n")[0];
    console.log(`  ${label.padEnd(14)}✗ ${msg}`);
  }
}

console.log("\nAll good — ready to fetch the catalog.");
