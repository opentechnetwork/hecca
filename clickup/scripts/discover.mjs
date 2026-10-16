// Discovery: workspaces, spaces, folders, lists, and members.
// Run: node scripts/discover.mjs
import {
  getWorkspaces,
  getSpaces,
  getFolders,
  getFolderlessLists,
  getListsInFolder,
  getListMembers,
} from "./clickup.mjs";

const teams = await getWorkspaces();
if (!teams.length) {
  console.log("No workspaces visible to this token.");
  process.exit(0);
}

for (const team of teams) {
  console.log(`\n=== Workspace: ${team.name}  (id ${team.id}) ===`);
  if (team.members?.length) {
    console.log("  Members:");
    for (const m of team.members) {
      console.log(`    - ${m.user?.username ?? m.user?.email}  <${m.user?.email}>  id ${m.user?.id}`);
    }
  }

  const spaces = await getSpaces(team.id);
  for (const space of spaces) {
    console.log(`\n  Space: ${space.name}  (id ${space.id})`);

    const folderless = await getFolderlessLists(space.id);
    if (folderless.length) {
      console.log(`    (folderless lists)`);
      for (const l of folderless) console.log(`      - ${l.name}  id ${l.id}`);
    }

    const folders = await getFolders(space.id);
    for (const folder of folders) {
      console.log(`    Folder: ${folder.name}  (id ${folder.id})`);
      const lists = await getListsInFolder(folder.id);
      for (const l of lists) {
        console.log(`      - List: ${l.name}  id ${l.id}`);
        const members = await getListMembers(l.id).catch(() => []);
        if (members.length) {
          console.log(
            `          members: ${members.map((m) => m.username ?? m.email).join(", ")}`,
          );
        }
      }
    }
  }
}

console.log("\nDone. Share the workspace/space/list IDs you want tasks created in.");
