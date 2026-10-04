# Lucide Filled

A solid variant of the Lucide icon set: all **1,776 icons** (plus **355 lab icons**)
redrawn as filled silhouettes, with the same names, the same 24×24 grid, and the
same package API as upstream Lucide.

The icons in `icons/` are generated from the untouched outline sources in
`outline/` — they are build output, not hand-edited files. `README.md` is the
original Lucide readme; this document covers the filled variant.

## What "filled" means here

Every icon is one `<path>` using `fill="currentColor"` and the even-odd rule:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
     fill="currentColor" fill-rule="evenodd" viewBox="0 0 24 24">
  <path d="m13.942 1.713 7.097 6.085c.352.342…"/>
</svg>
```

No strokes, no masks, no `id`s — so an icon can be inlined many times on a page,
recoloured with `currentColor`, used as a CSS mask, or rasterised at any size.

Average path is ~1.3 kB (the whole main set is 2.3 MB, ~460 kB over the wire).

## Using it

### From the CDN

```html
<img src="https://YOUR-SUBDOMAIN.workers.dev/icons/house.svg" width="24" height="24" alt="">
```

To recolour with the surrounding text colour, use it as a mask:

```css
.icon-house {
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  background: currentColor;
  -webkit-mask: url("https://YOUR-SUBDOMAIN.workers.dev/icons/house.svg") center / contain no-repeat;
  mask: url("https://YOUR-SUBDOMAIN.workers.dev/icons/house.svg") center / contain no-repeat;
}
```

See [`deploy/README.md`](deploy/README.md) for deploying your own copy.

### From npm

| Upstream | Filled | Import |
| --- | --- | --- |
| `lucide` | `lucide-filled` | `import { House } from 'lucide-filled'` |
| `lucide-react` | `lucide-filled-react` | `import { House } from 'lucide-filled-react'` |
| `lucide-preact` | `lucide-filled-preact` | `import { House } from 'lucide-filled-preact'` |
| `lucide-solid` | `lucide-filled-solid` | `import { House } from 'lucide-filled-solid'` |
| `lucide-react-native` | `lucide-filled-react-native` | `import { House } from 'lucide-filled-react-native'` |
| `lucide-static` | `lucide-filled-static` | `import 'lucide-filled-static/font/lucide-filled.css'` |
| `@lucide/vue` | `@lucide-filled/vue` | `import { House } from '@lucide-filled/vue'` |
| `@lucide/svelte` | `@lucide-filled/svelte` | `import House from '@lucide-filled/svelte/icons/house'` |
| `@lucide/angular` | `@lucide-filled/angular` | `import { House } from '@lucide-filled/angular'` |
| `@lucide/astro` | `@lucide-filled/astro` | `import { House } from '@lucide-filled/astro'` |
| `@lucide/icons` | `@lucide-filled/icons` | core icon data |
| `@lucide/lab` | `@lucide-filled/lab` | lab icons, filled |

The component API is unchanged — `size`, `color`, `className`, refs and the
context provider all behave as they do upstream. The one behavioural difference
is that `color` now drives `fill` rather than `stroke`, since there is no stroke
to colour; `strokeWidth` and `absoluteStrokeWidth` are still accepted and simply
have nothing to act on.

```tsx
import { House, Heart, Settings } from 'lucide-filled-react';

<House size={32} color="#e11d48" />
```

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
   *shell* (what becomes solid), *detail* drawn inside it (knocked out), and
   *badges* laid over it (kept as their own silhouette with a gap around them).
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
  stroke *is* the filled shape — the same choice every icon family makes for its
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

| Key | Effect |
| --- | --- |
| `layers` | Replace the automatic solidify. Modes: `auto` (the automatic rules on just those units), `fill` (solid silhouette), `stroke` (2px line, never filled), `cut` (knock strokes out of what is below), `carve` (knock a solidified shape out). `gap` clears space around an added layer — the badge treatment. |
| `close` | Close open subpaths with a straight edge, or through `{ "unit", "via": [[x, y]] }` points (from the end back to the start). |
| `mitre` | Close by running the end tangents on to their corner. |
| `join` | Merge two open subpaths end to end before closing. |
| `extra` | Extra path data appended as further units, for sources that draw an outline and its inner lines as one subpath (`globe-check`, `grid-2x2-*`). |
| `keepOutline`, `noClose`, `stems: false` | Per-icon versions of the global switches. |

Unit indices are subpaths in document order:

```bash
node tools/fill-icons/inspect.mjs ambulance          # lists units, open/closed, endpoints
node tools/fill-icons/index.mjs --names ambulance    # regenerate one icon
```

### Regenerating

```bash
pnpm fill          # icons/  <- outline/icons
pnpm fill:lab      # lab/    <- outline/lab
```

Both read from `outline/` and are idempotent. Never point `--src` at `icons/`:
solidifying an already-filled icon a second time destroys it.

### Reviewing

```bash
pnpm fill:preview  # contact sheets of the whole set in ./preview
node tools/fill-icons/preview.mjs --dir icons --out /tmp/check \
  --compare outline/icons --names house,file-text,folder-clock
```

`--compare` draws the outline original above each filled icon, which is how the
set was reviewed.

## Deploying

```bash
pnpm cdn:build     # -> deploy/public
pnpm cdn:deploy    # wrangler deploy
```

See [`deploy/README.md`](deploy/README.md).

## License

ISC, same as upstream Lucide (`LICENSE`).
