// Lucide cuts a gap into a shape's outline wherever a badge overlaps it —
// `folder-clock`, `file-scan`, `cloud-download`, `sticky-note-x` and friends
// are all "the closed shape, minus the bit the badge covers". Those paths must
// still fill as solid shapes, so we close the gap before solidifying.
//
// Two things keep this from swallowing ordinary open strokes:
//   * the path has to wrap around far enough to be a shape rather than a
//     corner or a single arc (a check mark, an axis pair, a chevron do not),
//   * something else has to be sitting in the gap — the badge that caused it.
//
// The gap is closed by running the two end tangents on to where they meet, so
// a file missing its bottom-left corner gets that corner back instead of a
// diagonal chord across the page. If they meet somewhere implausible we fall
// back to a straight closing line, which is what a cloud's flat base wants.

/** Minimum area a closed-up path must enclose, in square units. */
const MIN_ENCLOSED = 4;
/** The enclosed area must dominate the ink actually drawn. */
const MIN_AREA_RATIO = 1.5;
/** How far the path must turn overall to count as a shape outline. */
const MIN_TURN = (200 * Math.PI) / 180;
/** How close the badge's centreline has to come to the gap (its ink is 1 wide). */
const BADGE_REACH = 2.15;
/** Fewer commands than this and it is a single arc or corner, not a shape. */
const MIN_COMMANDS = 3;
/** How far past the ends the mitre may run, relative to the gap width. */
const MAX_MITRE = 1.4;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);

function normalize(v) {
  const l = len(v);
  return l < 1e-9 ? null : [v[0] / l, v[1] / l];
}

/** Direction of travel over the first/last `span` units of the path. */
function endTangent(pts, atEnd, span = 0.35) {
  if (atEnd) {
    const tip = pts[pts.length - 1];
    for (let i = pts.length - 2; i >= 0; i -= 1) {
      if (len(sub(tip, pts[i])) >= span || i === 0) return normalize(sub(tip, pts[i]));
    }
  } else {
    const tip = pts[0];
    for (let i = 1; i < pts.length; i += 1) {
      if (len(sub(pts[i], tip)) >= span || i === pts.length - 1) return normalize(sub(pts[i], tip));
    }
  }
  return null;
}

function polygonArea(pts) {
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function pathLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) total += len(sub(pts[i], pts[i - 1]));
  return total;
}

/** Sum of the absolute turn at every vertex, in radians. */
function totalTurning(pts) {
  let turn = 0;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const a = normalize(sub(pts[i], pts[i - 1]));
    const b = normalize(sub(pts[i + 1], pts[i]));
    if (!a || !b) continue;
    turn += Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1])));
  }
  return turn;
}

function boundingBox(pts) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Where the outgoing and incoming tangents meet, if that point is sensible.
 * `loose` drops the distance limits, for corners an override asks for.
 */
export function mitrePoint(pts, loose = false) {
  const last = pts[pts.length - 1];
  const first = pts[0];
  const out = endTangent(pts, true);
  const back = endTangent(pts, false);
  if (!out || !back) return null;
  const into = [-back[0], -back[1]];

  const denominator = out[0] * into[1] - out[1] * into[0];
  if (Math.abs(denominator) < 0.2) return null; // near-parallel: no usable corner
  const delta = sub(first, last);
  const t = (delta[0] * into[1] - delta[1] * into[0]) / denominator;
  const s = (delta[0] * out[1] - delta[1] * out[0]) / denominator;
  if (t <= 0.05 || s <= 0.05) return null;

  const gap = len(delta);
  if (loose) return [last[0] + out[0] * t, last[1] + out[1] * t];
  if (t > MAX_MITRE * gap || s > MAX_MITRE * gap) return null;

  const point = [last[0] + out[0] * t, last[1] + out[1] * t];
  const box = boundingBox(pts);
  const margin = 0.25;
  if (point[0] < box.minX - margin || point[0] > box.maxX + margin) return null;
  if (point[1] < box.minY - margin || point[1] > box.maxY + margin) return null;
  return point;
}

function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Close open subpaths whose gap is covered by another element. `force` skips
 * the "is this really a shape" heuristics for icons listed in the overrides.
 */
export function closeBadgeGaps(elements, { force = false } = {}) {
  const subs = [];
  for (const el of elements) for (const s of el.subpaths) subs.push(s);

  for (let i = 0; i < subs.length; i += 1) {
    const s = subs[i];
    if (s.closed || s.pts.length < 3) continue;
    if ((s.commands ?? 0) < MIN_COMMANDS) continue;

    const first = s.pts[0];
    const last = s.pts[s.pts.length - 1];
    if (len(sub(first, last)) < 0.05) continue;
    if (!force && totalTurning(s.pts) < MIN_TURN) continue;

    const corner = mitrePoint(s.pts);
    const candidate = corner ? [...s.pts, corner] : s.pts;

    const enclosed = polygonArea(candidate);
    if (enclosed < MIN_ENCLOSED) continue;
    if (!force && enclosed < MIN_AREA_RATIO * pathLength(s.pts) * 2) continue;

    // Is another element covering the gap we are about to bridge?
    const bridged = subs.some((other, j) => {
      if (j === i) return false;
      return other.pts.some(
        (p) =>
          distanceToSegment(p, last, corner ?? first) <= BADGE_REACH ||
          (corner ? distanceToSegment(p, corner, first) <= BADGE_REACH : false),
      );
    });
    if (!bridged && !force) continue;

    s.drawn = s.pts.slice();
    if (corner) s.pts.push(corner);
    s.closed = true;
  }
}
