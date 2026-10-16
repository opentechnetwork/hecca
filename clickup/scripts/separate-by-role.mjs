// Split tasks between the dev and owner "todo" statuses based on their role tag.
// Usage:
//   node scripts/separate-by-role.mjs --dry-run
//   node scripts/separate-by-role.mjs
import { api, getTasks, updateTask } from "./clickup.mjs";

const LIST_ID = "1000450000011547";
const DEV_STATUS = "todo dev";
const OWNER_STATUS = "todo owner";

const dryRun = process.argv.includes("--dry-run");

const list = await api(`/list/${LIST_ID}`);
const valid = new Set(list.statuses.map((s) => s.status));
for (const s of [DEV_STATUS, OWNER_STATUS]) {
  if (!valid.has(s)) {
    throw new Error(`Status "${s}" not found in list. Available: ${[...valid].join(", ")}`);
  }
}

const { tasks } = await getTasks(LIST_ID, { subtasks: true });
let moved = 0;
let unchanged = 0;

for (const t of tasks) {
  const tags = (t.tags ?? []).map((x) => x.name);
  const role = tags.includes("owner") ? "owner" : tags.includes("dev") ? "dev" : null;
  if (!role) {
    console.log(`  ? no role tag   ${t.name}`);
    continue;
  }
  const target = role === "owner" ? OWNER_STATUS : DEV_STATUS;
  if (t.status?.status === target) {
    unchanged++;
    continue;
  }
  if (dryRun) {
    console.log(`  would move  [${role}]  "${t.status.status}" -> "${target}"   ${t.name}`);
  } else {
    await updateTask(t.id, { status: target });
    moved++;
    console.log(`  ✓ moved  [${role}]  -> "${target}"   ${t.name}`);
  }
}

console.log(`\nDone. moved=${moved} already_correct=${unchanged}`);
