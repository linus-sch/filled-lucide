// Convert one parsed Lucide outline icon into a single filled region.
//
// Lucide draws every icon as a flat list of strokes. To solidify it we
//   1. replace each stroke with its exact outline (Minkowski sum with r=1),
//   2. work out which elements form the icon's *shell* and which are detail
//      drawn inside it,
//   3. fill the shell solid, and
//   4. knock the detail out of it — recursively, so a person drawn inside a
//      square becomes one solid white silhouette rather than loose outlines.
import {
  area,
  components,
  denoise,
  difference,
  fillHoles,
  fillRegion,
  inflate,
  intersection,
  strokeRegion,
  toClipper,
  union,
  unionAll,
} from './geom.mjs';
import { closeBadgeGaps, mitrePoint } from './close.mjs';

export const STROKE_RADIUS = 1; // stroke-width 2, centred

/** Fraction of an element that must sit inside a shell to count as detail. */
const CONTAINMENT = 0.985;
/** Looser test for "drawn on top of", used when ranking nested containers. */
const MOSTLY_INSIDE = 0.7;
/** Enclosed area (square units) an element or group needs to act as a shell. */
const MIN_INTERIOR = 1.2;
/** Overlap area that counts as two elements touching. */
const TOUCH_AREA = 0.02;
/** A mark overlapping the shell by more than this reads as a badge on top. */
const BADGE_OVERLAP = 0.25;
/** White gap left around a badge, in viewBox units. */
const BADGE_GAP = 0.75;
/** More overlaid marks than this and they are parts of the shape, not badges. */
const MAX_BADGES = 2;

function buildElement(el) {
  const stroke = strokeRegion(el.subpaths, STROKE_RADIUS);
  const hasClosed = el.subpaths.some((s) => s.closed && s.pts.length > 2);
  const fill = hasClosed || el.filled ? fillRegion(el.subpaths) : [];
  const solid = fill.length ? union(stroke, fill) : stroke;
  const hull = fillHoles(solid);
  const drawn = el.subpaths.map((s) => (s.drawn ? { pts: s.drawn, closed: false } : s));
  return {
    ...el,
    stroke,
    drawnStroke: drawn.some((s) => s !== el.subpaths[0]) ? strokeRegion(drawn, STROKE_RADIUS) : stroke,
    solid,
    hull,
    solidArea: area(solid),
    hullArea: area(hull),
    interiorArea: area(difference(hull, stroke)),
  };
}

const touches = (a, b) => area(intersection(a, b)) > TOUCH_AREA;

function insideOf(el, hull, hullArea, threshold = CONTAINMENT) {
  if (!hull.length || !el.solidArea) return false;
  if (el.solidArea > hullArea * 0.985) return false;
  return area(intersection(el.solid, hull)) / el.solidArea >= threshold;
}

/** How close to an outline's centreline a stem must start, in viewBox units. */
const STEM_ROOT = 0.08;

const dotAt = ([x, y], r) => [
  toClipper([
    [x - r, y - r],
    [x + r, y - r],
    [x + r, y + r],
    [x - r, y + r],
  ]),
];

/**
 * Is open mark `el` a stem: rooted exactly on an outline Lucide actually drew
 * (`stroke`), hanging free at its other end, and closing off no new area?
 */
function growsFrom(el, stroke, shellHull) {
  const sub = el.subpaths[0];
  if (el.subpaths.length !== 1 || sub.closed) return false;
  const joined = union(shellHull, el.solid);
  if (area(fillHoles(joined)) - area(joined) > TOUCH_AREA) return false;
  const centreline = inflate(stroke, -(STROKE_RADIUS - STEM_ROOT));
  const clear = inflate(shellHull, STROKE_RADIUS);
  const ends = [sub.pts[0], sub.pts.at(-1)];
  return ends.some(
    (root, k) =>
      area(intersection(dotAt(root, STEM_ROOT / 2), centreline)) > 0 &&
      area(intersection(dotAt(ends[1 - k], STEM_ROOT / 2), clear)) === 0,
  );
}

/** Group elements that overlap into connected clusters. */
function cluster(els, indices) {
  const parent = new Map(indices.map((i) => [i, i]));
  const find = (i) =>
    parent.get(i) === i ? i : (parent.set(i, find(parent.get(i))), parent.get(i));
  for (let a = 0; a < indices.length; a += 1) {
    for (let b = a + 1; b < indices.length; b += 1) {
      const [i, j] = [indices[a], indices[b]];
      if (touches(els[i].solid, els[j].solid)) parent.set(find(i), find(j));
    }
  }
  const groups = new Map();
  for (const i of indices) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }
  return [...groups.values()];
}

/**
 * Split elements into the shell (what becomes solid), detail drawn inside it
 * (what gets knocked out) and marks that sit outside the shell entirely.
 */
