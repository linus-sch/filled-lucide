# Filled Lucide Icons

[![npm](https://img.shields.io/npm/v/@filled-lucide/icons?color=blue)](https://www.npmjs.com/package/@filled-lucide/icons)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for framework-agnostic icon data. Same icon names, same 24×24 grid and the same API as [`@lucide/icons`](https://www.npmjs.com/package/@lucide/icons).

## Installation

```sh
pnpm add @filled-lucide/icons
```

```sh
npm install @filled-lucide/icons
```

## Usage

```js
import { House } from '@filled-lucide/icons';
import { buildLucideSvg } from '@filled-lucide/icons/build';

const svg = buildLucideSvg(House, { color: '#e11d48' });
```

## Drop-in replacement for `@lucide/icons`

Install this package under the upstream name to switch an entire app, including libraries that import `@lucide/icons` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add @lucide/icons@npm:@filled-lucide/icons
```

Versions follow upstream: `@filled-lucide/icons@1.52.0` has the same icons as `@lucide/icons@1.52.0`.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.
