// Seed the HECCA Website Build list with the proposed tasks.
// Usage:
//   node scripts/seed-tasks.mjs --dry-run   # show what would be created
//   node scripts/seed-tasks.mjs             # create them
import { api, createTask, getTasks } from "./clickup.mjs";
import { tasks } from "../data/tasks.mjs";

const LIST_ID = "1000450000011547";
const SPACE_ID = "1000450000005933";
const LIST_NEW_NAME = "Website Build";
const STATUS = "to do";
const dryRun = process.argv.includes("--dry-run");

// 1. Ensure role tags exist (create_task can create tags, but this is explicit + idempotent).
const existingTags = await api(`/space/${SPACE_ID}/tag`).then((d) => d.tags ?? []);
const have = new Set(existingTags.map((t) => t.name));
for (const tag of ["dev", "owner"]) {
  if (have.has(tag)) {
    console.log(`tag "${tag}" already exists`);
  } else if (dryRun) {
    console.log(`tag "${tag}" would be created`);
  } else {
    await api(`/space/${SPACE_ID}/tag`, {
      method: "POST",
      body: { tag: { name: tag, tag_bg: "#0F0F0F", tag_fg: "#FFFFFF" } },
    });
    console.log(`tag "${tag}" created`);
  }
}

// 2. Rename the list if needed.
const list = await api(`/list/${LIST_ID}`);
if (list.name !== LIST_NEW_NAME) {
  if (dryRun) {
    console.log(`list would be renamed: "${list.name}" -> "${LIST_NEW_NAME}"`);
  } else {
    await api(`/list/${LIST_ID}`, { method: "PUT", body: { name: LIST_NEW_NAME } });
    console.log(`list renamed: "${list.name}" -> "${LIST_NEW_NAME}"`);
  }
} else {
  console.log(`list already named "${LIST_NEW_NAME}"`);
}

// 3. Idempotency: skip tasks whose names already exist in the list.
const { tasks: existing } = await getTasks(LIST_ID);
const existingNames = new Set(existing.map((t) => t.name));

console.log(`\nexisting tasks in list: ${existing.length}`);
console.log(dryRun ? "DRY RUN — nothing will be created\n" : "creating tasks...\n");

let created = 0;
let skipped = 0;
for (const t of tasks) {
  if (existingNames.has(t.name)) {
    console.log(`  skip (exists)  ${t.name}`);
    skipped++;
    continue;
  }
  if (dryRun) {
    console.log(`  would create  [${t.tags.join(",")}] ${t.name}`);
    continue;
  }
  const task = await createTask(LIST_ID, {
    name: t.name,
    description: t.description,
    assignees: t.assignees,
    tags: t.tags.map((name) => ({ name })),
    status: STATUS,
  });
  created++;
  console.log(`  ✓ created  ${task.id}  ${task.name}`);
}

console.log(`\nDone. created=${created} skipped=${skipped} total_defined=${tasks.length}`);
