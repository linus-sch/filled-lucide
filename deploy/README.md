# Deploying to Cloudflare

The whole icon set is a folder of static files. There is **no Worker script** —
`wrangler.toml` declares assets only, so every request is answered directly from
Cloudflare's edge. Static asset requests are free and unmetered on all plans,
including Free, so the site costs nothing to run regardless of traffic.

## Deploy

```bash
npm install -g wrangler   # or: pnpm add -g wrangler
wrangler login
pnpm cdn:deploy
```

That builds `deploy/public` and uploads it. The first deploy prints the URL
(`https://lucide-filled.<your-subdomain>.workers.dev`). Change `name` in
`wrangler.toml` to change the subdomain, or attach a custom domain in the
Cloudflare dashboard under **Workers & Pages → your worker → Settings → Domains**.

To preview locally with the real headers and routing:

```bash
pnpm cdn:dev
```

## What gets served

| Path | Contents |
| --- | --- |
| `/` | Browsable, searchable gallery of every icon |
| `/icons/<name>.svg` | One filled icon, ~1.3 kB |
| `/lab/<name>.svg` | Lab icons, filled |
| `/icons.json` | `{ "<name>": "<path data>" }` for all 1,776 icons |
| `/icons-index.json` | `[{ n: name, t: tags, c: categories, a: aliases }]` — the search index |
| `/sprite.svg` | One `<symbol>` per icon, for same-origin `<use>` |
| `/categories.json` | Category slug → display title |
| `/meta.json` | Set sizes and build timestamp |

2,142 files, ~5 MB total. Cloudflare's limits for Workers assets are 20,000
files and 25 MiB per file, so there is plenty of headroom.

## Caching

`public/_headers` sets `max-age=604800, stale-while-revalidate=2592000` on the
icons and JSON indexes: a week of freshness, then a month during which a stale
copy is served while a fresh one is fetched in the background. In practice a
browser fetches an icon once and the edge fetches it from storage once.
`Access-Control-Allow-Origin: *` is set so the files can be used cross-origin as
`<img>` sources, CSS masks, or `fetch()` targets.

Because the paths are stable rather than content-hashed, a redeploy that changes
an icon can take up to a week to reach browsers that already cached it. If you
need an update to land immediately, purge the cache from the Cloudflare
dashboard (**Caching → Configuration → Purge Everything**), or pin consumers to
the npm package instead.

## Using it from a page

```html
<!-- simplest: a plain image -->
<img src="https://cdn.example.com/icons/house.svg" width="24" height="24" alt="">
```

```css
/* recolourable: the icon takes the element's colour */
.icon {
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  background: currentColor;
  -webkit-mask: var(--icon) center / contain no-repeat;
  mask: var(--icon) center / contain no-repeat;
}
.icon-house { --icon: url("https://cdn.example.com/icons/house.svg"); }
```

```html
<!-- same-origin only: browsers block cross-origin <use> -->
<svg width="24" height="24"><use href="/sprite.svg#house" /></svg>
```

```js
// build-time: pull the raw path data
const icons = await fetch('https://cdn.example.com/icons.json').then((r) => r.json());
const d = icons['house'];
```

## Alternatives

The same `public/` folder deploys unchanged to Cloudflare Pages
(`wrangler pages deploy deploy/public`), which also serves unlimited requests on
the free plan. Workers assets is the path Cloudflare now recommends, and it is
what `wrangler.toml` is set up for.
