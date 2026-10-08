# Filled Lucide Astro

[![npm](https://img.shields.io/npm/v/@filled-lucide/astro?color=blue)](https://www.npmjs.com/package/@filled-lucide/astro)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for Astro. Same icon names, same 24×24 grid and the same API as [`@lucide/astro`](https://www.npmjs.com/package/@lucide/astro).

## Installation

```sh
pnpm add @filled-lucide/astro
```

```sh
npm install @filled-lucide/astro
```

## Usage

```astro
---
import { House } from '@filled-lucide/astro';
---

<House size={32} color="#e11d48" />
```

`color` sets the icon's fill. `strokeWidth` and `absoluteStrokeWidth` are accepted for compatibility but have no visible effect.

## Filled and outline side by side

Every icon is also exported with a `Filled` prefix (`FilledHouse`, `FilledX`, …), so you can mix it with the outline icons from `@lucide/astro`:

```astro
---
import { House } from '@lucide/astro';
import { FilledHouse } from '@filled-lucide/astro';
---

{active ? <FilledHouse /> : <House />}
```

## Drop-in replacement for `@lucide/astro`

Install this package under the upstream name to switch an entire app, including libraries that import `@lucide/astro` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add @lucide/astro@npm:@filled-lucide/astro
```

Versions follow upstream: `@filled-lucide/astro@1.52.0` has the same icons as `@lucide/astro@1.52.0`.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.
