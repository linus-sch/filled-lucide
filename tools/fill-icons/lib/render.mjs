// Render one icon by name to a filled region: the source outline, its
// override, and the set-wide composition rules that sit above single icons.
//
//   * `-off` icons are drawn as a prohibition sign: the base icon, redrawn
//     smaller, inside a ring, with the bar knocked out of the object where it
//     crosses it and solid where it doesn't. No white halo around the bar.
//   * File icons lose the folded-corner line; the clipped corner of the page
//     already says "document".
//   * An override may start from another icon (`base`) and add layers on top,
//     so variants share their base's drawing instead of re-deriving it.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseIcon } from './parse.mjs';
import { difference, intersection, scaleRegion, strokeRegion, union, unionAll } from './geom.mjs';
import { finish, solidify, STROKE_RADIUS } from './solidify.mjs';
import { applyOverride, iconOptions } from './overrides.mjs';

/** Prohibition sign geometry: ring radius, object scale, bar ends. */
const OFF_RING = 10;
const OFF_SCALE = 0.68;
const OFF_BAR = OFF_RING / Math.SQRT2;

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

function ring() {
  const n = 720;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [12 + OFF_RING * Math.cos(a), 12 + OFF_RING * Math.sin(a)];
  });
  return strokeRegion([{ pts, closed: true }], STROKE_RADIUS);
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
      // The base drawing is shrunk as a whole — its line weight with it — so
      // the object keeps its proportions, like the picture inside a sign.
      const disc = strokeRegion([{ pts: [[12, 12], [12, 12]], closed: false }], OFF_RING - 2.25);
      const object = intersection(scaleRegion(render(off, transform, seen), OFF_SCALE), disc);
      const bar = strokeRegion(
        [{ pts: [[12 - OFF_BAR, 12 - OFF_BAR], [12 + OFF_BAR, 12 + OFF_BAR]].map(transform ?? ((p) => p)), closed: false }],
        STROKE_RADIUS,
      );
      const crossed = union(difference(object, bar), difference(bar, object));
      region = finish(unionAll([ring(), crossed]));
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

