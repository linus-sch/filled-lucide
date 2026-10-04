// Turn boolean-op output (dense polygons) back into compact cubic Bezier path
// data.
//
// Clipper emits long edges verbatim and flattens arcs into short chords, so
// edge length alone separates the two: long edges become `L` commands, runs of
// short chords are fitted with Schneider's algorithm. Keeping them apart
// matters — fitting a straight edge that has no interior sample points lets the
// curve bow away unchecked.
import fitCurve from 'fit-curve';
import { fromClipper } from './geom.mjs';

/** Edges longer than this are straight lines, not arc chords. */
const STRAIGHT_EDGE = 0.3;
/** A direction change this sharp is a hard corner, not curvature. */
const CORNER_ANGLE = (30 * Math.PI) / 180;
const CORNER_WINDOW = 0.1; // arclength used to measure a turn
const FIT_ERROR = 0.006 ** 2; // fit-curve takes a squared distance tolerance
const CURVE_TOLERANCE = 0.0012;
const LINE_TOLERANCE = 0.0025;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function dedupe(pts, eps = 0.0005) {
  const out = [];
  for (const p of pts) {
    if (!out.length || dist(out[out.length - 1], p) > eps) out.push(p);
  }
  while (out.length > 1 && dist(out[0], out[out.length - 1]) <= eps) out.pop();
  return out;
}

/** Ramer-Douglas-Peucker on an open run. */
function rdp(pts, tolerance) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let index = -1;
  let maxDist = 0;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [px, py] = pts[i];
    let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= tolerance) return [pts[0], pts[pts.length - 1]];
  return [
    ...rdp(pts.slice(0, index + 1), tolerance).slice(0, -1),
    ...rdp(pts.slice(index), tolerance),
  ];
}

/** True where the contour turns too sharply to be curvature. */
function cornerFlags(pts) {
  const n = pts.length;
  const flags = new Array(n).fill(false);
  const reach = (i, step) => {
    let acc = 0;
    let p = pts[i];
    for (let k = 1; k < n; k += 1) {
      p = pts[(i + step * k + n * n) % n];
      acc = dist(pts[i], p);
      if (acc >= CORNER_WINDOW) break;
    }
    return p;
  };
  for (let i = 0; i < n; i += 1) {
    const prev = reach(i, -1);
    const next = reach(i, 1);
    const b = [pts[i][0] - prev[0], pts[i][1] - prev[1]];
    const f = [next[0] - pts[i][0], next[1] - pts[i][1]];
    const lb = Math.hypot(b[0], b[1]);
    const lf = Math.hypot(f[0], f[1]);
    if (lb < 1e-9 || lf < 1e-9) continue;
    const cos = Math.max(-1, Math.min(1, (b[0] * f[0] + b[1] * f[1]) / (lb * lf)));
    if (Math.acos(cos) > CORNER_ANGLE) flags[i] = true;
  }
  return flags;
}

const fmt = (v) => {
  const s = v
    .toFixed(3)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
  return s === '-0' ? '0' : s;
};

const lineTo = (p) => `L${fmt(p[0])} ${fmt(p[1])}`;

function curveTo(run, out) {
  const simple = rdp(run, CURVE_TOLERANCE);
  if (simple.length === 2) {
    out.push(lineTo(simple[1]));
    return;
  }
  for (const c of fitCurve(simple, FIT_ERROR)) {
    out.push(
      `C${fmt(c[1][0])} ${fmt(c[1][1])} ${fmt(c[2][0])} ${fmt(c[2][1])} ${fmt(c[3][0])} ${fmt(c[3][1])}`,
    );
  }
}

function contourToPath(raw) {
  const pts = dedupe(raw);
  const n = pts.length;
  if (n < 3) return '';

  // edgeStraight[i] describes the edge pts[i] -> pts[i+1].
  const edgeStraight = pts.map((p, i) => dist(p, pts[(i + 1) % n]) > STRAIGHT_EDGE);
  const corner = cornerFlags(pts);

  const splits = [];
  for (let i = 0; i < n; i += 1) {
    if (corner[i] || edgeStraight[i] !== edgeStraight[(i - 1 + n) % n]) splits.push(i);
  }

  const out = [];
  if (!splits.length) {
    // Fully smooth loop (a circle, a blob): fit it in one go.
    const loop = rdp([...pts, pts[0]], CURVE_TOLERANCE);
    out.push(`M${fmt(loop[0][0])} ${fmt(loop[0][1])}`);
    curveTo(loop, out);
    out.push('Z');
    return out.join('');
  }

  out.push(`M${fmt(pts[splits[0]][0])} ${fmt(pts[splits[0]][1])}`);
  for (let s = 0; s < splits.length; s += 1) {
    const from = splits[s];
    const to = splits[(s + 1) % splits.length];
    const run = [pts[from]];
    let i = from;
    do {
      i = (i + 1) % n;
      run.push(pts[i]);
    } while (i !== to);

    if (edgeStraight[from]) {
      for (const p of rdp(run, LINE_TOLERANCE).slice(1)) out.push(lineTo(p));
    } else {
      curveTo(run, out);
    }
  }
  out.push('Z');
  return out.join('');
}

/** Region (Clipper contours) -> single `d` string using the even-odd rule. */
export function regionToPathData(region) {
  const parts = [];
  for (const contour of region ?? []) {
    const d = contourToPath(fromClipper(contour));
    if (d) parts.push(d);
  }
  return parts.join('');
}
