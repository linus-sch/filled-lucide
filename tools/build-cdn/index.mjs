#!/usr/bin/env node
// Assemble the static bundle that gets deployed to Cloudflare.
//
//   node tools/build-cdn/index.mjs [--out deploy/public]
//
// Everything here is a plain file: no Worker code runs at request time, so the
// whole site is served from Cloudflare's edge for free at any traffic level.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i === -1 ? fallback : argv[i + 1];
};

const root = resolve(argv.includes('--root') ? arg('--root') : '.');
const out = resolve(arg('--out', 'deploy/public'));

const readSets = async () => {
  const sets = [];
  for (const [dir, prefix] of [
    ['icons', 'icons'],
    ['lab', 'lab'],
  ]) {
    const from = join(root, dir);
    const files = (await readdir(from)).filter((f) => f.endsWith('.svg')).sort();
    const icons = [];
    for (const file of files) {
      const name = basename(file, '.svg');
      const source = await readFile(join(from, file), 'utf8');
      const path = source.match(/<path d="([^"]*)"/)?.[1] ?? '';
      let meta = {};
      try {
        meta = JSON.parse(await readFile(join(from, `${name}.json`), 'utf8'));
      } catch {
        meta = {};
      }
      icons.push({
        name,
        path,
        tags: meta.tags ?? [],
        categories: meta.categories ?? [],
        aliases: (meta.aliases ?? [])
          .map((a) => (typeof a === 'string' ? a : a.name))
          .filter(Boolean),
      });
    }
    sets.push({ prefix, icons });
  }
  return sets;
};

const iconFile = (d) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="${d}"/></svg>`;

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** One <symbol> per icon, for same-origin `<use href="/sprite.svg#name">`. */
const buildSprite = (icons) =>
  `<svg xmlns="http://www.w3.org/2000/svg">\n${icons
    .map(
      (i) =>
        `<symbol id="${i.name}" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="${escapeAttr(i.path)}"/></symbol>`,
    )
    .join('\n')}\n</svg>\n`;

async function main() {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const sets = await readSets();
  const summary = [];

  for (const { prefix, icons } of sets) {
    const dir = join(out, prefix);
    await mkdir(dir, { recursive: true });
    // Served files are minified: the repo keeps Lucide's readable layout, the
    // edge does not need the whitespace.
    for (const icon of icons)
      await writeFile(join(dir, `${icon.name}.svg`), iconFile(icon.path), 'utf8');

    await writeFile(
      join(out, `${prefix}.json`),
      JSON.stringify(Object.fromEntries(icons.map((i) => [i.name, i.path]))),
      'utf8',
    );
    await writeFile(
      join(out, `${prefix}-index.json`),
      JSON.stringify(icons.map((i) => ({ n: i.name, t: i.tags, c: i.categories, a: i.aliases }))),
      'utf8',
    );
    await writeFile(
      join(out, prefix === 'icons' ? 'sprite.svg' : `sprite-${prefix}.svg`),
      buildSprite(icons),
      'utf8',
    );
    summary.push({ prefix, count: icons.length });
  }

  const categories = Object.fromEntries(
    await Promise.all(
      (await readdir(join(root, 'categories')))
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const meta = JSON.parse(await readFile(join(root, 'categories', f), 'utf8'));
          return [basename(f, '.json'), meta.title ?? basename(f, '.json')];
        }),
    ),
  );
  await writeFile(join(out, 'categories.json'), JSON.stringify(categories), 'utf8');

  const total = summary.reduce((s, x) => s + x.count, 0);
  await writeFile(
    join(out, 'meta.json'),
    JSON.stringify(
      { name: 'filled-lucide', total, sets: summary, generated: new Date().toISOString() },
      null,
      2,
    ),
    'utf8',
  );

  await cp(join(root, 'tools/build-cdn/site'), out, { recursive: true });

  console.log(`CDN bundle -> ${out}`);
  for (const { prefix, count } of summary) console.log(`  ${prefix}: ${count} icons`);
}

await main();
