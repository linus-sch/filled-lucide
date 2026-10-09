# Filled Lucide Preact

[![npm](https://img.shields.io/npm/v/@filled-lucide/preact?color=blue)](https://www.npmjs.com/package/@filled-lucide/preact)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for Preact. Same icon names, same 24×24 grid and the same API as [`lucide-preact`](https://www.npmjs.com/package/lucide-preact).

## Installation

```sh
pnpm add @filled-lucide/preact
```

```sh
npm install @filled-lucide/preact
```

## Usage

```jsx
import { House } from '@filled-lucide/preact';

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

Every icon is also exported with a `Filled` prefix (`FilledHouse`, `FilledX`, …), so you can mix it with the outline icons from `lucide-preact`:

```jsx
import { House } from 'lucide-preact';
import { FilledHouse } from '@filled-lucide/preact';

<nav>{active ? <FilledHouse /> : <House />}</nav>;
```

## Drop-in replacement for `lucide-preact`

Install this package under the upstream name to switch an entire app, including libraries that import `lucide-preact` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add lucide-preact@npm:@filled-lucide/preact
```

Versions follow upstream: `@filled-lucide/preact@1.52.0` has the same icons as `lucide-preact@1.52.0`.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.

Filled Lucide is an independent project, not affiliated with or endorsed by the Lucide team. Report problems with the filled icons at [linus-sch/filled-lucide](https://github.com/linus-sch/filled-lucide/issues), not to upstream Lucide.
