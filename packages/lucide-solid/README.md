# Filled Lucide Solid

[![npm](https://img.shields.io/npm/v/@filled-lucide/solid?color=blue)](https://www.npmjs.com/package/@filled-lucide/solid)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for Solid. Same icon names, same 24×24 grid and the same API as [`lucide-solid`](https://www.npmjs.com/package/lucide-solid).

## Installation

```sh
pnpm add @filled-lucide/solid
```

```sh
npm install @filled-lucide/solid
```

## Usage

```jsx
import { House } from '@filled-lucide/solid';

export default function App() {
  return (
    <House
      size={32}
      color="#e11d48"
    />
  );
}
```

`color` sets the icon's fill. `strokeWidth` and `absoluteStrokeWidth` are accepted for compatibility but have no visible effect.

## Filled and outline side by side

Every icon is also exported with a `Filled` prefix (`FilledHouse`, `FilledX`, …), so you can mix it with the outline icons from `lucide-solid`:

```jsx
import { House } from 'lucide-solid';
import { FilledHouse } from '@filled-lucide/solid';

<nav>{active ? <FilledHouse /> : <House />}</nav>;
```

## Drop-in replacement for `lucide-solid`

Install this package under the upstream name to switch an entire app, including libraries that import `lucide-solid` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add lucide-solid@npm:@filled-lucide/solid
```

Versions follow upstream: `@filled-lucide/solid@1.52.0` has the same icons as `lucide-solid@1.52.0`.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.
