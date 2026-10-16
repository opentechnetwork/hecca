// Minimal, dependency-free ClickUp API client.
// Loads credentials from clickup/.env. Node 18+ (built-in fetch).
// Docs: https://developer.clickup.com/reference
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Parse a simple KEY=VALUE .env file. */
export function loadEnv(path = join(here, "..", ".env")) {
  const env = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

export function config() {
  const env = loadEnv();
  const token = env.CLICKUP_TOKEN;
  const base = env.CLICKUP_API_BASE || "https://api.clickup.com/api/v2";
  if (!token) {
    throw new Error("Missing CLICKUP_TOKEN in clickup/.env — add your pk_... token first.");
  }
  return { token, base };
}

/**
 * Call the ClickUp API.
 * @param {string} path - e.g. "/team"
 * @param {{ method?: string, body?: unknown, query?: Record<string, string|number|boolean|undefined> }} [opts]
 */
export async function api(path, opts = {}) {
  const { token, base } = config();
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: token,
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
    throw new Error(`ClickUp ${res.status} ${res.statusText} on ${path}\n${text}`);
  }
  return data;
}

/** Workspaces (called "teams" in the API) this token can see. */
export function getWorkspaces() {
  return api("/team").then((d) => d.teams);
}

/** Flat list of spaces in a workspace, with folders/lists resolved. */
export async function getSpaces(teamId) {
  const { spaces } = await api(`/team/${teamId}/space`, { query: { archived: false } });
  return spaces;
}

export async function getFolders(spaceId) {
  const { folders } = await api(`/space/${spaceId}/folder`, { query: { archived: false } });
  return folders;
}

export async function getFolderlessLists(spaceId) {
  const { lists } = await api(`/space/${spaceId}/list`, { query: { archived: false } });
  return lists;
}

export async function getListsInFolder(folderId) {
  const { lists } = await api(`/folder/${folderId}/list`, { query: { archived: false } });
  return lists;
}

/** Members of a list (inherits from space/folder when unset). */
export function getListMembers(listId) {
  return api(`/list/${listId}/member`).then((d) => d.members);
}

/** Custom fields defined on a list. */
export function getListCustomFields(listId) {
  return api(`/list/${listId}/field`).then((d) => d.fields);
}

/** Create a task in a list. */
export function createTask(listId, payload) {
  return api(`/list/${listId}/task`, { method: "POST", body: payload });
}

/** Update an existing task. */
export function updateTask(taskId, payload) {
  return api(`/task/${taskId}`, { method: "PUT", body: payload });
}

/** Fetch one task. */
export function getTask(taskId) {
  return api(`/task/${taskId}`);
}

/** Flat search of tasks in a list. */
export function getTasks(listId, opts = {}) {
  return api(`/list/${listId}/task`, { query: opts });
}
