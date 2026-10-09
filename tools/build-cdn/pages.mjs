// Indexable content pages generated from the same icon and package data as the CDN.
const REPO = 'https://github.com/linus-sch/filled-lucide';
const SITE = 'https://filledlucide.dev';
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  );
const componentName = (name) =>
  name.replace(/(^|-)([a-z0-9])/g, (_, dash, char) => char.toUpperCase());
const displayName = (name) => name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());
const uiIcon = (name) =>
  `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite-outline.svg#${name}" /></svg>`;
const filledSvg = (icon, size = 24, color = 'currentColor') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" fill-rule="evenodd"><path d="${escape(icon.path)}"/></svg>`;
const code = (source, label = 'Code', extraClass = '') =>
  `<div class="code-block ${extraClass}"><div class="code-heading"><span>${escape(label)}</span><button type="button" data-copy-code aria-label="Copy ${escape(label)}">${uiIcon('copy')}<span>Copy</span></button></div><pre><code>${escape(source)}</code></pre></div>`;
const section = (id, title, content) =>
  `<section class="guide-section" id="${id}"><h2>${title}</h2>${content}</section>`;
const note = (text) => `<p class="content-note">${text}</p>`;
const links = [
  ['Icons', '/'],
  ['Categories', '/categories/'],
  ['React', '/react/'],
  ['Vue', '/vue/'],
  ['Svelte', '/svelte/'],
  ['SVG', '/svg/'],
  ['Filled vs. outline', '/lucide-filled-vs-outline/'],
  ['Docs', '/docs/'],
  ['Changelog', '/changelog/'],
];

export const footerNavigation = `<nav class="footer-navigation" aria-label="Explore Filled Lucide">${links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav>`;

export function pageNavigation(template, path) {
  // Reuse the existing site's navigation so changes to its branding are shared.
  let nav = template.match(/<nav\b[\s\S]*?<\/nav>/)[0];
  nav = nav.replace(/\s+aria-current="page"/g, '');
  nav = nav.replaceAll(
    'href="/categories/"',
    `href="/categories/"${path.startsWith('/categories/') ? ' aria-current="page"' : ''}`,
  );
  nav = nav.replaceAll(
    'href="/docs/"',
    `href="/docs/"${path === '/docs/' ? ' aria-current="page"' : ''}`,
  );
  nav = nav.replace(
    /\s*<\/div>\s*<\/nav>$/,
    `<button class="theme-toggle header-theme" type="button" aria-label="Switch to dark mode">${uiIcon('sun')}</button></div></nav>`,
  );
  return nav;
}

export function pageFooter(template) {
  return footerNavigation + template.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
}

const breadcrumbs = (items) =>
  `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${items.map(([label, href], i) => `<li>${i === items.length - 1 ? `<span aria-current="page">${escape(label)}</span>` : `<a href="${href}">${escape(label)}</a>`}</li>`).join('')}</ol></nav>`;
const iconCards = (icons) =>
  icons
    .map(
      (icon) =>
        `<a class="detail-icon-card" href="/icons/${icon.name}/" data-name="${escape([icon.name, ...icon.tags, ...icon.aliases].join(' ').toLowerCase())}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#${icon.name}" /></svg><span>${escape(icon.name)}</span></a>`,
    )
    .join('');
const guideLayout = (sections, content) =>
  `<div class="guide-layout"><aside><nav class="guide-toc" aria-label="On this page"><span>On this page</span>${sections.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav></aside><div class="guide-body">${content}</div></div>`;
const install = (name) =>
  `<div class="install-block" data-package="${escape(name)}"><div class="package-managers" role="group" aria-label="Package manager">${['npm', 'pnpm', 'yarn', 'bun'].map((manager) => `<button type="button" data-install-manager="${manager}" aria-pressed="${manager === 'npm'}">${manager}</button>`).join('')}</div>${code(`npm install ${name}`, 'Terminal', 'install-command')}</div>`;
