#!/usr/bin/env node
// Render contact sheets of the icon set so the result can be eyeballed.
//
//   node tools/fill-icons/preview.mjs [--dir icons] [--out DIR] [--cols 10]
//                                     [--rows 10] [--cell 100] [--icon 56]
//                                     [--compare ../lucide-upstream/icons]
//                                     [--only substr] [--names a,b,c]
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    'preview.mjs [--dir icons] [--out DIR] [--cols 10] [--rows 10] [--cell 100] [--icon 56]\n' +
      '            [--compare outline/icons] [--only substr] [--names a,b,c]',
  );
  process.exit(0);
}
const arg = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i === -1 ? fallback : argv[i + 1];
};

const dir = resolve(arg('--dir', './icons'));
const outDir = resolve(arg('--out', './preview'));
const compare = arg('--compare', null);
const cols = Number(arg('--cols', 10));
const rows = Number(arg('--rows', 10));
const cell = Number(arg('--cell', 100));
const iconSize = Number(arg('--icon', 56));
const only = arg('--only', null);
const names = arg('--names', null);

const inner = (svg) =>
  svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim();

await mkdir(outDir, { recursive: true });

let files = (await readdir(dir)).filter((f) => f.endsWith('.svg')).sort();
if (only) files = files.filter((f) => f.includes(only));
if (names) {
  const set = new Set(names.split(',').map((n) => n.trim()));
  files = files.filter((f) => set.has(basename(f, '.svg')));
}

const perSheet = cols * rows;
const sheets = Math.ceil(files.length / perSheet);
const labelH = 13;
const compareGap = compare ? iconSize + 8 : 0;
const cellH = cell + compareGap;

for (let s = 0; s < sheets; s += 1) {
  const chunk = files.slice(s * perSheet, (s + 1) * perSheet);
  const width = cols * cell;
  const height = Math.ceil(chunk.length / cols) * cellH;
  const parts = [`<rect width="${width}" height="${height}" fill="#ffffff"/>`];

  for (let i = 0; i < chunk.length; i += 1) {
    const name = basename(chunk[i], '.svg');
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * cellH;
    const scale = iconSize / 24;
    const cx = x + (cell - iconSize) / 2;

    if (compare) {
      const ref = inner(await readFile(join(resolve(compare), chunk[i]), 'utf8'));
      parts.push(
        `<g transform="translate(${cx},${y + 4}) scale(${scale})" fill="none" stroke="#9aa4b2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ref}</g>`,
      );
    }
    const svg = inner(await readFile(join(dir, chunk[i]), 'utf8'));
    parts.push(
      `<g transform="translate(${cx},${y + 4 + compareGap}) scale(${scale})" fill="#111827" fill-rule="evenodd">${svg}</g>`,
    );
    parts.push(
      `<text x="${x + cell / 2}" y="${y + cellH - 4}" font-family="Helvetica,Arial" font-size="8" fill="#6b7280" text-anchor="middle">${name}</text>`,
    );
  }

  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + labelH}" viewBox="0 0 ${width} ${height + labelH}">${parts.join('')}</svg>`;
  const png = new Resvg(sheet, {
    font: { loadSystemFonts: true },
    fitTo: { mode: 'width', value: width * 2 },
  })
    .render()
    .asPng();
  const file = join(outDir, `sheet-${String(s + 1).padStart(2, '0')}.png`);
  await writeFile(file, png);
  console.log(`${file}  (${chunk.length} icons)`);
}
