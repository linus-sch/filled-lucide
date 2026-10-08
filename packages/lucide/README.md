# Filled Lucide

[![npm](https://img.shields.io/npm/v/filled-lucide?color=blue)](https://www.npmjs.com/package/filled-lucide)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for vanilla JavaScript. Same icon names, same 24×24 grid and the same API as [`lucide`](https://www.npmjs.com/package/lucide).

## Installation

```sh
pnpm add filled-lucide
```

```sh
npm install filled-lucide
```

## Usage

```html
<i data-lucide="house"></i>
<i data-lucide="heart"></i>

<script type="module">
  import { createIcons, House, Heart } from 'filled-lucide';

  createIcons({ icons: { House, Heart } });
</script>
```

## Drop-in replacement for `lucide`

Install this package under the upstream name to switch an entire app, including libraries that import `lucide` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add lucide@npm:filled-lucide
```

Versions follow upstream: `filled-lucide@1.52.0` has the same icons as `lucide@1.52.0`.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.