const guideLinks = `<div class="guide-cards">${[
  ['react', 'React', 'Component icons for React and Next.js.'],
  ['vue', 'Vue', 'Component icons for Vue 3 and Nuxt.'],
  ['svelte', 'Svelte', 'Component icons for Svelte 5 and SvelteKit.'],
  ['svg', 'SVG', 'Plain SVGs, CSS masks and sprites.'],
]
  .map(
    ([slug, title, text]) =>
      `<a class="guide-card" href="/${slug}/"><img src="/framework-logos/${slug}.svg" width="32" height="32" alt="" /><h2>${title} ${uiIcon('arrow-up-right')}</h2><p>${text}</p></a>`,
  )
  .join('')}</div>`;
const usage = (framework, name = 'house', mixed = false) => {
  const component = componentName(name);
  if (framework === 'react')
    return mixed
      ? `import { useState } from 'react';\nimport { ${component} } from 'lucide-react';\nimport { Filled${component} } from '@filled-lucide/react';\n\nexport default function ToggleIcon() {\n  const [active, setActive] = useState(false);\n\n  return (\n    <button\n      aria-label="${displayName(name)}"\n      aria-pressed={active}\n      onClick={() => setActive(!active)}\n    >\n      {active ? <Filled${component} /> : <${component} />}\n    </button>\n  );\n}`
      : `import { ${component} } from '@filled-lucide/react';\n\nexport default function App() {\n  return <${component} size={32} color="#c43232" />;\n}`;
  if (framework === 'vue')
    return mixed
      ? `<script setup>\nimport { ref } from 'vue';\nimport { ${component} } from '@lucide/vue';\nimport { Filled${component} } from '@filled-lucide/vue';\n\nconst active = ref(false);\n</script>\n\n<template>\n  <button\n    aria-label="${displayName(name)}"\n    :aria-pressed="active"\n    @click="active = !active"\n  >\n    <Filled${component} v-if="active" />\n    <${component} v-else />\n  </button>\n</template>`
      : `<script setup>\nimport { ${component} } from '@filled-lucide/vue';\n</script>\n\n<template>\n  <${component} :size="32" color="#c43232" />\n</template>`;
  return mixed
    ? `<script>\n  import { ${component} } from '@lucide/svelte';\n  import { Filled${component} } from '@filled-lucide/svelte';\n\n  let active = $state(false);\n</script>\n\n<button\n  aria-label="${displayName(name)}"\n  aria-pressed={active}\n  onclick={() => (active = !active)}\n>\n  {#if active}\n    <Filled${component} />\n  {:else}\n    <${component} />\n  {/if}\n</button>`
    : `<script>\n  import ${component} from '@filled-lucide/svelte/icons/${name}';\n</script>\n\n<${component} size={32} color="#c43232" />`;
};
const properties = `<div class="table-scroll"><table class="content-table"><thead><tr><th>Prop</th><th>Default</th><th>What it does</th></tr></thead><tbody><tr><td><code>size</code></td><td><code>24</code></td><td>Sets the icon's width and height.</td></tr><tr><td><code>color</code></td><td><code>currentColor</code></td><td>Sets the fill color. Inherits the surrounding text color by default.</td></tr><tr><td><code>strokeWidth</code></td><td>—</td><td>Accepted for compatibility; filled icons have no stroke.</td></tr><tr><td><code>absoluteStrokeWidth</code></td><td>—</td><td>Accepted for compatibility; has no visible effect.</td></tr></tbody></table></div>`;

