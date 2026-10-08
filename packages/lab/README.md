# Filled Lucide Lab

[![npm](https://img.shields.io/npm/v/@filled-lucide/lab?color=blue)](https://www.npmjs.com/package/@filled-lucide/lab)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for the Lucide Lab icons, filled. Same icon names, same 24×24 grid and the same API as [`@lucide/lab`](https://www.npmjs.com/package/@lucide/lab).

## Installation

```sh
pnpm add @filled-lucide/lab
```

```sh
npm install @filled-lucide/lab
```

## Usage

```jsx
import { burger } from '@filled-lucide/lab';
import { Icon } from '@filled-lucide/react';

export default function App() {
  return <Icon iconNode={burger} />;
}
```

## Drop-in replacement for `@lucide/lab`

Install this package under the upstream name to switch an entire app, including libraries that import `@lucide/lab` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add @lucide/lab@npm:@filled-lucide/lab
```

Versions follow upstream: `@filled-lucide/lab@1.52.0` has the same icons as `@lucide/lab@1.52.0`.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.
