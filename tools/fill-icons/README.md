# fill-icons

Turns the upstream Lucide outline icons in `outline/` into the filled set in
`icons/` and `lab/`. This is the maintainer documentation; for using the icons,
see the [main README](../../README.md).

## Design rules

The set is a filled icon family _in Lucide's style_, not a literal fill of each
outline. Composition changes wherever that makes an icon read better solid:

- **No halos.** Secondary symbols (a key on a book, a plus on a file, a check
  on a calendar) sit centred on the main body as a cutout, rather than in a
  corner with a white ring around them.
- **Only lines that carry meaning.** Liquid levels, seams and extra rules that
  only gave an outline icon some interior are dropped.
- **Dividing lines divide.** A line across a body runs through its edge, with
  the resulting corners very slightly rounded.
- **Real holes stay holes** — a handle keeps its finger hole — and parts may
  stay outlined where filling them would need hairline detail (the calendar's
  header).
- **`-off` icons are slashed**: the base icon at full size, crossed by
  Lucide's corner-to-corner slash as one solid bar. A gap runs along the
  bar's upper-right edge only, so the bar reads as passing over the object.
- **File icons have no folded-corner line**; the clipped corner says "page".

## How the icons are generated

`tools/fill-icons/` turns each outline icon into a solid one with exact vector
geometry — no tracing, no rasterisation, so the result stays crisp at any size.

1. **Parse** (`lib/parse.mjs`) — each `<path>`, `<circle>`, `<rect>`, `<line>`,
   `<polyline>`, `<polygon>` becomes flattened polylines. Paths that return to
   their start without a `Z` are recognised as closed shapes.
2. **Close badge gaps** (`lib/close.mjs`) — Lucide cuts a hole in a shape's
   outline wherever a badge overlaps it (`folder-clock`, `cloud-download`,
   `star-plus`, `file-scan`, …). Those paths are closed again by running the two
   end tangents on to where they meet, which recovers the shape's real corner
   instead of slicing a chord across it. A path only qualifies if it turns far
   enough to be an outline rather than a corner, encloses meaningfully more area
   than the ink it is drawn with, and has something sitting in the gap — so
   check marks, heartbeat lines and spinner arcs are left alone.
3. **Outline the strokes** (`lib/geom.mjs`) — every stroke is replaced by its
   exact outline: the Minkowski sum of the polyline with a disc of radius 1,
   computed with Clipper. Lucide's round caps and joins make this exact rather
   than an approximation.
4. **Work out the nesting** (`lib/solidify.mjs`) — elements are sorted into the
   _shell_ (what becomes solid), _detail_ drawn inside it (knocked out), and
   _badges_ laid over it (kept as their own silhouette with a gap around them).
   Detail is solidified recursively, so the person inside `square-user-round`
   becomes one white silhouette rather than loose outlines. Where no single
   element encloses anything, connected clusters are tried instead — that is
   what makes a trash can and its lid, or `table-2`'s single multi-subpath
   drawing, fill correctly. A straight mark rooted on a drawn outline and
   hanging free at its other end — a monitor's stand, a lamp's pole, a tree's
   trunk — joins the silhouette rather than becoming a badge.
5. **Refit curves** (`lib/fit.mjs`) — the boolean result is a dense polygon.
   Long edges become `L` commands and runs of short arc chords are refitted with
   Schneider's algorithm, so circles stay circular and straight edges stay
   straight. SVGO then packs the path data.

Geometry alone cannot decide every icon. Three sets in `lib/overrides.mjs`
cover the broad cases:

- `KEEP_OUTLINE` — letterforms (`bold`, `bitcoin`, `case-upper`, `zodiac-gemini`,
  …) and `atom`. Filling these closes their counters and leaves a blob, so the
  stroke _is_ the filled shape — the same choice every icon family makes for its
  typographic marks.
- `NO_CLOSE` — marks that only look like shapes: `at-sign`, `link`, `lasso`,
  the `rotate-*` arrows, deliberately dashed frames.
- `FORCE_CLOSE` — `star-half`, drawn as a lone open outline with nothing
  overlapping the gap.

Everything else that needs a human decision has a per-icon file in
`tools/fill-icons/overrides/NAME.json` (lab icons: `overrides/lab/NAME.json`).
An override describes the icon as a bottom-to-top stack of layers over the
source's subpaths, so it stays a description of intent rather than hand-edited
output, and regenerating from a new upstream outline still works:

```json
{
  "close": [1],
  "layers": [
    { "units": [1, 2, 4], "mode": "fill" },
    { "units": [0, 3], "mode": "cut" },
    { "units": [5, 6], "mode": "fill", "gap": true }
  ]
}
```

| Key                                      | Effect                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers`                                 | Replace the automatic solidify. Modes: `auto` (the automatic rules on just those units), `fill` (solid silhouette), `stroke` (2px line, never filled), `cut` (knock strokes out of what is below; a line ending near an edge runs through it), `carve` (knock a solidified shape out), `xor` (strokes knocked out where they cross the shape, solid elsewhere). `gap` clears space around an added layer. |
| `base`                                   | Start from another icon's finished drawing — variants share their family base (`"base": "file"`). `baseScale` scales it about the centre.                                                                                                                                                                                                                                                                 |
| `move`                                   | `[{ "units": [...], "to": [x, y], "scale": 1 }]` — relocate a group, e.g. a badge onto the middle of the body.                                                                                                                                                                                                                                                                                            |
| `off`                                    | For `-off` icons: the base icon's name when it isn't simply the name minus `-off`, or `false` to draw the icon yourself.                                                                                                                                                                                                                                                                                  |
| `close`                                  | Close open subpaths with a straight edge, or through `{ "unit", "via": [[x, y]] }` points (from the end back to the start).                                                                                                                                                                                                                                                                               |
| `mitre`                                  | Close by running the end tangents on to their corner.                                                                                                                                                                                                                                                                                                                                                     |
| `join`                                   | Merge two open subpaths end to end before closing.                                                                                                                                                                                                                                                                                                                                                        |
| `extra`                                  | Extra path data appended as further units, for sources that draw an outline and its inner lines as one subpath (`globe-check`, `grid-2x2-*`).                                                                                                                                                                                                                                                             |
| `keepOutline`, `noClose`, `stems: false` | Per-icon versions of the global switches.                                                                                                                                                                                                                                                                                                                                                                 |

Unit indices are subpaths in document order:

```bash
node tools/fill-icons/inspect.mjs ambulance          # lists units, open/closed, endpoints
node tools/fill-icons/index.mjs --names ambulance    # regenerate one icon
```

## Regenerating

```bash
pnpm fill          # icons/  <- outline/icons
pnpm fill:lab      # lab/    <- outline/lab
```

Both read from `outline/` and are idempotent. Never point `--src` at `icons/`:
solidifying an already-filled icon a second time destroys it.

## Reviewing

```bash
pnpm fill:preview  # contact sheets of the whole set in ./preview
node tools/fill-icons/preview.mjs --dir icons --out /tmp/check \
  --compare outline/icons --names house,file-text,folder-clock
```

`--compare` draws the outline original above each filled icon, which is how the
set was reviewed.

## Approving icons

```bash
pnpm fill:review   # http://localhost:4321
```

Click an icon to approve it (click again to unapprove), or drag a box over
several, as in Finder, and approve or unapprove the selection at once. Approving saves the
icon's current drawing to `tools/fill-icons/approved/<icons|lab>/NAME.svg`;
`pnpm fill` and `pnpm fill:lab` then skip that icon and restore it from the
snapshot, so it stays exactly as approved. Unapprove it to change it again.
