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
      const outline = await readFile(join(root, 'outline', dir, file), 'utf8');
      const outlineBody = outline
        .replace(/^[\s\S]*?<svg\b[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '')
        .trim();
      let meta = {};
      try {
        meta = JSON.parse(await readFile(join(from, `${name}.json`), 'utf8'));
      } catch {
        meta = {};
      }
      icons.push({
        name,
        path,
        outline,
        outlineBody,
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

const buildOutlineSprite = (icons) =>
  `<svg xmlns="http://www.w3.org/2000/svg">\n${icons
    .map(
      (i) =>
        `<symbol id="${i.name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${i.outlineBody}</symbol>`,
    )
    .join('\n')}\n</svg>\n`;

const REPO = 'https://github.com/linus-sch/filled-lucide';

/** Published packages in display order, with the logo and the upstream package each replaces. */
const PACKAGES = [
  { dir: 'lucide', logo: 'js', upstream: 'lucide' },
  { dir: 'lucide-react', logo: 'react', upstream: 'lucide-react' },
  { dir: 'vue', logo: 'vue', upstream: '@lucide/vue' },
  { dir: 'svelte', logo: 'svelte', upstream: '@lucide/svelte' },
  { dir: 'lucide-solid', logo: 'solid', upstream: 'lucide-solid' },
  { dir: 'lucide-preact', logo: 'preact', upstream: 'lucide-preact' },
  { dir: 'lucide-react-native', logo: 'react-native', upstream: 'lucide-react-native' },
  { dir: 'angular', logo: 'angular', upstream: '@lucide/angular' },
  { dir: 'astro', logo: 'astro', logoDark: 'astro-dark', upstream: '@lucide/astro' },
  { dir: 'lucide-static', logo: 'svg', upstream: 'lucide-static' },
  { dir: 'icons', upstream: '@lucide/icons' },
  { dir: 'lab', upstream: '@lucide/lab' },
];

const escapeHtml = (s) => escapeAttr(s).replace(/>/g, '&gt;');

/** One card per published package for /packages/, read from each package.json. */
const buildPackageCards = async () => {
  const cards = [];
  for (const { dir, logo, logoDark, upstream } of PACKAGES) {
    const { name, description } = JSON.parse(
      await readFile(join(root, 'packages', dir, 'package.json'), 'utf8'),
    );
    const npm = `https://www.npmjs.com/package/${name}`;
    const logoSrc = logo ? `/framework-logos/${logo}.svg` : '/filed-lucide-logo.svg?v=2';
    const logos = logoDark
      ? `<img class="logo-light" src="${logoSrc}" alt=""><img class="logo-dark" src="/framework-logos/${logoDark}.svg" alt="">`
      : `<img src="${logoSrc}" alt="">`;
    cards.push(`<article class="package-card">
          <header>
            <div class="package-logo">${logos}</div>
            <div class="package-title">
              <h2>${escapeHtml(name)}</h2>
              <a href="${npm}" target="_blank" rel="noreferrer"><img src="https://img.shields.io/npm/v/${name}" alt="npm version" height="20"></a>
              <a href="${npm}" target="_blank" rel="noreferrer"><img src="https://img.shields.io/npm/dw/${name}" alt="npm downloads" height="20"></a>
            </div>
          </header>
          <p>${escapeHtml(description)} Drop-in for <code>${escapeHtml(upstream)}</code>.</p>
          <footer>
            <a class="pill-button pill-button-primary" href="${REPO}/blob/main/packages/${dir}/README.md" target="_blank" rel="noreferrer">Guide</a>
            <a class="pill-button" href="${REPO}/tree/main/packages/${dir}" target="_blank" rel="noreferrer">Source</a>
          </footer>
        </article>`);
  }
  return cards.join('\n        ');
};

async function main() {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const sets = await readSets();
  const summary = [];

  for (const { prefix, icons } of sets) {
    const dir = join(out, prefix);
    await mkdir(dir, { recursive: true });
    const outlineDir = join(out, 'outline', prefix);
    await mkdir(outlineDir, { recursive: true });
    // Served files are minified: the repo keeps Lucide's readable layout, the
    // edge does not need the whitespace.
    for (const icon of icons) {
      await writeFile(join(dir, `${icon.name}.svg`), iconFile(icon.path), 'utf8');
      await writeFile(join(outlineDir, `${icon.name}.svg`), icon.outline, 'utf8');
    }

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
    await writeFile(
      join(out, prefix === 'icons' ? 'sprite-outline.svg' : `sprite-outline-${prefix}.svg`),
      buildOutlineSprite(icons),
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

  const packagesPage = join(out, 'packages/index.html');
  const cards = await buildPackageCards();
  await writeFile(
    packagesPage,
    (await readFile(packagesPage, 'utf8')).replace('<!-- package-cards -->', cards),
    'utf8',
  );

  console.log(`CDN bundle -> ${out}`);
  for (const { prefix, count } of summary) console.log(`  ${prefix}: ${count} icons`);
}

await main();