function partition(els, stems = true) {
  const all = els.map((_, i) => i);

  // Elements that enclose area on their own, minus any nested inside another.
  const enclosing = all.filter((i) => els[i].interiorArea >= MIN_INTERIOR);
  // A closed mark lying mostly over a bigger shape (the pen on `square-pen`)
  // is not a shell of its own, even where it pokes out past the edge.
  const outermost = enclosing.filter(
    (i) =>
      !enclosing.some(
        (j) =>
          j !== i &&
          els[j].hullArea > els[i].hullArea &&
          insideOf(els[i], els[j].hull, els[j].hullArea, MOSTLY_INSIDE),
      ),
  );

  const shell = new Set(outermost);
  let shellRegion = unionAll(outermost.map((i) => els[i].solid));
  let shellHull = shellRegion.length ? fillHoles(shellRegion) : [];
  let shellHullArea = area(shellHull);

  const rest = () => all.filter((i) => !shell.has(i));
  // Only what was drawn: a badge-gap closing edge is not an outline to grow from.
  const shellStroke = () => unionAll([...shell].map((i) => els[i].drawnStroke));
  const refresh = () => {
    shellRegion = unionAll([...shell].map((i) => els[i].solid));
    shellHull = shellRegion.length ? fillHoles(shellRegion) : [];
    shellHullArea = area(shellHull);
  };

  // Marks that extend the silhouette (a padlock shackle, a bell clapper) join
  // the shell; anything that lands inside it is detail.
  const badges = new Set();
  const absorb = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const i of rest()) {
        if (insideOf(els[i], shellHull, shellHullArea)) continue;
        if (!shellRegion.length || !touches(els[i].solid, shellRegion)) continue;
        // A mark lying substantially *over* the shape is a badge: it keeps its
        // own silhouette and a gap, rather than melting into the shell. A
        // stem drawn out from the outline itself (a monitor's stand, a lamp's
        // pole) is part of the silhouette even where it overlaps.
        const overlap = area(intersection(els[i].solid, shellHull)) / els[i].solidArea;
        if (overlap > BADGE_OVERLAP && !(stems && growsFrom(els[i], shellStroke(), shellHull))) {
          badges.add(i);
        }
        shell.add(i);
        refresh();
        changed = true;
      }
    }
  };
  absorb();

  // Nothing self-enclosing: look for a cluster of strokes that together close
  // a shape (a trash can and its lid, a mug and its rim, a one-path table).
  let free = rest().filter((i) => !insideOf(els[i], shellHull, shellHullArea));
  if (free.length) {
    for (const group of cluster(els, free)) {
      const ink = unionAll(group.map((i) => els[i].solid));
      const groupHull = fillHoles(ink);
      if (area(difference(groupHull, ink)) < MIN_INTERIOR) continue;
      // Only the members that shape the silhouette belong to the shell; the
      // rest are rules drawn across it and must stay knocked out.
      const hullArea = area(groupHull);
      for (const i of group) {
        if (group.length > 1) {
          const without = fillHoles(
            unionAll(group.filter((j) => j !== i).map((j) => els[j].solid)),
          );
          if (hullArea - area(without) < 0.05) continue;
        }
        shell.add(i);
      }
    }
    refresh();
    absorb();
  }

  free = rest().filter((i) => !insideOf(els[i], shellHull, shellHullArea));
  const detail = rest().filter((i) => !free.includes(i));

  // One or two marks laid over a shape are badges. A dozen of them are the
  // spokes of a cog or the arms of a drone — parts of the shape itself.
  const badgeList = badges.size <= MAX_BADGES ? [...badges] : [];

  return { shell: [...shell], detail, free, badges: badgeList };
}

function solidifyGroup(els, stems = true) {
  if (!els.length) return [];
  const { shell, detail, free, badges } = partition(els, stems);
  const badgeSet = new Set(badges);

  const core = shell.filter((i) => !badgeSet.has(i));
  const shellRegion = unionAll(core.map((i) => els[i].solid));
  let region = shellRegion.length ? fillHoles(shellRegion) : [];
  const freeRegion = unionAll(free.map((i) => els[i].solid));
  if (freeRegion.length) region = region.length ? union(region, freeRegion) : freeRegion;

  if (badges.length) {
    const badgeRegion = unionAll(badges.map((i) => els[i].solid));
    if (region.length) region = difference(region, inflate(badgeRegion, BADGE_GAP));
    region = region.length ? union(region, badgeRegion) : badgeRegion;
  }

  if (detail.length && region.length) {
    const inner = solidifyGroup(
      detail.map((i) => els[i]),
      stems,
    );
    if (inner.length) region = difference(region, inner);
  }
  return region;
}

/** Drop hairline slivers and specks left behind by boolean ops. */
function tidy(region) {
  const cleaned = denoise(region, 0.02);
  const parts = components(cleaned);
  if (parts.length < 2) return cleaned;
  const keep = parts.filter((p) => area(inflate(p, -0.16)) > 0.004);
  return keep.length ? unionAll(keep) : cleaned;
}

