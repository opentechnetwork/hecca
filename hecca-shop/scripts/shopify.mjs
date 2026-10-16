// Minimal, dependency-free Shopify Admin API client.
//
// Auth: Shopify retired admin-created custom apps (Jan 2026). Tokens are no longer
// shown in the UI. Instead we exchange the Dev Dashboard app's client ID + secret
// for an access token via the OAuth client credentials grant. Tokens last 24h and
// are cached + refreshed automatically here.
//
// Credentials come from hecca-shop/.env. Node 18+ (built-in fetch).
//
//   SHOPIFY_STORE=hecca-nmec6dmd.myshopify.com   (or bare subdomain)
//   SHOPIFY_API_VERSION=2025-07
//   SHOPIFY_CLIENT_ID=...
//   SHOPIFY_CLIENT_SECRET=...
//   SHOPIFY_TOKEN=...        (optional legacy static token; wins if set)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Parse a simple KEY=VALUE .env file. No expansion, quotes trimmed. */
export function loadEnv(path = join(here, "..", ".env")) {
  const env = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

/** Accept "shop", "shop.myshopify.com", or a full URL. Return the myshopify host. */
function normalizeHost(value) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.myshopify\.com$/i, "")
    .concat(".myshopify.com");
}

export function config() {
  const env = loadEnv();
  if (!env.SHOPIFY_STORE) {
    throw new Error("Missing SHOPIFY_STORE in hecca-shop/.env");
  }
  return {
    host: normalizeHost(env.SHOPIFY_STORE),
    version: env.SHOPIFY_API_VERSION || "2025-07",
    clientId: env.SHOPIFY_CLIENT_ID || "",
    clientSecret: env.SHOPIFY_CLIENT_SECRET || "",
    staticToken: env.SHOPIFY_TOKEN || "",
  };
}

/** Which auth mode will be used, for diagnostics. */
export function authMode() {
  const c = config();
  if (c.staticToken) return "static token (SHOPIFY_TOKEN)";
  if (c.clientId && c.clientSecret) return "client credentials grant";
  return "none — set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET";
}

let cache = { token: null, expiresAt: 0, scope: null };

/** Turn Shopify's OAuth failures (often an HTML page) into a clear, actionable message. */
function tokenError(status, text, json) {
  // Pull the sentence out of the error page, e.g.
  // "Oauth error app_not_installed: The application is not installed on this shop."
  const raw = json?.error_description || json?.error || text || "";
  const headline = /Oauth error [^<\n]+/i.exec(raw)?.[0]?.trim() || "";
  const detail = headline || (json ? JSON.stringify(json) : String(raw).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200));

  const hints = {
    app_not_installed:
      "→ Install the app on this store:\n" +
      "  Dev Dashboard → your app → Install app → select hecca-nmec6dmd → Install.\n" +
      "  It must finish installing before the token exchange will work.",
    shop_not_permitted:
      "→ The app and the store must be in the SAME Shopify organization.\n" +
      "  Dev Dashboard → Dev stores: the store must be listed there. A store created\n" +
      "  from the Shopify admin (rather than the Dev Dashboard) is not in the org.",
    invalid_client_id:
      "→ SHOPIFY_CLIENT_ID is wrong or the app was deleted. Re-copy it from\n" +
      "  Dev Dashboard → your app → Settings → Credentials.",
    invalid_client_secret:
      "→ SHOPIFY_CLIENT_SECRET is wrong, or it was rotated. Re-copy it from\n" +
      "  Dev Dashboard → your app → Settings → Credentials.",
    invalid_scope:
      "→ A requested scope isn't valid or hasn't been released. Re-check the scopes\n" +
      "  on the app's version in the Dev Dashboard.",
  };

  const code = /Oauth error ([a-z_]+)/i.exec(raw)?.[1] || "";
  const hint = hints[code] ? `\n\n${hints[code]}` : "";

  return `Token request failed: HTTP ${status}${code ? ` [${code}]` : ""}\n${detail}${hint}`;
}

/**
 * Get a valid access token, requesting one via the client credentials grant when
 * needed. Cached until 60s before expiry (Shopify issues 24h tokens).
 */
export async function getToken({ force = false } = {}) {
  const c = config();

  if (c.staticToken) return c.staticToken;

  if (!c.clientId || !c.clientSecret) {
    throw new Error(
      "No credentials in hecca-shop/.env.\n" +
        "Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET from your app's\n" +
        "Dev Dashboard → Settings → Credentials.",
    );
  }

  if (!force && cache.token && Date.now() < cache.expiresAt - 60_000) return cache.token;

  const res = await fetch(`https://${c.host}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: c.clientId,
      client_secret: c.clientSecret,
    }),
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok || !json?.access_token) {
    throw new Error(tokenError(res.status, text, json));
  }

  cache = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 86399) * 1000,
    scope: json.scope ?? null,
  };
  return cache.token;
}

/** Scopes granted to the current token (readback of the app version's scopes). */
export function grantedScopes() {
  return cache.scope;
}

/** Shopify REST helper. Note: product REST endpoints are legacy — prefer graphql(). */
export async function rest(path, opts = {}) {
  const { host, version } = config();
  const token = await getToken();
  const res = await fetch(`https://${host}/admin/api/${version}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`Shopify ${res.status} ${res.statusText} on ${path}\n${text}`);
  }
  return { data, link: res.headers.get("link") ?? "", status: res.status };
}

/** GraphQL Admin API helper. */
export async function graphql(query, variables = {}) {
  const { host, version } = config();
  const token = await getToken();
  const res = await fetch(`https://${host}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Shopify GraphQL ${res.status}: ${JSON.stringify(json)}`);
  if (json?.errors?.length)
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors, null, 2)}`);
  return json.data;
}

/** Extract the page_info cursor from a Shopify Link header. */
export function nextPageInfo(link) {
  const m = /<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/.exec(link || "");
  return m ? decodeURIComponent(m[1]) : null;
}
