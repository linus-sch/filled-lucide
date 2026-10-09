#!/usr/bin/env node
// Assemble the static bundle that gets deployed to Cloudflare.
//
//   node tools/build-cdn/index.mjs [--out deploy/public]
//
// Everything here is a plain file: no Worker code runs at request time, so the
// whole site is served from Cloudflare's edge for free at any traffic level.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, join, resolve } from 'node:path';
import { buildPages, footerNavigation, pageFooter, pageNavigation } from './pages.mjs';

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i === -1 ? fallback : argv[i + 1];
};

const root = resolve(argv.includes('--root') ? arg('--root') : '.');
const out = resolve(arg('--out', 'deploy/public'));

const readSets = async () => {
  const sets = [];
  for (const [dir, prefix] of [
    ['icons', 'icons'],
    ['lab', 'lab'],
  ]) {
    const from = join(root, dir);
    const files = (await readdir(from)).filter((f) => f.endsWith('.svg')).sort();
    const icons = [];
    for (const file of files) {
      const name = basename(file, '.svg');
      const source = await readFile(join(from, file), 'utf8');
      const path = source.match(/<path d="([^"]*)"/)?.[1] ?? '';
      const outline = await readFile(join(root, 'outline', dir, file), 'utf8');
      const outlineBody = outline
        .replace(/^[\s\S]*?<svg\b[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '')
        .trim();
      let meta = {};
      try {
        meta = JSON.parse(await readFile(join(from, `${name}.json`), 'utf8'));
      } catch {
        meta = {};
      }
      icons.push({
        name,
        path,
        outline,
        outlineBody,
        tags: meta.tags ?? [],
        categories: meta.categories ?? [],
        aliases: (meta.aliases ?? [])
          .map((a) => (typeof a === 'string' ? a : a.name))
          .filter(Boolean),
      });
    }
    sets.push({ prefix, icons });
  }
  return sets;
};

const iconFile = (d) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="${d}"/></svg>`;

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** One <symbol> per icon, for same-origin `<use href="/sprite.svg#name">`. */
const buildSprite = (icons) =>
  `<svg xmlns="http://www.w3.org/2000/svg">\n${icons
    .map(
      (i) =>
        `<symbol id="${i.name}" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="${escapeAttr(i.path)}"/></symbol>`,
    )
    .join('\n')}\n</svg>\n`;

const buildOutlineSprite = (icons) =>
  `<svg xmlns="http://www.w3.org/2000/svg">\n${icons
    .map(
      (i) =>
        `<symbol id="${i.name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${i.outlineBody}</symbol>`,
    )
    .join('\n')}\n</svg>\n`;

const REPO = 'https://github.com/linus-sch/filled-lucide';

/** Published packages in display order, with the logo and the upstream package each replaces. */
const PACKAGES = [
  { dir: 'lucide', logo: 'js', upstream: 'lucide' },
  { dir: 'lucide-react', logo: 'react', upstream: 'lucide-react' },
  { dir: 'vue', logo: 'vue', upstream: '@lucide/vue' },
  { dir: 'svelte', logo: 'svelte', upstream: '@lucide/svelte' },
  { dir: 'lucide-solid', logo: 'solid', upstream: 'lucide-solid' },
  { dir: 'lucide-preact', logo: 'preact', upstream: 'lucide-preact' },
  { dir: 'lucide-react-native', logo: 'react-native', upstream: 'lucide-react-native' },
  { dir: 'angular', logo: 'angular', upstream: '@lucide/angular' },
  { dir: 'astro', logo: 'astro', logoDark: 'astro-dark', upstream: '@lucide/astro' },
  { dir: 'lucide-static', logo: 'svg', upstream: 'lucide-static' },
  { dir: 'icons', upstream: '@lucide/icons' },
  { dir: 'lab', upstream: '@lucide/lab' },
];

const escapeHtml = (s) => escapeAttr(s).replace(/>/g, '&gt;');

/** Published packages in display order, with their package.json name and description. */
const readPackages = () =>
  Promise.all(
    PACKAGES.map(async (pkg) => {
      const { name, description, version } = JSON.parse(
        await readFile(join(root, 'packages', pkg.dir, 'package.json'), 'utf8'),
      );
      return { ...pkg, name, description, version };
    }),
  );

/** One card per published package for /packages/. */
const buildPackageCards = (packages) => {
  const cards = [];
  const guides = {
    'lucide-react': '/react/',
    vue: '/vue/',
    svelte: '/svelte/',
    'lucide-static': '/svg/',
  };
  for (const { dir, logo, logoDark, upstream, name, description } of packages) {
    const npm = `https://www.npmjs.com/package/${name}`;
    const logoSrc = logo ? `/framework-logos/${logo}.svg` : '/filed-lucide-logo.svg?v=3';
    const logos = logoDark
      ? `<img class="logo-light" src="${logoSrc}" alt=""><img class="logo-dark" src="/framework-logos/${logoDark}.svg" alt="">`
      : `<img src="${logoSrc}" alt="">`;
    cards.push(`<article class="package-card">
          <header>
            <div class="package-logo">${logos}</div>
            <div class="package-title">
              <h2>${escapeHtml(name)}</h2>
              <a href="${npm}" target="_blank" rel="noreferrer"><img src="https://img.shields.io/npm/v/${name}" alt="npm version" height="20"></a>
              <a href="${npm}" target="_blank" rel="noreferrer"><img src="https://img.shields.io/npm/dw/${name}" alt="npm downloads" height="20"></a>
            </div>
          </header>
          <p>${escapeHtml(description)} Drop-in for <code>${escapeHtml(upstream)}</code>.</p>
          <footer>
            <a class="pill-button pill-button-primary" href="${guides[dir] || `${REPO}/blob/main/packages/${dir}/README.md`}">Guide</a>
            <a class="pill-button" href="${REPO}/tree/main/packages/${dir}" target="_blank" rel="noreferrer">Source</a>
          </footer>
        </article>`);
  }
  return cards.join('\n        ');
};

