# Contributing

Thanks for helping with Filled Lucide!

## Icons

The filled icons are generated, so a fix never edits `icons/` or `lab/` directly.

1. Find the icon's subpaths: `node tools/fill-icons/inspect.mjs <name>`
2. Add or change its override in `tools/fill-icons/overrides/<name>.json`
   (format described in the [fill-icons README](tools/fill-icons/README.md#how-the-icons-are-generated)).
3. Regenerate it: `node tools/fill-icons/index.mjs --names <name>`
4. Check it in the review page: `pnpm fill:review` (http://localhost:4321).

Approved icons are locked to their snapshot in `tools/fill-icons/approved/`.
To change one, unapprove it in the review page first. `pnpm fill:check`
(run by the pre-commit hook and CI) fails if an approved icon changed.

New icons come from upstream Lucide — request them in
[lucide-icons/lucide](https://github.com/lucide-icons/lucide). They arrive here
with the next upstream sync.

## Packages

```bash
pnpm install
pnpm --filter @filled-lucide/react build   # or any other package
pnpm --filter @filled-lucide/react test
```

The packages mirror upstream Lucide's; keep changes small and close to upstream
so future merges stay easy.

## Releases

See [RELEASING.md](RELEASING.md).
