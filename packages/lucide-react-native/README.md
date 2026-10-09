# Filled Lucide React Native

[![npm](https://img.shields.io/npm/v/@filled-lucide/react-native?color=blue)](https://www.npmjs.com/package/@filled-lucide/react-native)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for React Native. Same icon names, same 24×24 grid and the same API as [`lucide-react-native`](https://www.npmjs.com/package/lucide-react-native).

## Installation

```sh
pnpm add @filled-lucide/react-native react-native-svg
```

```sh
npm install @filled-lucide/react-native react-native-svg
```

## Usage

```jsx
import { House } from '@filled-lucide/react-native';

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

Every icon is also exported with a `Filled` prefix (`FilledHouse`, `FilledX`, …), so you can mix it with the outline icons from `lucide-react-native`:

```jsx
import { House } from 'lucide-react-native';
import { FilledHouse } from '@filled-lucide/react-native';

<nav>{active ? <FilledHouse /> : <House />}</nav>;
```

## Drop-in replacement for `lucide-react-native`

Install this package under the upstream name to switch an entire app, including libraries that import `lucide-react-native` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add lucide-react-native@npm:@filled-lucide/react-native
```

Versions follow upstream: `@filled-lucide/react-native@1.52.0` has the same icons as `lucide-react-native@1.52.0`.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.

Filled Lucide is an independent project, not affiliated with or endorsed by the Lucide team. Report problems with the filled icons at [linus-sch/filled-lucide](https://github.com/linus-sch/filled-lucide/issues), not to upstream Lucide.
