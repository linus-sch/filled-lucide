# Filled Lucide

[![npm](https://img.shields.io/npm/v/@filled-lucide/react?label=%40filled-lucide%2Freact&color=blue)](https://www.npmjs.com/package/@filled-lucide/react)
[![CI](https://github.com/linus-sch/filled-lucide/actions/workflows/ci.yml/badge.svg)](https://github.com/linus-sch/filled-lucide/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-ISC-green)](LICENSE)

A solid variant of the [Lucide](https://lucide.dev) icon set: all **1,776 icons**
(plus **355 lab icons**) redrawn as filled silhouettes, with the same names, the
same 24×24 grid, and the same package API as upstream Lucide — for React, Vue,
Svelte, Angular, Solid, Preact, Astro, React Native and vanilla JS.

```bash
pnpm add @filled-lucide/react
```

```tsx
import { House } from '@filled-lucide/react';

<House
  size={32}
  color="#e11d48"
/>;
```

Every icon is also exported with a `Filled` prefix (`FilledHouse`, `FilledX`, …)
for use next to the outline icons from `lucide-react`.

The icons in `icons/` are generated from the untouched upstream outline sources
in `outline/` — they are build output, not hand-edited files.

## Using it

### From the CDN

```html
<img
  src="https://filledlucide.dev/icons/house.svg"
  width="24"
  height="24"
  alt=""
/>
```

To recolour with the surrounding text colour, use it as a mask:

```css
.icon-house {
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  background: currentColor;
  -webkit-mask: url('https://filledlucide.dev/icons/house.svg') center / contain no-repeat;
  mask: url('https://filledlucide.dev/icons/house.svg') center / contain no-repeat;
}
```

See [`deploy/README.md`](deploy/README.md) for deploying your own copy.

### From npm

| Upstream              | Filled                        | Import                                                  |
| --------------------- | ----------------------------- | ------------------------------------------------------- |
| `lucide`              | `filled-lucide`               | `import { House } from 'filled-lucide'`                 |
| `lucide-react`        | `@filled-lucide/react`        | `import { House } from '@filled-lucide/react'`          |
| `lucide-preact`       | `@filled-lucide/preact`       | `import { House } from '@filled-lucide/preact'`         |
| `lucide-solid`        | `@filled-lucide/solid`        | `import { House } from '@filled-lucide/solid'`          |
| `lucide-react-native` | `@filled-lucide/react-native` | `import { House } from '@filled-lucide/react-native'`   |
| `lucide-static`       | `@filled-lucide/static`       | `import '@filled-lucide/static/font/lucide.css'`        |
| `@lucide/vue`         | `@filled-lucide/vue`          | `import { House } from '@filled-lucide/vue'`            |
| `@lucide/svelte`      | `@filled-lucide/svelte`       | `import House from '@filled-lucide/svelte/icons/house'` |
| `@lucide/angular`     | `@filled-lucide/angular`      | `import { House } from '@filled-lucide/angular'`        |
| `@lucide/astro`       | `@filled-lucide/astro`        | `import { House } from '@filled-lucide/astro'`          |
| `@lucide/icons`       | `@filled-lucide/icons`        | core icon data                                          |
| `@lucide/lab`         | `@filled-lucide/lab`          | lab icons, filled                                       |

The component API is unchanged — `size`, `color`, `className`, refs and the
context provider all behave as they do upstream. The one behavioural difference
is that `color` now drives `fill` rather than `stroke`, since there is no stroke
to colour; `strokeWidth` and `absoluteStrokeWidth` are still accepted and simply
have nothing to act on.

```tsx
import { House, Heart, Settings } from '@filled-lucide/react';

<House
  size={32}
  color="#e11d48"
/>;
```

### As a drop-in replacement

Every icon keeps its Lucide name, so installing a filled package under the
upstream name switches a whole app to filled icons without touching a single
import — including libraries such as shadcn/ui that import `lucide-react`:

```bash
pnpm add lucide-react@npm:@filled-lucide/react
# npm i lucide-react@npm:@filled-lucide/react
# yarn add lucide-react@npm:@filled-lucide/react
```

If a dependency pulls in its own copy of `lucide-react`, override it too:

```json
{
  "pnpm": { "overrides": { "lucide-react": "npm:@filled-lucide/react" } }
}
```

(`"overrides"` for npm, `"resolutions"` for yarn.) The same works for every
package in the table above. Versions follow upstream: `@filled-lucide/react@1.52.0`
has the same icons as `lucide-react@1.52.0`.

### Next to the outline icons

To use filled and outline icons side by side, install both and import the
`Filled`-prefixed names, which every component package exports alongside
`House`, `HouseIcon` and `LucideHouse`:

```tsx
import { House } from 'lucide-react';
import { FilledHouse } from '@filled-lucide/react';

<nav>{active ? <FilledHouse /> : <House />}</nav>;
```

In Angular the filled components use their own selector, so both libraries can
be imported into the same component:

```html
<svg lucideHouse></svg>
<!-- @lucide/angular -->
<svg filledHouse></svg>
<!-- @filled-lucide/angular, FilledHouse -->
```

## What "filled" means here

Every icon is one `<path>` using `fill="currentColor"` and the even-odd rule:

```svg
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="currentColor"
  fill-rule="evenodd"
>
  <path d="m13.942 1.713 7.097 6.085c.352.342…" />
</svg>
```

No strokes, no masks, no `id`s — so an icon can be inlined many times on a page,
recoloured with `currentColor`, used as a CSS mask, or rasterised at any size.

Average path is ~1.3 kB (the whole main set is 2.3 MB, ~460 kB over the wire).

### Design rules

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

### Approving icons

```bash
pnpm fill:review   # http://localhost:4321
```

Click an icon to approve it (click again to unapprove), or drag a box over
several, as in Finder, and approve or unapprove the selection at once. Approving saves the
icon's current drawing to `tools/fill-icons/approved/<icons|lab>/NAME.svg`;
`pnpm fill` and `pnpm fill:lab` then skip that icon and restore it from the
snapshot, so it stays exactly as approved. Unapprove it to change it again.

## Repository layout

The repo keeps upstream Lucide's structure, so upstream changes merge cleanly.

```
outline/            upstream Lucide outline SVGs (icons/, lab/) — the generator's input
icons/              filled icons + upstream metadata (*.json) — generated, don't hand-edit
lab/                filled Lucide Lab icons — generated
categories/         upstream icon categories
packages/           one npm package per framework (published to npm, see table above)
  lucide/             filled-lucide              (vanilla JS)
  lucide-react/       @filled-lucide/react
  lucide-preact/      @filled-lucide/preact
  lucide-solid/       @filled-lucide/solid
  lucide-react-native/@filled-lucide/react-native
  lucide-static/      @filled-lucide/static      (SVGs, sprite, icon font)
  vue/ svelte/ angular/ astro/ icons/ lab/      @filled-lucide/<name>
  shared/             internal helpers, bundled into each package
tools/
  fill-icons/         outline → filled generator, overrides, review page, approved snapshots
  build-icons/        generates each package's per-icon source files
  build-font/         icon font for @filled-lucide/static
  build-cdn/          static site + CDN files (deploy/)
scripts/            maintenance scripts (syncUpstream.mts, checks)
docs/               upstream lucide.dev site source (not yet adapted)
.github/workflows/  ci.yml, release.yml, sync-upstream.yml
```

Releasing and keeping up with upstream Lucide is described in
[`RELEASING.md`](RELEASING.md).

## Deploying

```bash
pnpm cdn:build     # -> deploy/public
pnpm cdn:deploy    # wrangler deploy
```

See [`deploy/README.md`](deploy/README.md).

## License

ISC, same as upstream Lucide (`LICENSE`).
