// Clipper-backed region algebra. Regions are arrays of integer-coordinate
// contours (`{x, y}` points) scaled by SCALE; outer contours wind positive,
// holes negative.
import {
  loadNativeClipperLibInstanceAsync,
  NativeClipperLibRequestedFormat,
} from 'js-angusj-clipper';

export const SCALE = 4096;

/** Arc flattening used by Clipper's offsetter, in viewBox units. */
const ARC_TOLERANCE = SCALE * 0.0007;

let clipper = null;

export async function initGeom() {
  if (!clipper) {
    clipper = await loadNativeClipperLibInstanceAsync(
      NativeClipperLibRequestedFormat.WasmWithAsmJsFallback,
    );
  }
  return clipper;
}

export const toClipper = (pts) =>
  pts.map(([x, y]) => ({ x: Math.round(x * SCALE), y: Math.round(y * SCALE) }));
export const fromClipper = (path) => path.map((p) => [p.x / SCALE, p.y / SCALE]);

const EMPTY = [];

export function area(region) {
  if (!region || !region.length) return 0;
  let total = 0;
  for (const path of region) total += clipper.area(path);
  return Math.abs(total) / (SCALE * SCALE);
}

function clip(clipType, subject, clipRegion, fillType = 'evenOdd') {
  const subjectInputs = [{ data: subject ?? EMPTY, closed: true }];
  const opts = { clipType, subjectInputs, subjectFillType: fillType };
  if (clipType !== 'union' || (clipRegion && clipRegion.length)) {
    opts.clipInputs = [{ data: clipRegion ?? EMPTY }];
    opts.clipFillType = fillType;
  }
  return clipper.clipToPaths(opts) ?? EMPTY;
}

export const union = (a, b) => clip('union', [...(a ?? EMPTY), ...(b ?? EMPTY)], EMPTY, 'nonZero');
export const unionAll = (regions) => {
  const flat = regions.flat();
  return flat.length ? clip('union', flat, EMPTY, 'nonZero') : EMPTY;
};
export const difference = (a, b) => {
  if (!a || !a.length) return EMPTY;
  if (!b || !b.length) return a;
  return clip('difference', a, b);
};
export const intersection = (a, b) => {
  if (!a || !a.length || !b || !b.length) return EMPTY;
  return clip('intersection', a, b);
};

/** Union treating every contour as a filled outline (drops interior holes). */
export function fillHoles(region) {
  if (!region || !region.length) return EMPTY;
  const outers = region.filter((p) => clipper.area(p) > 0);
  return outers.length ? clip('union', outers, EMPTY, 'nonZero') : EMPTY;
}

/**
 * Minkowski-sum a polyline set with a disc of radius `delta` — an exact model
 * of Lucide's round-cap, round-join stroke.
 */
export function strokeRegion(subpaths, delta) {
  const closed = subpaths.filter((s) => s.closed).map((s) => toClipper(s.pts));
  const open = subpaths.filter((s) => !s.closed).map((s) => toClipper(s.pts));
  const offsetInputs = [];
  if (closed.length) offsetInputs.push({ data: closed, joinType: 'round', endType: 'closedLine' });
  if (open.length) offsetInputs.push({ data: open, joinType: 'round', endType: 'openRound' });
  if (!offsetInputs.length) return EMPTY;
  const out =
    clipper.offsetToPaths({ delta: delta * SCALE, offsetInputs, arcTolerance: ARC_TOLERANCE }) ??
    EMPTY;
  return out.length ? clip('union', out, EMPTY, 'nonZero') : EMPTY;
}

/** The area enclosed by an element's closed subpaths. */
export function fillRegion(subpaths) {
  const closed = subpaths.filter((s) => s.closed && s.pts.length > 2).map((s) => toClipper(s.pts));
  return closed.length ? clip('union', closed, EMPTY, 'nonZero') : EMPTY;
}

/** Grow (positive) or shrink (negative) a region by `delta` viewBox units. */
export function inflate(region, delta) {
  if (!region || !region.length) return EMPTY;
  const out =
    clipper.offsetToPaths({
      delta: delta * SCALE,
      offsetInputs: [{ data: region, joinType: 'round', endType: 'closedPolygon' }],
      arcTolerance: ARC_TOLERANCE,
    }) ?? EMPTY;
  return out.length ? clip('union', out, EMPTY, 'nonZero') : EMPTY;
}

/** Drop specks and hairline slivers left behind by boolean ops. */
export function denoise(region, minArea = 0.012) {
  if (!region || !region.length) return EMPTY;
  const cleaned = clipper.cleanPolygons(region, SCALE * 0.0009) ?? EMPTY;
  const kept = cleaned.filter(
    (p) => p.length > 2 && Math.abs(clipper.area(p)) / (SCALE * SCALE) >= minArea,
  );
  return kept.length ? clip('union', kept, EMPTY, 'nonZero') : EMPTY;
}

export function bounds(region) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of region ?? EMPTY) {
    for (const p of path) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { minX: minX / SCALE, minY: minY / SCALE, maxX: maxX / SCALE, maxY: maxY / SCALE };
}

/** Split a region into connected components (each outer contour with its holes). */
export function components(region) {
  if (!region || !region.length) return [];
  const tree = clipper.clipToPolyTree({
    clipType: 'union',
    subjectInputs: [{ data: region, closed: true }],
    subjectFillType: 'nonZero',
  });
  const out = [];
  const walk = (node) => {
    for (const child of node.childs) {
      if (!child.isHole) {
        const paths = [
          child.contour,
          ...child.childs.filter((c) => c.isHole).map((c) => c.contour),
        ];
        out.push(clip('union', paths, EMPTY, 'evenOdd'));
      }
      walk(child);
    }
  };
  walk(tree);
  return out;
}

/** Scale a region about a point (geometry and stroke weight alike). */
export function scaleRegion(region, s, [ox, oy] = [12, 12]) {
  const cx = ox * SCALE;
  const cy = oy * SCALE;
  return (region ?? EMPTY).map((path) =>
    path.map((p) => ({ x: Math.round(cx + (p.x - cx) * s), y: Math.round(cy + (p.y - cy) * s) })),
  );
}
