# Lucide Filled

- `icons/` and `lab/` are generated from `outline/` by `tools/fill-icons`. Never hand-edit them; change an icon through its override in `tools/fill-icons/overrides/`.
- **Approved icons are locked.** The user approves icons in the review page (`pnpm fill:review`, http://localhost:4321). An approved icon has a snapshot in `tools/fill-icons/approved/<icons|lab>/NAME.svg`. Never modify, regenerate, delete or "fix" an approved icon, its snapshot, or (in a way that would change it) its override — not even as part of a set-wide pass. If an approved icon looks wrong, tell the user and let them unapprove it in the review page first.
- The generator (`pnpm fill`, `pnpm fill:lab`) already skips approved icons and restores them from their snapshot; do not work around that.
- `pnpm fill:check` fails if any approved icon differs from its snapshot; it runs in the pre-commit hook. A Claude Code hook (`tools/fill-icons/guard-approved.mjs`, wired in `../.claude/settings.json`) blocks edits to approved icons and snapshots.
