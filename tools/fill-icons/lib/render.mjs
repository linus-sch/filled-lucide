// Render one icon by name to a filled region: the source outline, its
// override, and the set-wide composition rules that sit above single icons.
//
//   * `-off` icons are the base icon at full size, crossed by Lucide's own
//     corner-to-corner slash as one solid bar. The object is cut back on the
//     upper-right side of the bar only; below it, it runs into the bar.
//   * File icons lose the folded-corner line; the clipped corner of the page
//     already says "document".
//   * An override may start from another icon (`base`) and add layers on top,
//     so variants share their base's drawing instead of re-deriving it.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseIcon } from './parse.mjs';
import { difference, fillRegion, inflate, intersection, strokeRegion, unionAll } from './geom.mjs';
import { finish, solidify, STROKE_RADIUS } from './solidify.mjs';
import { applyOverride, iconOptions } from './overrides.mjs';

/** The `-off` slash (Lucide's `m2 2 20 20`), the gap cut beside it, and the side it is cut on. */
const OFF_BAR = [[2, 2], [22, 22]];
const OFF_GAP = 1.5;
const OFF_GAP_SIDE = [[-12, -12], [36, -12], [36, 36]];

const scaleAbout = (s, [ox, oy] = [12, 12]) => ([x, y]) => [ox + (x - ox) * s, oy + (y - oy) * s];
const compose = (f, g) => (f && g ? (p) => g(f(p)) : (f ?? g));

/** Is this unit the folded corner of a page (`M14 2v4a2 2 0 0 0 2 2h4`)? */
function isFileFold(unit) {
  const s = unit.subpaths[0];
  if (s.closed) return false;
  const xs = s.pts.map((p) => p[0]);
  const ys = s.pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return x0 >= 13.5 && x1 <= 20.5 && y0 >= 1.5 && y1 <= 8.5 && x1 - x0 >= 4 && y1 - y0 >= 4;
}

const isFileIcon = (name) => /^file(-|s?$)/.test(name);

/** The `-off` base for `name`, if the set has one and the rule allows it. */
function offBase(name, src, rule) {
  if (rule.off === false || !name.endsWith('-off')) return null;
  const base = rule.off ?? name.slice(0, -'-off'.length);
  return existsSync(join(src, `${base}.svg`)) ? base : null;
}

export function makeRenderer(src) {
  const cache = new Map();

  function render(name, transform = null, seen = new Set()) {
    const key = `${name}|${transform ? 't' : ''}`;
    if (!transform && cache.has(key)) return cache.get(key);
    if (seen.has(name)) throw new Error(`override base cycle at ${name}`);
    seen.add(name);

    const options = iconOptions(name);
    const rule = options.rule;
    let region;

    const off = offBase(name, src, rule);
    if (off) {
      const object = render(off, transform, seen);
      const t = transform ?? ((p) => p);
      const bar = strokeRegion([{ pts: OFF_BAR.map(t), closed: false }], STROKE_RADIUS);
      // The bar stays one solid stroke from end to end. A gap runs along its
      // upper-right edge where it crosses the object, so it reads as passing
      // over it, rather than a white outline on both sides.
      const gap = intersection(inflate(bar, OFF_GAP), fillRegion([{ pts: OFF_GAP_SIDE.map(t), closed: true }]));
      region = finish(unionAll([bar, difference(object, gap)]));
    } else {
      const svg = readFileSync(join(src, `${name}.svg`), 'utf8');
      const elements = applyOverride(name, parseIcon(svg));
      const start = rule.base
        ? render(rule.base, compose(rule.baseScale ? scaleAbout(rule.baseScale) : null, transform), seen)
        : null;
      region = solidify(elements, {
        ...options,
        transform,
        start,
        drop: isFileIcon(name) && rule.keepFold !== true ? isFileFold : null,
      });
    }
    if (!transform) cache.set(key, region);
    return region;
  }

  return render;
}

