# Filled Lucide

[![npm](https://img.shields.io/npm/v/@filled-lucide/js?color=blue)](https://www.npmjs.com/package/@filled-lucide/js)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for vanilla JavaScript. Same icon names, same 24×24 grid and the same API as [`lucide`](https://www.npmjs.com/package/lucide).

## Installation

```sh
pnpm add @filled-lucide/js@next
```

```sh
npm install @filled-lucide/js@next
```

## Usage

```html
<i data-lucide="house"></i>
<i data-lucide="heart"></i>

<script type="module">
  import { createIcons, House, Heart } from '@filled-lucide/js';

  createIcons({ icons: { House, Heart } });
</script>
```

## Drop-in replacement for `lucide`

Install this package under the upstream name to switch an entire app, including libraries that import `lucide` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add lucide@npm:@filled-lucide/js@next
```

The first organization release is `1.52.1-filled.2`, available under `next`.
It uses the icon set from `lucide@1.52.0` with the filled icon improvements.
Stable releases follow upstream Lucide versions.

## Migrating from `filled-lucide`

The JavaScript package now lives in the `@filled-lucide` organization. Install
`@filled-lucide/js` and update imports from `filled-lucide` to `@filled-lucide/js`.
The icon names and API are the same. Existing releases of `filled-lucide` remain
available on npm.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.

Filled Lucide is an independent project, not affiliated with or endorsed by the Lucide team. Report problems with the filled icons at [linus-sch/filled-lucide](https://github.com/linus-sch/filled-lucide/issues), not to upstream Lucide.