/** One subpath per unit: a single `<path>` often draws a shape and its rules. */
export function toUnits(elements) {
  const units = [];
  for (const el of elements) {
    for (const sub of el.subpaths) units.push({ subpaths: [sub], filled: el.filled });
  }
  return units.map((u, index) => ({ ...u, index }));
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Merge open unit `b` onto the end of open unit `a`, nearest ends together. */
function joinUnits(units, a, b) {
  const p = units[a].subpaths[0];
  const q = units[b].subpaths[0];
  const ends = [
    [p.pts, q.pts],
    [p.pts, [...q.pts].reverse()],
    [[...p.pts].reverse(), q.pts],
    [[...p.pts].reverse(), [...q.pts].reverse()],
  ];
  const [x, y] = ends.reduce((best, cur) =>
    dist(cur[0].at(-1), cur[1][0]) < dist(best[0].at(-1), best[1][0]) ? cur : best,
  );
  p.pts = [...x, ...y];
  p.commands = (p.commands ?? 0) + (q.commands ?? 0) + 1;
  units[b] = null;
}

/**
 * Close an open subpath with a straight edge, at its end tangents' corner
 * (`mitre`), or through explicit points (`{ unit, via: [[x, y], ...] }`).
 */
function closeUnit(unit, mitre, via = null) {
  const s = unit.subpaths[0];
  if (via) s.pts.push(...via);
  else if (mitre) {
    const corner = mitrePoint(s.pts, true);
    if (corner) s.pts.push(corner);
  }
  s.closed = true;
}

/**
 * Render one layer of an override. Modes:
 *   auto   the automatic shell/detail/badge solidify (the default)
 *   fill   the units' outline filled solid, no detail knocked out
 *   stroke the units' strokes only, never filled
 *   cut    knock the units' strokes out of everything below
 *   carve  knock the units' solidified shape out of everything below
 * `gap` (viewBox units, `true` = BADGE_GAP) clears space around the layer
 * before it is laid down, as for a badge.
 */
function renderLayer(region, layer, els, stems) {
  const members = els.filter((e) => layer.units.includes(e.index));
  if (!members.length) return region;
  const mode = layer.mode ?? 'auto';
  let shape;
  if (mode === 'auto') shape = solidifyGroup(members, stems);
  else if (mode === 'fill') shape = fillHoles(unionAll(members.map((e) => e.solid)));
  else if (mode === 'stroke' || mode === 'cut') shape = unionAll(members.map((e) => e.stroke));
  else if (mode === 'carve') shape = solidifyGroup(members, stems);
  else throw new Error(`unknown layer mode ${mode}`);
  if (mode === 'cut' || mode === 'carve') {
    const grow = layer.gap === true ? BADGE_GAP : (layer.gap ?? 0);
    return difference(region, grow ? inflate(shape, grow) : shape);
  }
  if (layer.gap && region.length) {
    region = difference(region, inflate(shape, layer.gap === true ? BADGE_GAP : layer.gap));
  }
  return region.length ? union(region, shape) : shape;
}

/**
 * `rule` is the icon's override (`overrides/NAME.json`): `join` merges pairs
 * of open subpaths end to end, `close` shuts subpaths with a straight edge
 * (or through `{ unit, via }` points; `mitre` runs the end tangents on to a corner instead), and `layers`
 * replaces the automatic solidify with an explicit bottom-to-top stack (see
 * `renderLayer`). Indices are subpath units in document order, as listed by
 * `node tools/fill-icons/inspect.mjs NAME`.
 */
export function solidify(
  elements,
  { keepOutline = false, noClose = false, forceClose = false, rule = {} } = {},
) {
  const units = toUnits(elements);
  const referenced = [
    ...(rule.join ?? []).flat(),
    ...(rule.close ?? []).map((c) => (typeof c === 'number' ? c : c.unit)),
    ...(rule.mitre ?? []),
    ...(rule.layers ?? []).flatMap((l) => l.units),
  ];
  const bad = referenced.filter((i) => !Number.isInteger(i) || !units[i]);
  if (bad.length) throw new Error(`override references missing units ${bad.join(', ')}`);
  for (const [a, b] of rule.join ?? []) joinUnits(units, a, b);
  const live = units.filter(Boolean);
  if (!noClose && !rule.noClose) closeBadgeGaps(live, { force: forceClose });
  for (const c of rule.close ?? []) {
    if (typeof c === 'number') closeUnit(units[c], false);
    else closeUnit(units[c.unit], false, c.via);
  }
  for (const i of rule.mitre ?? []) closeUnit(units[i], true);
  const els = live.map(buildElement).filter((e) => e.solidArea > 0);
  if (!els.length) return [];
  if (keepOutline) return tidy(unionAll(els.map((e) => e.stroke)));
  if (rule.layers) return tidy(rule.layers.reduce((r, layer) => renderLayer(r, layer, els, rule.stems ?? true), []));
  return tidy(solidifyGroup(els, rule.stems ?? true));
}