const SITE = 'https://filledlucide.dev';
const AUTHOR = {
  '@type': 'Person',
  '@id': `${SITE}/#author`,
  name: 'Linus S',
  url: 'https://github.com/linus-sch',
};
const OG_IMAGE = {
  url: `${SITE}/og-image.png`,
  width: 1200,
  height: 630,
  alt: 'Filled Lucide — Beautiful & Filled Lucide Icons',
};
const LUCIDE = {
  '@type': 'SoftwareSourceCode',
  name: 'Lucide',
  url: 'https://lucide.dev',
  codeRepository: 'https://github.com/lucide-icons/lucide',
};
const LICENSE_URL = 'https://opensource.org/license/isc-license-txt';

/** Indexable pages, in sitemap order. */
const PAGES = ['/', '/packages/'];

/** Structured data for each indexable page, as a schema.org @graph. */
const structuredData = (path, { iconCount, labCount, packages, page }) => {
  const url = SITE + path;
  const website = {
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    url: `${SITE}/`,
    name: 'Filled Lucide',
    alternateName: ['filled-lucide', 'Lucide Filled'],
    description: 'Filled versions of the Lucide icon set.',
    inLanguage: 'en',
    publisher: { '@id': AUTHOR['@id'] },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
  const image = {
    '@type': 'ImageObject',
    '@id': `${SITE}/#image`,
    ...OG_IMAGE,
    contentUrl: OG_IMAGE.url,
    caption: OG_IMAGE.alt,
  };
  const iconSet = {
    '@type': 'SoftwareSourceCode',
    '@id': `${SITE}/#icons`,
    name: 'Filled Lucide',
    description: `Filled versions of all ${iconCount} Lucide icons and ${labCount} Lucide Lab icons, published as SVG files and as icon components for JavaScript, React, Vue, Svelte, Solid, Preact, React Native, Angular and Astro.`,
    url: `${SITE}/`,
    codeRepository: REPO,
    programmingLanguage: ['TypeScript', 'JavaScript', 'SVG'],
    license: LICENSE_URL,
    isAccessibleForFree: true,
    isBasedOn: LUCIDE,
    author: { '@id': AUTHOR['@id'] },
    image: { '@id': image['@id'] },
    keywords:
      'filled icons, solid icons, lucide, lucide filled, lucide solid, svg icons, icon library, react icons, vue icons, svelte icons, angular icons',
  };
  const breadcrumb = (items) => ({
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: items.map(([name, item], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item,
    })),
  });

  const graph = [website, AUTHOR, image];
  if (path === '/') {
    graph.push(
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: 'Filled Lucide — Beautiful Filled & Solid Lucide Icons',
        isPartOf: { '@id': website['@id'] },
        about: { '@id': iconSet['@id'] },
        mainEntity: { '@id': iconSet['@id'] },
        primaryImageOfPage: { '@id': image['@id'] },
        inLanguage: 'en',
      },
      iconSet,
    );
  } else if (path === '/packages/') {
    graph.push(
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: 'Filled Lucide Packages',
        isPartOf: { '@id': website['@id'] },
        about: { '@id': iconSet['@id'] },
        mainEntity: { '@id': `${url}#packages` },
        primaryImageOfPage: { '@id': image['@id'] },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        inLanguage: 'en',
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#packages`,
        name: 'Filled Lucide packages',
        numberOfItems: packages.length,
        itemListElement: packages.map(({ dir, name, description, upstream }, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SoftwareSourceCode',
            name,
            description: `${description} Drop-in replacement for ${upstream}.`,
            url: `https://www.npmjs.com/package/${name}`,
            codeRepository: `${REPO}/tree/main/packages/${dir}`,
            license: LICENSE_URL,
            isAccessibleForFree: true,
            isPartOf: { '@id': iconSet['@id'] },
          },
        })),
      },
      iconSet,
      breadcrumb([
        ['Icons', `${SITE}/`],
        ['Packages', url],
      ]),
    );
  } else if (page) {
    graph.push(
      {
        '@type': page.type || 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        isPartOf: { '@id': website['@id'] },
        about: { '@id': iconSet['@id'] },
        primaryImageOfPage: { '@id': image['@id'] },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        inLanguage: 'en',
      },
      iconSet,
      breadcrumb(page.crumbs.map(([name, href]) => [name, SITE + href])),
    );
  }
  // `<` is escaped so no string in the data can close the script element.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
    /</g,
    '\\u003c',
  );
};

