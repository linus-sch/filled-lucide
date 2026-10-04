// Per-icon adjustments for the handful of icons whose intent the generic
// nesting rules cannot infer from geometry alone.
//
//   drop:  element indices removed before solidifying (document order)
//   extra: path data strings appended as extra units after the source's own
//   join, close, mitre, noClose, layers: see `solidify()`; these take subpath
//   unit indices, which `node tools/fill-icons/inspect.mjs NAME` prints.
//
// Each lives in `overrides/NAME.json` (lab icons: `overrides/lab/NAME.json`),
// one file per icon so they can be reviewed and edited independently.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToSubpaths } from './parse.mjs';

const OVERRIDE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'overrides');

function loadOverrides(dir) {
  if (!existsSync(dir)) return {};
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [basename(f, '.json'), JSON.parse(readFileSync(join(dir, f), 'utf8'))]),
  );
}

export const OVERRIDES = loadOverrides(OVERRIDE_DIR);
export const LAB_OVERRIDES = loadOverrides(join(OVERRIDE_DIR, 'lab'));
let active = OVERRIDES;

/** Lab icons share names with nothing in the main set but keep their own files. */
export function useLabOverrides(lab) {
  active = lab ? LAB_OVERRIDES : OVERRIDES;
}

/**
 * Letterforms and glyphs. Filling these closes their counters and turns them
 * into unreadable blobs, so the stroke *is* the filled shape — the same choice
 * every icon family makes for its typographic marks.
 */
export const KEEP_OUTLINE = new Set([
  'bitcoin',
  'bold',
  'case-kebab',
  'case-lower',
  'case-sensitive',
  'case-snake',
  'case-upper',
  'atom',
  'philippine-peso',
  'phi',
  'russian-ruble',
  'whole-word',
  'zodiac-gemini',
  'zodiac-ophiuchus',
  'zodiac-taurus',
]);

/** Solidify options for one icon. */
export function iconOptions(name) {
  return {
    keepOutline: KEEP_OUTLINE.has(name) || Boolean(active[name]?.keepOutline),
    noClose: NO_CLOSE.has(name),
    forceClose: FORCE_CLOSE.has(name),
    rule: active[name] ?? {},
  };
}

/**
 * Icons drawn as a single open outline with nothing overlapping the gap, where
 * the gap is still meant to read as an edge of the shape.
 */
export const FORCE_CLOSE = new Set(['star-half']);

/**
 * Icons whose open outlines must never be bridged shut: marks that only look
 * like shapes — hooks, loops, rotation arrows, deliberately dashed frames.
 */
export const NO_CLOSE = new Set([
  'at-sign',
  'fishing-hook',
  'fishing-rod',
  'hop',
  'hop-off',
  'iteration-ccw',
  'iteration-cw',
  'lasso',
  'lasso-select',
  'link',
  'link-2',
  'link-2-off',
  'picture-in-picture-2',
  'rotate-3d',
  'rotate-ccw',
  'rotate-ccw-clock',
  'rotate-ccw-key',
  'rotate-ccw-square',
  'rotate-cw',
  'rotate-cw-square',
  'square-bottom-dashed-scissors',
  'square-dashed-bottom',
  'square-dashed-bottom-code',
]);

export function applyOverride(name, elements) {
  const rule = active[name];
  if (!rule) return elements;
  let out = elements;
  if (rule.drop) out = out.filter((_, i) => !rule.drop.includes(i));
  // `extra` path data is appended as further units, for icons that draw an
  // outline and its inner lines in one subpath that cannot otherwise be split.
  for (const d of rule.extra ?? []) {
    const subpaths = pathToSubpaths(d);
    for (const sub of subpaths) sub.commands ??= sub.pts.length;
    out = [...out, { tag: 'path', subpaths, filled: false }];
  }
  return out;
}
