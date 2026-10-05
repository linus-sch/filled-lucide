#!/usr/bin/env node
// Fail if any approved icon differs from the drawing it was approved with.
//
//   node tools/fill-icons/check-approved.mjs
//
// Runs in the pre-commit hook, so a change to an approved icon can't be
// committed. To change one on purpose, unapprove it in `pnpm fill:review`.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const APPROVED_DIR = join(here, 'approved');

const changed = [];
let total = 0;
for (const set of ['icons', 'lab']) {
  const dir = join(APPROVED_DIR, set);
  if (!existsSync(dir)) continue;
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.svg'))) {
    total += 1;
    const target = join(root, set, file);
    const ok = existsSync(target) && (await readFile(target, 'utf8')) === (await readFile(join(dir, file), 'utf8'));
    if (!ok) changed.push(`${set}/${file}`);
  }
}

if (changed.length) {
  console.error(`${changed.length} approved icon(s) differ from their approved drawing:`);
  for (const c of changed) console.error(`  ${c}`);
  console.error('Restore them with `pnpm fill` / `pnpm fill:lab`, or unapprove them in `pnpm fill:review` first.');
  process.exit(1);
}
console.log(`All ${total} approved icons unchanged`);
