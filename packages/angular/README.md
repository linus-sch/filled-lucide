# Filled Lucide Angular

[![npm](https://img.shields.io/npm/v/@filled-lucide/angular?color=blue)](https://www.npmjs.com/package/@filled-lucide/angular)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for Angular. Same icon names, same 24×24 grid and the same API as [`@lucide/angular`](https://www.npmjs.com/package/@lucide/angular).

## Installation

```sh
pnpm add @filled-lucide/angular
```

```sh
npm install @filled-lucide/angular
```

## Usage

```ts
import { Component } from '@angular/core';
import { LucideHouse } from '@filled-lucide/angular';

@Component({
  selector: 'app-root',
  imports: [LucideHouse],
  template: `<svg lucideHouse [size]="32" color="#e11d48"></svg>`,
})
export class AppComponent {}
```

`color` sets the icon's fill. `strokeWidth` and `absoluteStrokeWidth` are accepted for compatibility but have no visible effect.

## Filled and outline side by side

Every icon is also exported with a `Filled` prefix (`FilledHouse`, `FilledX`, …), so you can mix it with the outline icons from `@lucide/angular`:

The filled components also match a `filled…` selector, so both libraries can be used in one template:

```ts
import { LucideHouse } from '@lucide/angular';
import { FilledHouse } from '@filled-lucide/angular';

@Component({
  imports: [LucideHouse, FilledHouse],
  template: `<svg lucideHouse></svg> <svg filledHouse></svg>`,
})
```

## Drop-in replacement for `@lucide/angular`

Install this package under the upstream name to switch an entire app, including libraries that import `@lucide/angular` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add @lucide/angular@npm:@filled-lucide/angular
```

Versions follow upstream: `@filled-lucide/angular@1.52.0` has the same icons as `@lucide/angular@1.52.0`.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.
