# clickup

Standalone ClickUp integration for building and assigning tasks (developer vs. owner)
as part of the branding/build review. Separate from the `family-law-results` site and
from `hecca-shop`.

## Setup

1. In ClickUp: click your avatar → **Settings → Apps → API Token → Generate**.
   The token starts with `pk_`.
2. Put it in `.env`:

   ```
   CLICKUP_TOKEN=pk_...
   CLICKUP_API_BASE=https://api.clickup.com/api/v2
   ```

   `.env` is git-ignored. Do not commit it or paste the token into chat.

## Commands

```sh
node scripts/discover.mjs          # workspaces, spaces, folders, lists, members
node scripts/inspect-list.mjs      # statuses, members, custom fields for one list
node scripts/seed-tasks.mjs        # create tasks (idempotent; --dry-run to preview)
node scripts/list-tasks.mjs        # board report grouped by status
node scripts/separate-by-role.mjs  # move tasks between todo dev / todo owner (--dry-run to preview)
node scripts/attach-drive-links.mjs  # attach Google Drive links to tasks (--dry-run to preview)
```

## Live IDs

| Thing | ID |
| --- | --- |
| Workspace (Open Web Communications) | `90131055200` |
| Space (HECCA Shop) | `1000450000005933` |
| List (Website Build) | `1000450000011547` |
| David Burns (developer) | `132279308` |
| Heather Sylvan (owner) | `101385323` |

## Done

- List renamed `List` → **Website Build**
- Tags created: `dev`, `owner` (black `#0F0F0F` background, white `#FFFFFF` label)
- **34 tasks created** (20 dev / 14 owner), all in `to do`, all assigned
- Source task definitions: `data/tasks.mjs`
- Proposal / rationale: `reports/proposed-tasks.md`

## Roles

- **David** — developer
- **Heather** — owner

Tasks are split by role: engineering/build items for the developer, and
content/branding/approval/business items for the owner.

## Agreed structure

- **Space:** HECCA Shop
- **Layout:** single list, **board view**
- **Statuses (board order):**
  - `todo dev` — 20 dev tasks
  - `todo owner` — 14 owner tasks
  - `in progress` — shared
  - `complete` — shared
- **Split by:** assignee (developer vs owner) + a role tag (`dev` / `owner`)
- Tasks are created in previewed batches after approval — never bulk-created blind.

Statuses cannot be created, renamed, reordered, or regrouped through the ClickUp API —
that is a UI-only operation. If status names change again, update `DEV_STATUS` /
`OWNER_STATUS` in `scripts/separate-by-role.mjs`.

## Workflow

1. Discover workspace structure and confirm the target list(s) + member IDs.
2. Analyze the live brand URL and the build to derive tasks.
3. Review the proposed task list (titles, descriptions, assignees, priorities, due dates).
4. Create tasks only after approval.
