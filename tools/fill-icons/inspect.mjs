#!/usr/bin/env node
// List an icon's subpath units — the indices `OVERRIDES` refer to.
//
//   node tools/fill-icons/inspect.mjs NAME [--src outline/icons]
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseIcon } from './lib/parse.mjs';
import { initGeom } from './lib/geom.mjs';
import { toUnits } from './lib/solidify.mjs';
import { applyOverride, useLabOverrides } from './lib/overrides.mjs';

const argv = process.argv.slice(2);
const name = argv[0];
const srcIdx = argv.indexOf('--src');
const src = resolve(srcIdx === -1 ? './outline/icons' : argv[srcIdx + 1]);

useLabOverrides(src.endsWith('lab'));
await initGeom();
const svg = readFileSync(join(src, `${name}.svg`), 'utf8');
const units = toUnits(applyOverride(name, parseIcon(svg)));
const fmt = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
for (const u of units) {
  const s = u.subpaths[0];
  const xs = s.pts.map((p) => p[0]);
  const ys = s.pts.map((p) => p[1]);
  console.log(
    `${String(u.index).padStart(2)}  ${s.closed ? 'closed' : 'open  '}  ` +
      `from ${fmt(s.pts[0])} to ${fmt(s.pts.at(-1))}  ` +
      `bbox ${Math.min(...xs).toFixed(1)},${Math.min(...ys).toFixed(1)}–${Math.max(...xs).toFixed(1)},${Math.max(...ys).toFixed(1)}`,
  );
}
