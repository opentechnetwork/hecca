// Board report: tasks grouped by status with assignee + tags.
// Usage: node scripts/list-tasks.mjs
import { api, getTasks } from "./clickup.mjs";

const LIST_ID = process.argv[2] ?? "1000450000011547";
const NAMES = { 132279308: "David", 101385323: "Heather" };

const list = await api(`/list/${LIST_ID}`);
const { tasks } = await getTasks(LIST_ID, { subtasks: true });

console.log(`List: ${list.name} (${list.id})  —  ${tasks.length} tasks\n`);

const order = [...(list.statuses ?? [])].sort((a, b) => a.orderindex - b.orderindex);
for (const s of order) {
  const inStatus = tasks.filter((t) => t.status?.status === s.status);
  if (!inStatus.length) continue;
  console.log(`── ${s.status} (${inStatus.length}) ──`);
  for (const t of inStatus) {
    const who = (t.assignees ?? []).map((a) => NAMES[a.id] ?? a.username ?? a.id).join("+") || "—";
    const tags = (t.tags ?? []).map((x) => x.name).join(",") || "—";
    console.log(`   ${t.id}  [${tags}]  ${who.padEnd(9)}  ${t.name}`);
  }
  console.log();
}

const unassigned = tasks.filter((t) => !t.assignees?.length);
console.log(`Unassigned: ${unassigned.length}`);