/**
 * Canonical URL, robots, icons, Open Graph, Twitter card and JSON-LD for an
 * indexable page. Title and description are read from the page itself so they
 * are written once.
 */
const seoHead = (html, path, data) => {
  const title = html.match(/<title>([^<]*)<\/title>/)[1];
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)[1];
  const url = SITE + path;
  return `<link rel="canonical" href="${url}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="author" content="${AUTHOR.name}" />
    <meta name="application-name" content="Filled Lucide" />
    <meta name="apple-mobile-web-app-title" content="Filled Lucide" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Filled Lucide" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${OG_IMAGE.url}" />
    <meta property="og:image:secure_url" content="${OG_IMAGE.url}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="${OG_IMAGE.width}" />
    <meta property="og:image:height" content="${OG_IMAGE.height}" />
    <meta property="og:image:alt" content="${escapeAttr(OG_IMAGE.alt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${OG_IMAGE.url}" />
    <meta name="twitter:image:alt" content="${escapeAttr(OG_IMAGE.alt)}" />
    <script type="application/ld+json">${structuredData(path, data)}</script>`;
};

const sitemap = (paths, lastmod) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${SITE}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;

// A changed sprite, index, logo or script gets a new URL even in browsers that
// cached the old stable URLs before this deployment.
async function buildVersionedAssets() {
  const files = (await readdir(out, { withFileTypes: true }))
    .filter(
      (entry) => entry.isFile() && /\.(svg|json|js|css|png|ico|webmanifest)$/.test(entry.name),
    )
    .map((entry) => entry.name)
    .filter((file) => file !== 'meta.json');
  files.push(
    ...(await readdir(join(out, 'framework-logos'))).map((file) => `framework-logos/${file}`),
  );
  const assets = await Promise.all(
    files.sort().map(async (file) => [file, await readFile(join(out, file))]),
  );
  const hash = createHash('sha256');
  for (const [file, content] of assets) hash.update(file).update('\0').update(content).update('\0');
  const revision = hash.digest('hex').slice(0, 16);
  const base = `/assets/${revision}`;
  const paths = new Set(files.map((file) => `/${file}`));
  const rewriteReferences = (source) =>
    source.replace(
      /((?:src|href)="|"src":\s*")(\/[^"?#]*)(?:\?[^"#]*)?(#[^"]*)?"/g,
      (match, attribute, path, fragment = '') =>
        paths.has(path) ? `${attribute}${base}${path}${fragment}"` : match,
    );

  for (const [file, content] of assets) {
    const body = /\.(js|css|webmanifest)$/.test(file)
      ? rewriteReferences(content.toString().replaceAll('{{assetRevision}}', revision))
      : content;
    const target = join(out, 'assets', revision, file);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, body);
    await writeFile(join(out, file), body);
  }
  return { revision, rewriteReferences };
}

async function main() {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const sets = await readSets();
  const summary = [];

  for (const { prefix, icons } of sets) {
    const dir = join(out, prefix);
    await mkdir(dir, { recursive: true });
    const outlineDir = join(out, 'outline', prefix);
    await mkdir(outlineDir, { recursive: true });
    // Served files are minified: the repo keeps Lucide's readable layout, the
    // edge does not need the whitespace.
    for (const icon of icons) {
      await writeFile(join(dir, `${icon.name}.svg`), iconFile(icon.path), 'utf8');
      await writeFile(join(outlineDir, `${icon.name}.svg`), icon.outline, 'utf8');
    }

    await writeFile(
      join(out, `${prefix}.json`),
      JSON.stringify(Object.fromEntries(icons.map((i) => [i.name, i.path]))),
      'utf8',
    );
    await writeFile(
      join(out, `${prefix}-index.json`),
      JSON.stringify(icons.map((i) => ({ n: i.name, t: i.tags, c: i.categories, a: i.aliases }))),
      'utf8',
    );
    await writeFile(
      join(out, prefix === 'icons' ? 'sprite.svg' : `sprite-${prefix}.svg`),
      buildSprite(icons),
      'utf8',
    );
    await writeFile(
      join(out, prefix === 'icons' ? 'sprite-outline.svg' : `sprite-outline-${prefix}.svg`),
      buildOutlineSprite(icons),
      'utf8',
    );
    summary.push({ prefix, count: icons.length });
  }

  const categories = Object.fromEntries(
    await Promise.all(
      (await readdir(join(root, 'categories')))
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const meta = JSON.parse(await readFile(join(root, 'categories', f), 'utf8'));
          return [basename(f, '.json'), meta.title ?? basename(f, '.json')];
        }),
    ),
  );
  await writeFile(join(out, 'categories.json'), JSON.stringify(categories), 'utf8');

  await cp(join(root, 'tools/build-cdn/site'), out, { recursive: true });
  const { revision, rewriteReferences } = await buildVersionedAssets();
  const total = summary.reduce((s, x) => s + x.count, 0);
  await writeFile(
    join(out, 'meta.json'),
    JSON.stringify(
      {
        name: 'filled-lucide',
        total,
        sets: summary,
        revision,
        generated: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );

  const packages = await readPackages();
  const count = (prefix) => summary.find((s) => s.prefix === prefix).count.toLocaleString('en-US');
  const data = { iconCount: count('icons'), labCount: count('lab'), packages };
  for (const path of PAGES) {
    const page = join(out, path, 'index.html');
    let html = (await readFile(page, 'utf8'))
      .replaceAll('{{iconCount}}', data.iconCount)
      .replaceAll('{{labCount}}', data.labCount)
      .replace('<!-- footer-navigation -->', footerNavigation)
      .replace('<!-- package-cards -->', buildPackageCards(packages));
    html = html.replace('<!-- seo -->', seoHead(html, path, data));
    await writeFile(page, rewriteReferences(html), 'utf8');
  }
  const template = await readFile(join(out, 'page.html'), 'utf8');
  const navigationTemplate = await readFile(join(out, 'packages/index.html'), 'utf8');
  const pages = buildPages({ sets, categories, packages });
  for (const page of pages) {
    const dir = join(out, page.path);
    await mkdir(dir, { recursive: true });
    let html = template
      .replace('<!-- page-nav -->', pageNavigation(navigationTemplate, page.path))
      .replace('<!-- page-footer -->', pageFooter(navigationTemplate));
    for (const key of ['title', 'description', 'heading', 'eyebrow']) {
      html = html.replaceAll(`{{${key}}}`, escapeHtml(page[key]));
    }
    html = html
      .replace('{{breadcrumbs}}', () => page.breadcrumbs)
      .replace('{{content}}', () => page.content);
    html = html.replace('<!-- seo -->', seoHead(html, page.path, { ...data, page }));
    await writeFile(join(dir, 'index.html'), rewriteReferences(html), 'utf8');
  }
  const notFound = join(out, '404.html');
  await writeFile(notFound, rewriteReferences(await readFile(notFound, 'utf8')), 'utf8');
  await rm(join(out, 'page.html'));
  await writeFile(
    join(out, 'sitemap.xml'),
    sitemap([...PAGES, ...pages.map((page) => page.path)], new Date().toISOString().slice(0, 10)),
    'utf8',
  );
  await writeFile(join(out, 'robots.txt'), robots, 'utf8');

  console.log(`CDN bundle -> ${out}`);
  for (const { prefix, count } of summary) console.log(`  ${prefix}: ${count} icons`);
}

await main();
