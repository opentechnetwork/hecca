// Attach Google Drive links to ClickUp tasks.
// Appends (or refreshes) a "Related files" block in each task description.
//
// Usage:
//   node scripts/attach-drive-links.mjs --dry-run
//   node scripts/attach-drive-links.mjs
//   node scripts/attach-drive-links.mjs --comment   # also post a comment per link
import { api } from "./clickup.mjs";
import { driveLinks } from "../data/drive-links.mjs";

const dryRun = process.argv.includes("--dry-run");
const alsoComment = process.argv.includes("--comment");
const HEADING = "## 📁 Related files";
const START = "<!-- drive-links:start -->";
const END = "<!-- drive-links:end -->";

const entries = driveLinks.filter((e) => (e.links ?? []).some((l) => l.url));
if (!entries.length) {
  console.log("No links defined in data/drive-links.mjs yet — nothing to do.");
  process.exit(0);
}

let updated = 0;
let skipped = 0;

for (const entry of entries) {
  const task = await api(`/task/${entry.taskId}?include_markdown_description=true`);
  const current = task.markdown_description ?? "";
  const usable = entry.links.filter((l) => l.url);

  const block =
    `${START}\n${HEADING}\n\n` +
    usable.map((l) => `- [${l.label}](${l.url})`).join("\n") +
    `\n${END}`;

  const hasBlock = current.includes(START);
  const next = hasBlock
    ? current.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block)
    : `${current.trim()}\n\n${block}`.trim();

  // The block is refreshed in place when it already exists, so re-runs update
  // labels/urls without duplicating the section.
  if (dryRun) {
    console.log(`\n[dry-run] ${entry.taskId}  ${entry.task}`);
    for (const l of usable) console.log(`    - ${l.label}: ${l.url}`);
    continue;
  }

  await api(`/task/${entry.taskId}`, {
    method: "PUT",
    body: { markdown_description: next },
  });

  if (alsoComment) {
    const body =
      `📁 **Related files**\n\n` +
      usable.map((l) => `- ${l.label}: ${l.url}`).join("\n");
    await api(`/task/${entry.taskId}/comment`, { method: "POST", body: { comment_text: body } });
  }

  updated++;
  console.log(`✓ ${entry.taskId}  ${entry.task}  (${usable.length} link${usable.length > 1 ? "s" : ""})`);
}

console.log(`\nDone. updated=${updated} skipped=${skipped}`);
