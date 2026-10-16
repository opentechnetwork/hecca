// Inspect one list: statuses, members, custom fields.
// Usage: node scripts/inspect-list.mjs [listId]
import { api, getListMembers, getListCustomFields } from "./clickup.mjs";

const listId = process.argv[2] ?? "1000450000011547";
const { id, name, task_count, statuses, space, folder } = await api(`/list/${listId}`);

console.log(`List:   ${name}  (id ${id})`);
console.log(`Space:  ${space?.name} (${space?.id})`);
console.log(`Folder: ${folder?.name ?? "(none)"}`);
console.log(`Tasks:  ${task_count}`);
console.log("\nStatuses (board order):");
for (const s of statuses ?? []) {
  console.log(`  - ${s.status}  [${s.type}]  color=${s.color}`);
}

const members = await getListMembers(listId).catch(() => []);
console.log("\nList members:");
for (const m of members) console.log(`  - ${m.username ?? m.email}  id ${m.id}`);

const fields = await getListCustomFields(listId).catch(() => []);
console.log("\nCustom fields:");
if (!fields.length) console.log("  (none)");
for (const f of fields) console.log(`  - ${f.name}  type=${f.type}  id=${f.id}`);
