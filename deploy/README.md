# Deploying to Cloudflare

The whole icon set is a folder of static files. There is **no Worker script** —
`wrangler.toml` declares assets only, so every request is answered directly from
Cloudflare's edge. Static asset requests are free and unmetered on all plans,
including Free, so the site costs nothing to run regardless of traffic.

## Deploy

```bash
npm install -g wrangler
wrangler login
pnpm cdn:deploy
```

That builds `deploy/public` and uploads it. The first deploy prints the URL
(`https://filled-lucide.<your-subdomain>.workers.dev`). Change `name` in
`wrangler.toml` to change the subdomain, or attach a custom domain in the
Cloudflare dashboard under **Workers & Pages → your worker → Settings → Domains**.

To preview locally with the real headers and routing:

```bash
pnpm cdn:dev
```

## What gets served

| Path                                         | Contents                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `/`                                          | Landing page, searchable icon browser, and copy drawer                 |
| `/icons`                                     | Redirect to the single page at `/`                                     |
| `/icons/<name>/`                             | Icon details, previews, SVG export and framework examples              |
| `/categories/`, `/categories/<category>/`    | Category directory and searchable icon collections                     |
| `/react/`, `/vue/`, `/svelte/`, `/svg/`      | Installation and usage guides                                          |
| `/lucide-filled-vs-outline/`                 | Filled and outline comparison                                          |
| `/docs/`, `/changelog/`                      | Getting started, common questions and project updates                  |
| `/packages/`                                 | All published framework packages                                       |
| `/icons/<name>.svg`                          | One filled icon, ~1.3 kB                                               |
| `/lab/<name>.svg`                            | Lab icons, filled                                                      |
| `/outline/icons/<name>.svg`                  | Original Lucide outline icon                                           |
| `/outline/lab/<name>.svg`                    | Original Lucide Lab outline icon                                       |
| `/icons.json`                                | `{ "<name>": "<path data>" }` for all 1,776 icons                      |
| `/icons-index.json`                          | `[{ n: name, t: tags, c: categories, a: aliases }]` — the search index |
| `/sprite.svg`                                | One `<symbol>` per icon, for same-origin `<use>`                       |
| `/sprite-outline.svg`                        | Outline symbols with configurable stroke width                         |
| `/sprite-lab.svg`, `/sprite-outline-lab.svg` | Filled and outline Lab symbols                                         |
| `/categories.json`                           | Category slug → display title                                          |
| `/meta.json`                                 | Set sizes and build timestamp                                          |

About 6,200 files including both styles and the generated HTML pages. Cloudflare's limits for Workers assets are 20,000
files and 25 MiB per file, so there is plenty of headroom.

## Caching

The browser loads sprites, indexes, scripts, styles and logos from
`/assets/<content-revision>/`. Their URLs change when the assets change, so a
visitor with an older sprite cached still gets the updated icons on reload.
`public/_headers` sets `max-age=31536000, immutable` on these versioned assets.
`Access-Control-Allow-Origin: *` is set so the files can be used cross-origin as
`<img>` sources, CSS masks, or `fetch()` targets.

HTML and stable URLs such as `/icons/leaf.svg`, `/icons.json` and `/sprite.svg`
use Cloudflare's default `public, max-age=0, must-revalidate` policy and content
ETags. Browsers can reuse unchanged files after checking their freshness. The
copy drawer also includes the content revision in its SVG source requests to
bypass copies cached under the previous week-long policy.

## Using it from a page

```html
<!-- simplest: a plain image -->
<img
  src="https://cdn.example.com/icons/house.svg"
  width="24"
  height="24"
  alt=""
/>
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
.icon-house {
  --icon: url('https://cdn.example.com/icons/house.svg');
}
```

```html
<!-- same-origin only: browsers block cross-origin <use> -->
<svg
  width="24"
  height="24"
>
  <use href="/sprite.svg#house" />
</svg>
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