export function buildPages({ sets, categories, packages }) {
  const icons = sets.find((set) => set.prefix === 'icons').icons;
  const labCount = sets.find((set) => set.prefix === 'lab').icons.length;
  const pages = [];
  const add = (path, heading, eyebrow, description, content, extra = {}) => {
    const crumbs = extra.crumbs || [
      ['Icons', '/'],
      [eyebrow, path],
    ];
    pages.push({
      path,
      heading,
      eyebrow,
      title: `${heading} — Filled Lucide`,
      description,
      content,
      breadcrumbs: breadcrumbs(crumbs),
      crumbs,
      ...extra,
    });
  };

  for (const icon of icons) {
    const path = `/icons/${icon.name}/`;
    const related = icons
      .filter((other) => other !== icon)
      .map((other) => ({
        icon: other,
        score:
          (other.name.startsWith(icon.name + '-') || icon.name.startsWith(other.name + '-')
            ? 20
            : 0) +
          other.categories.filter((category) => icon.categories.includes(category)).length * 2 +
          other.tags.filter((tag) => icon.tags.includes(tag)).length,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.icon.name.localeCompare(b.icon.name))
      .slice(0, 12)
      .map((item) => item.icon);
    const tabs = `<div class="usage-tabs" data-tabs><div class="content-tabs" role="tablist" aria-label="Icon code format">${['react', 'vue', 'svelte', 'svg'].map((framework, i) => `<button type="button" id="tab-${framework}" role="tab" aria-selected="${i === 0}" aria-controls="panel-${framework}" data-tab="${framework}">${framework === 'svg' ? 'SVG' : displayName(framework)}</button>`).join('')}</div>${['react', 'vue', 'svelte', 'svg'].map((framework) => `<div id="panel-${framework}" role="tabpanel" aria-labelledby="tab-${framework}" tabindex="0" data-panel="${framework}">${code(framework === 'svg' ? filledSvg(icon) : usage(framework, icon.name), framework === 'svg' ? 'SVG' : displayName(framework))}${framework !== 'svg' ? `<a class="text-link" href="/${framework}/">${displayName(framework)} installation guide ${uiIcon('arrow-right')}</a>` : ''}</div>`).join('')}</div>`;
    add(
      path,
      `${displayName(icon.name)} icon`,
      'Filled icon',
      `Free filled ${icon.name} SVG icon. Preview filled and outline styles, customize its size and color, and copy code for React, Vue or Svelte.`,
      `<div class="icon-detail" data-icon-detail><div class="icon-preview-column"><div class="style-previews"><div class="style-preview"><div class="preview-canvas" data-icon-preview>${filledSvg(icon, 64)}</div><span>Filled</span></div><div class="style-preview"><div class="preview-canvas" data-icon-preview><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.outlineBody}</svg></div><span>Outline</span></div></div><div class="preview-controls"><label for="preview-size">Size <output id="preview-size-value" for="preview-size">64 px</output></label><input id="preview-size" type="range" min="16" max="128" value="64" data-icon-size /><label class="color-label" for="preview-color">Color <input id="preview-color" type="color" value="#4f4f4f" data-icon-color /></label></div><div class="detail-actions"><button class="pill-button pill-button-primary" type="button" data-copy-icon>Copy SVG</button><a class="pill-button" href="/icons/${icon.name}.svg" download="${icon.name}.svg" data-download-icon>Download SVG</a></div><p class="detail-caption">24 × 24 grid · ISC license · Free to use</p></div><div class="icon-info"><p class="content-intro">A filled version of Lucide's <strong>${escape(icon.name)}</strong> icon. Same name, same grid, ready for your next interface.</p><h2>Use this icon</h2>${tabs}<h2>Categories</h2><div class="metadata-links">${icon.categories.map((slug) => `<a href="/categories/${slug}/">${escape(categories[slug] || displayName(slug))}</a>`).join('') || '<span>General</span>'}</div><h2>Tags</h2><div class="metadata-links">${icon.tags.map((tag) => `<a href="/?q=${encodeURIComponent(tag)}">${escape(tag)}</a>`).join('') || '<span>No tags</span>'}</div>${icon.aliases.length ? `<p class="detail-caption">Also known as ${icon.aliases.map(escape).join(', ')}.</p>` : ''}</div></div>${related.length ? section('related', 'Related icons', `<div class="detail-icon-grid">${iconCards(related)}</div>`) : ''}<script type="application/json" id="icon-data">${JSON.stringify({ name: icon.name, svg: filledSvg(icon) }).replace(/</g, '\\u003c')}</script>`,
      {
        crumbs: [
          ['Icons', '/'],
          [displayName(icon.name), path],
        ],
        type: 'ItemPage',
      },
    );
  }

  const categoryEntries = Object.entries(categories).sort((a, b) => a[1].localeCompare(b[1]));
  add(
    '/categories/',
    'An icon for every idea',
    'Categories',
    'Browse filled Lucide icons by category. Find icons for navigation, communication, design, development, and more.',
    `<p class="content-intro">Explore the collection by what you're building.</p><div class="category-grid">${categoryEntries
      .map(([slug, title]) => {
        const members = icons.filter((icon) => icon.categories.includes(slug));
        return `<a class="category-card" href="/categories/${slug}/"><div class="category-samples">${members
          .slice(0, 4)
          .map(
            (icon) =>
              `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#${icon.name}" /></svg>`,
          )
          .join(
            '',
          )}</div><h2>${escape(title)} ${uiIcon('arrow-up-right')}</h2><p>${members.length} icons</p></a>`;
      })
      .join('')}</div>`,
    { type: 'CollectionPage' },
  );
  for (const [slug, title] of categoryEntries) {
    const members = icons.filter((icon) => icon.categories.includes(slug));
    add(
      `/categories/${slug}/`,
      `${title} icons`,
      'Categories',
      `Browse ${members.length} free filled ${title.toLowerCase()} icons. Download SVGs or use them in React, Vue and Svelte.`,
      `<div class="category-toolbar"><p class="content-intro"><span data-category-count>${members.length}</span> filled icons for ${escape(title.toLowerCase())}.</p><label class="category-search">${uiIcon('search')}<input type="search" aria-label="Search ${escape(title)} icons" placeholder="Search this category…" data-category-search /></label></div><div class="detail-icon-grid" data-category-grid>${iconCards(members)}</div><p class="category-empty content-note" role="status" hidden>No icons match your search. Try another word.</p><a class="text-link" href="/categories/">${uiIcon('arrow-left')} All categories</a>`,
      {
        crumbs: [
          ['Icons', '/'],
          ['Categories', '/categories/'],
          [title, `/categories/${slug}/`],
        ],
        type: 'CollectionPage',
      },
    );
  }

  for (const [framework, dir, upstream, compatibility] of [
    ['react', 'lucide-react', 'lucide-react', 'React'],
    ['vue', 'vue', '@lucide/vue', 'Vue 3'],
    ['svelte', 'svelte', '@lucide/svelte', 'Svelte 5'],
  ]) {
    const pkg = packages.find((item) => item.dir === dir);
    const title = displayName(framework);
    const sections = [
      ['installation', 'Installation'],
      ['usage', 'Usage'],
      ['customization', 'Customization'],
      ['mix-styles', 'Filled + outline'],
      ['migration', 'Switch from Lucide'],
      ['accessibility', 'Accessibility'],
    ];
    const accessibility = `<button aria-label="Go home">\n  <House aria-hidden="true" />\n</button>`;
    add(
      `/${framework}/`,
      `Filled icons for ${title}`,
      `${title} guide`,
      `Install ${pkg.name} for ${compatibility}. Use ${icons.length.toLocaleString('en-US')} filled Lucide icons with the same names and component API as ${upstream}.`,
      `<p class="content-intro">${icons.length.toLocaleString('en-US')} filled icons. The Lucide names and API you already know, for ${compatibility}.</p>${guideLayout(
        sections,
        section(
          'installation',
          'Installation',
          `<p>Add <code>${pkg.name}</code> to your project.</p>${install(pkg.name)}<p class="detail-caption">Icon set version ${escape(pkg.version)} · <a class="text-link" href="https://www.npmjs.com/package/${pkg.name}">View on npm ${uiIcon('arrow-up-right')}</a></p>`,
        ) +
          section(
            'usage',
            'Usage',
            `<p>Import the icons you use. Each one is a ${title} component.</p>${code(usage(framework), title)}${note('Named or per-icon imports let your bundler leave unused icons out of the final bundle.')}`,
          ) +
          section(
            'customization',
            'Make it yours',
            `<p>Set the size and color with props, or let the icon inherit its color from the surrounding text.</p>${properties}${note('Filled icons use <code>fill="currentColor"</code> and have no stroke. A stroke-width setting will not make them heavier or lighter.')}`,
          ) +
          section(
            'mix-styles',
            'Filled and outline, together',
            `<p>Every icon also has a <code>Filled</code> export, so it can sit alongside its outline counterpart. Install <code>${upstream}</code> too for this example.</p>${code(usage(framework, 'house', true), title)}<a class="text-link" href="/lucide-filled-vs-outline/">Compare the two styles ${uiIcon('arrow-right')}</a>`,
          ) +
          section(
            'migration',
            'Switch an existing app',
            `<p>Keep your existing imports by installing the filled package under the upstream name.</p>${install(`${upstream}@npm:${pkg.name}`)}<p>Dependencies that import <code>${upstream}</code> will use this alias too when they resolve to the same installed package. If a dependency installs its own copy, add an override in your package manager.</p>${code(JSON.stringify({ pnpm: { overrides: { [upstream]: `npm:${pkg.name}` } } }, null, 2), 'package.json (pnpm)')}${note('Versions follow upstream Lucide. Match the filled and outline package versions when mixing the sets.')}`,
          ) +
          section(
            'accessibility',
            'Give the action a name',
            `<p>Label the button or link an icon belongs to. Hide a decorative icon from assistive technology.</p>${code(accessibility, title)}<p>When an icon conveys information on its own, provide an accessible label.</p>`,
          ),
      )}`,
    );
  }

  const house = icons.find((icon) => icon.name === 'house');
  const staticPkg = packages.find((pkg) => pkg.dir === 'lucide-static');
  add(
    '/svg/',
    'Filled icons, pure SVG',
    'SVG guide',
    'Use filled Lucide SVG icons without a framework. Download individual files, copy inline SVG, use CSS masks, or use the SVG sprite.',
    `<p class="content-intro">No framework required. Copy an SVG, download a file, or use the hosted icon set.</p>${guideLayout(
      [
        ['inline', 'Inline SVG'],
        ['files', 'SVG files'],
        ['masks', 'CSS masks'],
        ['sprite', 'SVG sprite'],
        ['package', 'npm package'],
      ],
      section(
        'inline',
        'Copy and paste',
        `<p>Choose an icon in the <a href="/">icon browser</a> and copy its SVG. Inline icons inherit the surrounding text color.</p>${code(filledSvg(house), 'SVG')}`,
      ) +
        section(
          'files',
          'Use a single file',
          `<p>Use a hosted SVG directly, or download it and serve it with your own assets.</p>${code(`<img\n  src="${SITE}/icons/house.svg"\n  width="24"\n  height="24"\n  alt="Home"\n/>`, 'HTML')}${note('An SVG inside an <code>&lt;img&gt;</code> does not inherit your page’s text color. Use inline SVG or a CSS mask when you need to recolor it.')}`,
        ) +
        section(
          'masks',
          'Color it with CSS',
          `<p>A mask takes the color of its background. Set that background to <code>currentColor</code> to match your text.</p>${code(`.icon-house {\n  display: inline-block;\n  width: 1.5em;\n  height: 1.5em;\n  background: currentColor;\n  -webkit-mask: url('${SITE}/icons/house.svg') center / contain no-repeat;\n  mask: url('${SITE}/icons/house.svg') center / contain no-repeat;\n}`, 'CSS')}${code('<span class="icon-house" aria-hidden="true"></span>', 'HTML')}`,
        ) +
        section(
          'sprite',
          'Use the SVG sprite',
          `<p>Download <a href="/sprite.svg" download>sprite.svg</a> and serve it from your own origin. Reference an icon by its name.</p>${code('<svg width="24" height="24" aria-hidden="true">\n  <use href="/sprite.svg#house" />\n</svg>', 'HTML')}${note('External SVG <code>&lt;use&gt;</code> references need to be on the same origin as your page. Host the sprite yourself; individual SVG files and CSS masks can use the CDN.')}`,
        ) +
        section(
          'package',
          'Keep the files in your project',
          `<p>The static package includes SVG files, an SVG sprite and an icon font.</p>${install(staticPkg.name)}${code("import { House } from '@filled-lucide/static';\n\n// House is an SVG string.", 'JavaScript')}<a class="text-link" href="/icons/house/">Try the house icon ${uiIcon('arrow-right')}</a>`,
        ),
    )}`,
  );

  const comparisons = ['heart', 'house', 'star', 'bell', 'bookmark', 'user', 'settings', 'camera']
    .map((name) => icons.find((icon) => icon.name === name))
    .filter(Boolean);
  add(
    '/lucide-filled-vs-outline/',
    'Same Lucide. A fuller look.',
    'Filled vs. outline',
    'Compare filled and outline Lucide icons side by side. Learn how their rendering differs and use both styles with the same icon names.',
    `<p class="content-intro">Two styles, one visual language. Filled Lucide gives Lucide's familiar shapes a solid counterpart.</p><div class="comparison-grid">${comparisons.map((icon) => `<a class="comparison-card" href="/icons/${icon.name}/"><div><figure><svg viewBox="0 0 24 24" fill="none" stroke-width="2" aria-hidden="true"><use href="/sprite-outline.svg#${icon.name}" /></svg><figcaption>Outline</figcaption></figure><figure><svg viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#${icon.name}" /></svg><figcaption>Filled</figcaption></figure></div><span>${icon.name}</span></a>`).join('')}</div>${guideLayout(
      [
        ['differences', 'What changes'],
        ['choosing', 'Choosing a style'],
        ['together', 'Use both'],
      ],
      section(
        'differences',
        'What changes',
        `<div class="table-scroll"><table class="content-table"><thead><tr><th></th><th>Lucide outline</th><th>Filled Lucide</th></tr></thead><tbody><tr><th>Rendering</th><td>Strokes and SVG shapes</td><td>A single filled path, with the even-odd rule</td></tr><tr><th>Color</th><td><code>stroke="currentColor"</code></td><td><code>fill="currentColor"</code></td></tr><tr><th>Weight</th><td>Adjustable stroke width</td><td>Fixed geometry; scales with size</td></tr><tr><th>Names &amp; grid</th><td>Lucide names, 24 × 24</td><td>Same names, same grid</td></tr><tr><th>License</th><td>ISC</td><td>ISC</td></tr></tbody></table></div><p>The filled set is composed for a solid style. It goes beyond adding a fill to the original outline SVG.</p>`,
      ) +
        section(
          'choosing',
          'Choose what fits the interface',
          `<p>Outline icons keep a light presence in dense navigation and toolbars. Filled icons give an action or selected state more visual weight.</p><p>Try a filled heart for a saved item, a filled bookmark for an active collection, or a filled home for the current navigation destination. Keep the size and color consistent when switching styles.</p>`,
        ) +
        section(
          'together',
          'Use both in the same app',
          `<p>Use the <code>Filled</code> prefix to avoid name collisions. Here's an example in React.</p>${code(usage('react', 'heart', true), 'React')}${guideLinks}`,
        ),
    )}`,
  );

  add(
    '/docs/',
    'Small icons. Simple setup.',
    'Documentation',
    'Get started with Filled Lucide. Installation, customization, migration from Lucide, SVG usage, and answers to common questions.',
    `<p class="content-intro">Choose your framework, find an icon, and make it yours.</p>${guideLinks}${guideLayout(
      [
        ['start', 'Get started'],
        ['customize', 'Size & color'],
        ['migration', 'Switch from Lucide'],
        ['faq', 'Common questions'],
      ],
      section(
        'start',
        'From library to interface',
        `<ol class="getting-started"><li><strong>Find your icon.</strong> Browse <a href="/">${icons.length.toLocaleString('en-US')} filled icons</a> or explore <a href="/categories/">the categories</a>.</li><li><strong>Choose how to use it.</strong> Install a framework package, or copy the SVG directly.</li><li><strong>Set the size and color.</strong> All icons use a 24 × 24 grid and scale to any size.</li></ol>${install('@filled-lucide/react')}${code(usage('react'), 'React')}`,
      ) +
        section(
          'customize',
          'Size and color',
          `<p>Icons render at 24 pixels and inherit <code>currentColor</code> by default. Framework components accept <code>size</code> and <code>color</code>. Inline SVGs can also be styled with CSS.</p>${properties}<p>For SVG files, CSS masks and sprites, follow the <a href="/svg/">SVG guide</a>.</p>`,
        ) +
        section(
          'migration',
          'Already using Lucide?',
          `<p>Every icon keeps its Lucide name. Change your import to a filled package, or use a package alias to switch an existing app.</p>${install('lucide-react@npm:@filled-lucide/react')}<p>To mix styles, import <code>House</code> from the outline package and <code>FilledHouse</code> from the filled package.</p><a class="text-link" href="/lucide-filled-vs-outline/">See filled and outline side by side ${uiIcon('arrow-right')}</a>`,
        ) +
        section(
          'faq',
          'A few useful answers',
          `<div class="faq-list">${[
            [
              'Is Filled Lucide free to use?',
              'Yes. The icon set uses the ISC license, including for commercial projects. Keep the license notice when redistributing the source or packages.',
            ],
            [
              'Is this an official Lucide project?',
              'Filled Lucide is an independent community project, built on Lucide. It is not affiliated with or endorsed by the Lucide team.',
            ],
            [
              'Can I change the stroke width?',
              'Filled icons have no strokes. The compatibility props are accepted, but do not change the appearance. Choose the outline style when you need adjustable stroke width.',
            ],
            [
              'Which frameworks are supported?',
              'React, Vue, Svelte, JavaScript, Solid, Preact, React Native, Angular and Astro, plus static SVGs. See <a href="/packages/">all packages</a>.',
            ],
            [
              'What about Lab icons?',
              `There are ${labCount} filled Lucide Lab icons. Enable Lab in the icon browser or explore the <a href="${REPO}/tree/main/packages/lab">Lab package</a>.`,
            ],
            [
              'Where should I report an issue?',
              `Report issues with filled icons in the <a href="${REPO}/issues">Filled Lucide repository</a>.`,
            ],
          ]
            .map(
              ([question, answer]) =>
                `<details><summary>${question}</summary><p>${answer}</p></details>`,
            )
            .join('')}</div>`,
        ),
    )}`,
  );

  const version = packages.find((pkg) => pkg.dir === 'lucide-react').version;
  add(
    '/changelog/',
    "What's new",
    'Changelog',
    'Follow updates to Filled Lucide: icon set versions, package support, website changes, and improvements to the filled icon family.',
    `<p class="content-intro">Updates to the icon family, its packages, and the site.</p><div class="changelog-list"><article class="changelog-entry"><div><time datetime="2026-10-08">October 8, 2026</time><span class="release-label">Website</span></div><section><h2>A home for every icon</h2><p>Dedicated icon pages with filled and outline previews, size and color controls, and code you can copy. Browse by category, follow a framework guide, or compare the two styles.</p><ul><li>Individual pages for ${icons.length.toLocaleString('en-US')} icons and ${categoryEntries.length} categories.</li><li>Getting-started guides for React, Vue, Svelte and SVG.</li><li>Documentation, style comparison and a changelog.</li></ul><a class="text-link" href="/categories/">Explore the categories ${uiIcon('arrow-right')}</a></section></article><article class="changelog-entry"><div><time datetime="2026-10-08">October 8, 2026</time><span class="release-label">Icon set ${escape(version)}</span></div><section><h2>The filled Lucide family</h2><p>${icons.length.toLocaleString('en-US')} filled icons and ${labCount} filled Lab icons, with Lucide's names and 24 × 24 grid. Framework packages use the <code>@filled-lucide</code> scope; the JavaScript package is <code>filled-lucide</code>.</p><ul><li>Packages for JavaScript, React, Vue, Svelte, Solid, Preact, React Native, Angular and Astro.</li><li>Static SVG files, sprites and an icon font.</li><li>Filled exports for using both styles together.</li></ul><a class="text-link" href="${REPO}/releases/tag/v${escape(version)}">Version ${escape(version)} on GitHub ${uiIcon('arrow-up-right')}</a></section></article></div><p class="content-note">Package versions follow upstream Lucide. See <a href="${REPO}/releases">GitHub releases</a> for published packages and <a href="${REPO}/commits/main/">commit history</a> for individual changes.</p>`,
  );
  return pages;
}
