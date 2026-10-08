/**
 * Pulls the outline sources and metadata of an upstream Lucide checkout into
 * this repo, so `pnpm fill` / `pnpm fill:lab` can regenerate the filled set.
 *
 *   node scripts/syncUpstream.mts --upstream ../lucide-upstream [--version 1.53.0]
 *
 * - upstream icons/*.svg   -> outline/icons/   (mirrored: removed icons are deleted)
 * - upstream icons/*.json  -> icons/           (metadata travels with the filled icon)
 * - upstream lab/*.svg     -> outline/lab/
 * - upstream lab/*.json    -> lab/
 * - upstream categories/   -> categories/
 *
 * Approved icons (tools/fill-icons/approved) are never touched or deleted; if
 * their outline changed or was removed upstream they are listed for re-review.
 * `--version` also sets the version of every publishable package.
 */
import fs from 'fs';
import path from 'path';
import getArgumentOptions from 'minimist';

const root = path.resolve(import.meta.dirname, '..');
const { upstream, version } = getArgumentOptions(process.argv.slice(2), {
  string: ['upstream', 'version'],
});

if (!upstream) {
  console.error(
    'Usage: node scripts/syncUpstream.mts --upstream <lucide checkout> [--version x.y.z]',
  );
  process.exit(1);
}

const upstreamDir = path.resolve(upstream);
const listFiles = (dir: string, ext: string) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => file.endsWith(ext)) : [];
const read = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);

function syncSet(set: 'icons' | 'lab') {
  const srcDir = path.join(upstreamDir, set);
  const outlineDir = path.join(root, 'outline', set);
  const filledDir = path.join(root, set);
  const approvedDir = path.join(root, 'tools/fill-icons/approved', set);

  if (!fs.existsSync(srcDir)) throw new Error(`${srcDir} does not exist`);

  const upstreamSvgs = new Set(listFiles(srcDir, '.svg'));
  const approved = new Set(listFiles(approvedDir, '.svg'));
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];

  for (const file of upstreamSvgs) {
    const next = read(path.join(srcDir, file));
    const current = read(path.join(outlineDir, file));
    if (current === next) continue;
    (current == null ? added : changed).push(file.replace('.svg', ''));
    fs.writeFileSync(path.join(outlineDir, file), next!);
  }

  for (const file of listFiles(outlineDir, '.svg')) {
    if (upstreamSvgs.has(file)) continue;
    const name = file.replace('.svg', '');
    removed.push(name);
    // Approved icons are locked; a removed one is only reported.
    if (approved.has(file)) continue;
    for (const stale of [
      path.join(outlineDir, file),
      path.join(filledDir, file),
      path.join(filledDir, `${name}.json`),
    ]) {
      fs.rmSync(stale, { force: true });
    }
  }

  for (const file of listFiles(srcDir, '.json')) {
    fs.copyFileSync(path.join(srcDir, file), path.join(filledDir, file));
  }

  console.log(
    `${set}: ${added.length} added, ${changed.length} changed, ${removed.length} removed`,
  );
  if (added.length) console.log(`  added: ${added.join(', ')}`);
  if (changed.length) console.log(`  changed: ${changed.join(', ')}`);
  if (removed.length) console.log(`  removed: ${removed.join(', ')}`);

  const staleApproved = [...changed, ...removed].filter((name) => approved.has(`${name}.svg`));
  if (staleApproved.length) {
    console.log(
      `  approved icons changed or removed upstream (left untouched, re-review them): ${staleApproved.join(', ')}`,
    );
  }

  return { added, changed, removed, staleApproved };
}

function syncCategories() {
  const srcDir = path.join(upstreamDir, 'categories');
  const destDir = path.join(root, 'categories');
  const files = new Set(listFiles(srcDir, '.json'));
  for (const file of files) fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  for (const file of listFiles(destDir, '.json')) {
    if (!files.has(file)) fs.rmSync(path.join(destDir, file));
  }
}

function setVersion(next: string) {
  const packagesDir = path.join(root, 'packages');
  for (const dir of fs.readdirSync(packagesDir)) {
    const file = path.join(packagesDir, dir, 'package.json');
    if (!fs.existsSync(file)) continue;
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (pkg.private) continue;
    pkg.version = next;
    fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  console.log(`Set package versions to ${next}`);
}

const icons = syncSet('icons');
const lab = syncSet('lab');
syncCategories();
if (version) setVersion(version.replace(/^v/, ''));

// Machine-readable summary for the sync workflow's PR body.
const summaryFile = process.env.SYNC_SUMMARY_FILE;
if (summaryFile) fs.writeFileSync(summaryFile, JSON.stringify({ icons, lab }, null, 2));
