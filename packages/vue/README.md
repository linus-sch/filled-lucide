# Filled Lucide Vue

[![npm](https://img.shields.io/npm/v/@filled-lucide/vue?color=blue)](https://www.npmjs.com/package/@filled-lucide/vue)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/linus-sch/filled-lucide/blob/main/LICENSE)

Filled (solid) versions of every [Lucide](https://lucide.dev) icon for Vue 3. Same icon names, same 24×24 grid and the same API as [`@lucide/vue`](https://www.npmjs.com/package/@lucide/vue).

## Installation

```sh
pnpm add @filled-lucide/vue
```

```sh
npm install @filled-lucide/vue
```

## Usage

```vue
<script setup>
import { House } from '@filled-lucide/vue';
</script>

<template>
  <House
    :size="32"
    color="#e11d48"
  />
</template>
```

`color` sets the icon's fill. `strokeWidth` and `absoluteStrokeWidth` are accepted for compatibility but have no visible effect.

## Filled and outline side by side

Every icon is also exported with a `Filled` prefix (`FilledHouse`, `FilledX`, …), so you can mix it with the outline icons from `@lucide/vue`:

```vue
<script setup>
import { House } from '@lucide/vue';
import { FilledHouse } from '@filled-lucide/vue';
</script>

<template>
  <FilledHouse v-if="active" />
  <House v-else />
</template>
```

## Drop-in replacement for `@lucide/vue`

Install this package under the upstream name to switch an entire app, including libraries that import `@lucide/vue` (such as shadcn/ui), to filled icons without changing an import:

```sh
pnpm add @lucide/vue@npm:@filled-lucide/vue
```

Versions follow upstream: `@filled-lucide/vue@1.52.0` has the same icons as `@lucide/vue@1.52.0`.

## Documentation

The API is identical to upstream, so the [Lucide documentation](https://lucide.dev/guide/) applies. See the [Filled Lucide repository](https://github.com/linus-sch/filled-lucide) for details about the filled set.

## License

ISC. Based on [Lucide](https://github.com/lucide-icons/lucide), © Lucide Contributors.

Filled Lucide is an independent project, not affiliated with or endorsed by the Lucide team. Report problems with the filled icons at [linus-sch/filled-lucide](https://github.com/linus-sch/filled-lucide/issues), not to upstream Lucide.
