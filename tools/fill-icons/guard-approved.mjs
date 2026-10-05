#!/usr/bin/env node
// Claude Code PreToolUse hook: refuse edits to approved icons and their
// snapshots. The user unapproves an icon in `pnpm fill:review` to unlock it.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const APPROVED_DIR = join(here, 'approved');

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name: tool, tool_input: args = {} } = input;

const block = (why) => {
  console.error(`${why} Approved icons are locked; ask the user to unapprove it in the review page first.`);
  process.exit(2);
};

if (tool === 'Bash') {
  const cmd = String(args.command ?? '');
  if (/fill-icons\/approved\b/.test(cmd) && /\b(rm|mv|cp|unlink|tee|truncate|rsync)\b|sed\s+-i|>|git\s+(checkout|restore|reset|clean|rm|stash)/.test(cmd)) {
    block('This command could change the approved-icon snapshots.');
  }
} else {
  const file = args.file_path ?? args.notebook_path;
  if (file) {
    const path = resolve(input.cwd ?? process.cwd(), file);
    if (path.startsWith(APPROVED_DIR + '/')) block(`${path} is an approved-icon snapshot.`);
    for (const set of ['icons', 'lab']) {
      if (dirname(path) === join(root, set) && existsSync(join(APPROVED_DIR, set, basename(path)))) {
        block(`${set}/${basename(path)} is approved.`);
      }
    }
  }
}
