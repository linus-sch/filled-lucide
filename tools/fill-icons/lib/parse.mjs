// Parse a Lucide outline SVG into flattened polyline subpaths.
//
// Every Lucide icon is a flat list of shape elements on a 24x24 viewBox with
// stroke-width 2 and round caps/joins, so the parser only has to cover the
// handful of element types the set actually uses.
import svgpath from 'svgpath';

const TAG = /<(path|circle|ellipse|rect|line|polyline|polygon)\b([^>]*)\/?>/g;
const ATTR = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*"([^"]*)"/g;

// Chord tolerance for turning curves into polylines, in viewBox units.
const FLATTEN_TOLERANCE = 0.0008;

function attrs(raw) {
  const out = {};
  let m;
  ATTR.lastIndex = 0;
  while ((m = ATTR.exec(raw)) !== null) out[m[1]] = m[2];
  return out;
}

const num = (v, fallback = 0) => (v === undefined || v === '' ? fallback : parseFloat(v));

/** Number of straight segments needed to keep a curve within FLATTEN_TOLERANCE. */
function steps(...pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i += 1)
    d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return Math.max(4, Math.min(160, Math.ceil(Math.sqrt(d / FLATTEN_TOLERANCE) * 0.9)));
}

function cubic(out, p0, p1, p2, p3) {
  const n = steps(p0, p1, p2, p3);
  for (let i = 1; i <= n; i += 1) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
}

function quad(out, p0, p1, p2) {
  const n = steps(p0, p1, p2);
  for (let i = 1; i <= n; i += 1) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
      u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ]);
  }
}

/** Flatten path data into `[{ pts, closed }]`. */
export function pathToSubpaths(d) {
  const subpaths = [];
  let cur = null;
  let start = [0, 0];
  let pos = [0, 0];

  svgpath(d)
    .abs()
    .unarc()
    .unshort()
    .iterate((seg) => {
      const cmd = seg[0];
      if (cmd === 'M') {
        cur = { pts: [[seg[1], seg[2]]], closed: false, commands: 0 };
        subpaths.push(cur);
        start = [seg[1], seg[2]];
        pos = start;
        return;
      }
      if (!cur) return;
      if (cmd !== 'Z' && cmd !== 'z') cur.commands += 1;
      switch (cmd) {
        case 'L':
          pos = [seg[1], seg[2]];
          cur.pts.push(pos);
          break;
        case 'H':
          pos = [seg[1], pos[1]];
          cur.pts.push(pos);
          break;
        case 'V':
          pos = [pos[0], seg[1]];
          cur.pts.push(pos);
          break;
        case 'C':
          cubic(cur.pts, pos, [seg[1], seg[2]], [seg[3], seg[4]], [seg[5], seg[6]]);
          pos = [seg[5], seg[6]];
          break;
        case 'Q':
          quad(cur.pts, pos, [seg[1], seg[2]], [seg[3], seg[4]]);
          pos = [seg[3], seg[4]];
          break;
        case 'Z':
        case 'z':
          cur.closed = true;
          pos = start;
          break;
        default:
          break;
      }
    });

  // Many Lucide paths return to their start point without an explicit Z;
  // geometrically they are closed shapes and must fill as such.
  for (const s of subpaths) {
    if (s.closed || s.pts.length < 3) continue;
    const a = s.pts[0];
    const b = s.pts[s.pts.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.02) {
      s.pts.pop();
      s.closed = true;
    }
  }

  return subpaths.filter((s) => s.pts.length > 1 || s.closed);
}

function ellipsePoints(cx, cy, rx, ry) {
  const n = Math.max(
    24,
    Math.min(
      400,
      Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - FLATTEN_TOLERANCE / Math.max(rx, ry)))),
    ),
  );
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return [{ pts, closed: true }];
}

function roundedRect(x, y, w, h, rx, ry) {
  const r1 = Math.min(rx, w / 2);
  const r2 = Math.min(ry, h / 2);
  if (r1 <= 0 || r2 <= 0) {
    return [
      {
        pts: [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ],
        closed: true,
      },
    ];
  }
  const pts = [];
  const corner = (cx, cy, from) => {
    const n = Math.max(
      6,
      Math.min(120, Math.ceil(Math.sqrt(Math.max(r1, r2) / FLATTEN_TOLERANCE) * 0.5)),
    );
    for (let i = 0; i <= n; i += 1) {
      const a = from + (i / n) * (Math.PI / 2);
      pts.push([cx + r1 * Math.cos(a), cy + r2 * Math.sin(a)]);
    }
  };
  corner(x + w - r1, y + r2, -Math.PI / 2); // top-right
  corner(x + w - r1, y + h - r2, 0); // bottom-right
  corner(x + r1, y + h - r2, Math.PI / 2); // bottom-left
  corner(x + r1, y + r2, Math.PI); // top-left
  return [{ pts, closed: true }];
}

function points(str, closed) {
  const nums = str
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return [{ pts, closed }];
}

/** Parse an icon SVG into `[{ tag, subpaths, filled }]` in document order. */
export function parseIcon(svg) {
  const elements = [];
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(svg)) !== null) {
    const tag = m[1];
    const a = attrs(m[2]);
    let subpaths = [];
    switch (tag) {
      case 'path':
        subpaths = pathToSubpaths(a.d ?? '');
        break;
      case 'circle':
        subpaths = ellipsePoints(num(a.cx), num(a.cy), num(a.r), num(a.r));
        break;
      case 'ellipse':
        subpaths = ellipsePoints(num(a.cx), num(a.cy), num(a.rx, num(a.ry)), num(a.ry, num(a.rx)));
        break;
      case 'rect':
        subpaths = roundedRect(
          num(a.x),
          num(a.y),
          num(a.width),
          num(a.height),
          num(a.rx, num(a.ry)),
          num(a.ry, num(a.rx)),
        );
        break;
      case 'line':
        subpaths = [
          {
            pts: [
              [num(a.x1), num(a.y1)],
              [num(a.x2), num(a.y2)],
            ],
            closed: false,
          },
        ];
        break;
      case 'polyline':
        subpaths = points(a.points ?? '', false);
        break;
      case 'polygon':
        subpaths = points(a.points ?? '', true);
        break;
      default:
        break;
    }
    if (subpaths.length) {
      for (const sub of subpaths) sub.commands ??= sub.pts.length;
      elements.push({ tag, subpaths, filled: a.fill !== undefined && a.fill !== 'none' });
    }
  }
  return elements;
}
