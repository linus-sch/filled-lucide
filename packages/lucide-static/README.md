# Filled Lucide Static

[![npm](https://img.shields.io/npm/v/@filled-lucide/static?color=blue)](https://www.npmjs.com/package/@filled-lucide/static)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for static SVGs, an SVG sprite and an icon font. Same icon names, same 24×24 grid and the same API as [`lucide-static`](https://www.npmjs.com/package/lucide-static).

## Installation

```sh
pnpm add @filled-lucide/static
```

```sh
npm install @filled-lucide/static
```

## Usage

```js
// SVG strings
import { House } from '@filled-lucide/static';
```

```html
<!-- Single files -->
<img
  src="node_modules/@filled-lucide/static/icons/house.svg"
  alt=""
/>

<!-- Icon font -->
<link
  rel="stylesheet"
  href="node_modules/@filled-lucide/static/font/lucide.css"
/>
<i class="icon-house"></i>
```

## Drop-in replacement for `lucide-static`

Install this package under the upstream name to switch an entire app, including libraries that import `lucide-static` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add lucide-static@npm:@filled-lucide/static
```

Versions follow upstream: `@filled-lucide/static@1.52.0` has the same icons as `lucide-static@1.52.0`.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.
