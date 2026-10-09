import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { JSDOM } from 'jsdom';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '../..');
const parser = new new JSDOM('').window.DOMParser();
const xml = (source) => parser.parseFromString(source, 'image/svg+xml');

test('CDN bundle serves the unified browser and both icon styles', async (t) => {
  const output = await mkdtemp(join(tmpdir(), 'lucide-filled-cdn-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  await run(process.execPath, [
    join(import.meta.dirname, 'index.mjs'),
    '--root',
    root,
    '--out',
    output,
  ]);

  await t.test('unified page and redirect preserve existing filled asset URLs', async () => {
    assert.match(await readFile(join(output, 'index.html'), 'utf8'), /<title>Filled Lucide/);
    assert.match(await readFile(join(output, 'icons/index.html'), 'utf8'), /location.replace/);
    const meta = JSON.parse(await readFile(join(output, 'meta.json'), 'utf8'));
    for (const set of ['icons', 'lab']) {
      const names = (await readdir(join(root, set))).filter((file) => file.endsWith('.svg'));
      const paths = JSON.parse(await readFile(join(output, set + '.json'), 'utf8'));
      const index = JSON.parse(await readFile(join(output, set + '-index.json'), 'utf8'));
      assert.equal(meta.sets.find((entry) => entry.prefix === set).count, names.length);
      assert.equal(index.length, names.length);
      assert.equal(Object.keys(paths).length, names.length);
      await Promise.all(
        names.map(async (file) => {
          const original = xml(await readFile(join(root, set, file), 'utf8'));
          const published = xml(await readFile(join(output, set, file), 'utf8'));
          assert.equal(
            published.querySelector('path').getAttribute('d'),
            original.querySelector('path').getAttribute('d'),
            file,
          );
          assert.equal(published.documentElement.getAttribute('fill-rule'), 'evenodd');
        }),
      );
    }
  });

  await t.test('packages page lists every published package and the hero links to it', async () => {
    const home = new JSDOM(await readFile(join(output, 'index.html'), 'utf8')).window.document;
    assert.equal(home.querySelector('.hero-frameworks').getAttribute('href'), '/packages/');
    const packagesLink = [...home.querySelectorAll('.nav-links a')].find(
      (link) => link.textContent === 'Packages',
    );
    assert.equal(packagesLink.getAttribute('href'), '/packages/');
    assert.equal(packagesLink.hasAttribute('target'), false);

    const page = new JSDOM(await readFile(join(output, 'packages/index.html'), 'utf8')).window
      .document;
    const published = [];
    for (const dir of await readdir(join(root, 'packages'))) {
      try {
        const pkg = JSON.parse(await readFile(join(root, 'packages', dir, 'package.json'), 'utf8'));
        if (!pkg.private) published.push(pkg.name);
      } catch {
        // Not a package directory.
      }
    }
    const names = [...page.querySelectorAll('.package-card h2')].map((h2) => h2.textContent);
    assert.deepEqual([...names].sort(), published.sort());
    assert.equal(names[0], '@filled-lucide/js');
    const logos = [
      ...page.querySelectorAll('.package-logo img'),
      ...home.querySelectorAll('.hero-framework-logos img'),
    ];
    await Promise.all(
      logos.map((img) => readFile(join(output, img.getAttribute('src').replace(/\?.*$/, '')))),
    );
  });

  await t.test('indexable pages carry SEO metadata and structured data', async () => {
    const site = 'https://filledlucide.dev';
    const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
    assert.match(await readFile(join(output, 'robots.txt'), 'utf8'), /Sitemap: .*\/sitemap\.xml/);
    for (const path of ['/', '/packages/']) {
      assert.match(sitemap, new RegExp(`<loc>${site}${path}</loc>`));
      const html = await readFile(join(output, path, 'index.html'), 'utf8');
      assert.doesNotMatch(html, /<!-- seo -->|\{\{\w+\}\}/, path);
      const doc = new JSDOM(html).window.document;
      const content = (selector) => doc.querySelector(selector)?.getAttribute('content');
      assert.equal(doc.querySelector('link[rel=canonical]').getAttribute('href'), site + path);
      assert.equal(content('meta[property="og:url"]'), site + path);
      assert.equal(content('meta[property="og:title"]'), doc.title);
      assert.equal(content('meta[property="og:description"]'), content('meta[name=description]'));
      assert.equal(content('meta[name="twitter:card"]'), 'summary_large_image');
      const graph = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)[
        '@graph'
      ];
      assert.ok(
        graph.some((node) => node['@type'] === 'CollectionPage' && node.url === site + path),
      );
    }
    for (const asset of [
      'og-image.png',
      'apple-touch-icon.png',
      'icon-192.png',
      'icon-512.png',
      'favicon.ico',
      'manifest.webmanifest',
    ]) {
      await readFile(join(output, asset));
    }
    const notFound = new JSDOM(await readFile(join(output, '404.html'), 'utf8')).window.document;
    assert.equal(notFound.querySelector('meta[name=robots]').getAttribute('content'), 'noindex');
  });

  await t.test(
    'every icon and category has an indexable page with working internal links',
    async () => {
      const index = JSON.parse(await readFile(join(output, 'icons-index.json'), 'utf8'));
      const categories = JSON.parse(await readFile(join(output, 'categories.json'), 'utf8'));
      const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
      await Promise.all(
        index.map(async ({ n }) => {
          const path = `/icons/${n}/`;
          const html = await readFile(join(output, path, 'index.html'), 'utf8');
          assert.ok(sitemap.includes(`<loc>https://filledlucide.dev${path}</loc>`), path);
          assert.ok(html.includes(`href="https://filledlucide.dev${path}"`), path);
          assert.doesNotMatch(html, /<!-- seo -->|\{\{\w+\}\}/, path);
        }),
      );
      for (const slug of Object.keys(categories)) {
        const path = `/categories/${slug}/`;
        const html = await readFile(join(output, path, 'index.html'), 'utf8');
        assert.ok(sitemap.includes(`<loc>https://filledlucide.dev${path}</loc>`));
        const members = index.filter((icon) => icon.c.includes(slug));
        assert.equal((html.match(/class="detail-icon-card"/g) || []).length, members.length, slug);
      }
      const routes = [
        '/icons/heart/',
        '/categories/shapes/',
        '/categories/',
        '/react/',
        '/vue/',
        '/svelte/',
        '/svg/',
        '/lucide-filled-vs-outline/',
        '/docs/',
        '/changelog/',
      ];
      for (const path of routes) {
        const doc = new JSDOM(await readFile(join(output, path, 'index.html'), 'utf8')).window
          .document;
        assert.equal(doc.querySelectorAll('h1').length, 1, path);
        assert.equal(
          doc.querySelector('link[rel=canonical]').getAttribute('href'),
          'https://filledlucide.dev' + path,
        );
        const graph = JSON.parse(
          doc.querySelector('script[type="application/ld+json"]').textContent,
        )['@graph'];
        assert.ok(graph.some((node) => node.url === 'https://filledlucide.dev' + path));
        assert.ok(graph.some((node) => node['@type'] === 'BreadcrumbList'));
        for (const anchor of doc.querySelectorAll('a[href^="/"]')) {
          const href = new URL(anchor.getAttribute('href'), 'https://filledlucide.dev').pathname;
          await readFile(join(output, href, href.endsWith('/') ? 'index.html' : ''));
        }
        for (const anchor of doc.querySelectorAll('.guide-toc a')) {
          assert.ok(doc.querySelector(anchor.getAttribute('href')));
        }
      }
      const svelte = new JSDOM(await readFile(join(output, 'svelte/index.html'), 'utf8')).window
        .document;
      assert.ok(svelte.getElementById('mix-styles').textContent.includes('$state(false)'));
      const heart = new JSDOM(await readFile(join(output, 'icons/heart/index.html'), 'utf8')).window
        .document;
      const original = xml(await readFile(join(root, 'icons/heart.svg'), 'utf8'));
      assert.equal(
        heart.querySelector('[data-icon-preview] path').getAttribute('d'),
        original.querySelector('path').getAttribute('d'),
      );
      assert.equal(JSON.parse(heart.getElementById('icon-data').textContent).name, 'heart');
      const home = new JSDOM(await readFile(join(output, 'index.html'), 'utf8')).window.document;
      assert.ok(home.querySelector('.nav-links a[href="/docs/"]'));
    },
  );

  await t.test(
    'detail previews, keyboard tabs, SVG exports, category search and install commands work',
    async () => {
      const script = (await readFile(join(output, 'pages.js'), 'utf8')).replace(
        /^import [^\n]+\n/,
        '',
      );
      const common = (await readFile(join(output, 'common.js'), 'utf8')).replace(/^export /gm, '');
      const copied = [];
      const downloads = [];
      const blobs = new Map();
      const open = async (path) => {
        const page = new JSDOM(await readFile(join(output, path, 'index.html'), 'utf8'), {
          runScripts: 'outside-only',
          url: 'https://filledlucide.dev' + path,
        });
        t.after(() => page.window.close());
        const { window } = page;
        Object.defineProperty(window.navigator, 'clipboard', {
          value: { writeText: async (source) => copied.push(source) },
        });
        window.Blob = Blob;
        window.URL.createObjectURL = (blob) => {
          const url = `blob:icon-${blobs.size}`;
          blobs.set(url, blob);
          return url;
        };
        window.URL.revokeObjectURL = () => {};
        window.HTMLAnchorElement.prototype.click = function () {
          downloads.push({ name: this.download, blob: blobs.get(this.href) });
        };
        window.eval(common);
        window.eval(script);
        return window;
      };
      const window = await open('/icons/heart/');
      const doc = window.document;
      assert.equal(doc.getElementById('panel-react').hidden, false);
      assert.equal(doc.getElementById('panel-vue').hidden, true);
      doc
        .getElementById('tab-react')
        .dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      assert.equal(doc.getElementById('tab-vue').getAttribute('aria-selected'), 'true');
      assert.equal(doc.activeElement.id, 'tab-vue');
      doc.getElementById('tab-svg').click();
      const size = doc.querySelector('[data-icon-size]');
      size.value = '96';
      size.dispatchEvent(new window.Event('input'));
      const color = doc.querySelector('[data-icon-color]');
      color.value = '#c43232';
      color.dispatchEvent(new window.Event('input'));
      for (const svg of doc.querySelectorAll('[data-icon-preview] svg')) {
        assert.equal(svg.getAttribute('width'), '96');
        assert.equal(svg.style.color, 'rgb(196, 50, 50)');
      }
      doc.querySelector('[data-copy-icon]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const exported = xml(copied.at(-1));
      assert.equal(exported.documentElement.getAttribute('width'), '96');
      assert.equal(exported.documentElement.getAttribute('fill'), '#c43232');
      assert.equal(exported.documentElement.getAttribute('fill-rule'), 'evenodd');
      doc
        .querySelector('[data-download-icon]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.equal(downloads.at(-1).name, 'heart.svg');
      assert.equal(await downloads.at(-1).blob.text(), copied.at(-1));
      doc.querySelector('#panel-svg [data-copy-code]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(copied.at(-1), doc.querySelector('#panel-svg code').textContent);
      const category = await open('/categories/shapes/');
      const search = category.document.querySelector('[data-category-search]');
      search.value = 'heart';
      search.dispatchEvent(new category.Event('input'));
      const visible = [...category.document.querySelectorAll('.detail-icon-card')].filter(
        (card) => !card.hidden,
      );
      assert.ok(visible.length > 0);
      assert.ok(visible.every((card) => card.dataset.name.includes('heart')));
      search.value = 'no-icon-matches-this-query';
      search.dispatchEvent(new category.Event('input'));
      assert.equal(category.document.querySelector('.category-empty').hidden, false);
      const react = await open('/react/');
      const installer = react.document.querySelector('.install-block');
      installer.querySelector('[data-install-manager="pnpm"]').click();
      assert.equal(installer.querySelector('code').textContent, 'pnpm add @filled-lucide/react');
      installer.querySelector('[data-install-manager="bun"]').click();
      assert.equal(installer.querySelector('code').textContent, 'bun add @filled-lucide/react');
      assert.equal(
        installer.querySelector('[data-install-manager="bun"]').getAttribute('aria-pressed'),
        'true',
      );
    },
  );

  await t.test(
    'outline assets preserve original geometry and allow live stroke customization',
    async () => {
      for (const set of ['icons', 'lab']) {
        const names = (await readdir(join(root, 'outline', set))).filter((file) =>
          file.endsWith('.svg'),
        );
        const spriteName = set === 'icons' ? 'sprite-outline.svg' : 'sprite-outline-lab.svg';
        const sprite = xml(await readFile(join(output, spriteName), 'utf8'));
        assert.equal(sprite.querySelectorAll('symbol').length, names.length);
        await Promise.all(
          names.map(async (file) => {
            const original = await readFile(join(root, 'outline', set, file), 'utf8');
            assert.equal(
              await readFile(join(output, 'outline', set, file), 'utf8'),
              original,
              file,
            );
            const symbol = sprite.getElementById(file.replace(/\.svg$/, ''));
            assert.ok(symbol, file);
            assert.equal(symbol.getAttribute('fill'), 'none');
            assert.equal(symbol.getAttribute('stroke'), 'currentColor');
            assert.equal(symbol.hasAttribute('stroke-width'), false);
          }),
        );
        // Outline icons often contain several primitives. They must all survive.
        const sample = set === 'icons' ? 'settings.svg' : names[0];
        const original = xml(await readFile(join(root, 'outline', set, sample), 'utf8'));
        const symbol = sprite.getElementById(sample.replace(/\.svg$/, ''));
        assert.deepEqual(
          [...symbol.children].map((shape) => shape.outerHTML),
          [...original.documentElement.children].map((shape) => shape.outerHTML),
        );
      }
    },
  );

  await t.test('browser search, split menus, exports, and theme work together', async () => {
    const page = new JSDOM(await readFile(join(output, 'index.html'), 'utf8'), {
      runScripts: 'outside-only',
      url: 'https://icons.example/',
    });
    t.after(() => page.window.close());
    const { window } = page;
    const { document } = window;
    window.matchMedia = () => ({ matches: false, addEventListener() {} });
    const scrollRequests = [];
    window.scrollTo = (options) => scrollRequests.push(options);
    const copied = [];
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: async (text) => copied.push(text) },
    });
    const blobs = new Map();
    const downloads = [];
    window.Blob = Blob;
    window.URL.createObjectURL = (blob) => {
      const url = `blob:export-${blobs.size}`;
      blobs.set(url, blob);
      return url;
    };
    window.URL.revokeObjectURL = () => {};
    window.HTMLAnchorElement.prototype.click = function () {
      downloads.push({ name: this.download, blob: blobs.get(this.href) });
    };
    let observeHero;
    window.IntersectionObserver = class {
      constructor(callback) {
        observeHero = callback;
      }
      observe() {}
    };
    window.fetch = async (url) => {
      const source = await readFile(join(output, url), 'utf8');
      return { ok: true, json: async () => JSON.parse(source), text: async () => source };
    };
    window.eval((await readFile(join(output, 'common.js'), 'utf8')).replace(/^export /gm, ''));
    window.eval((await readFile(join(output, 'icons.js'), 'utf8')).replace(/^import [^\n]+\n/, ''));
    window.eval(await readFile(join(output, 'theme.js'), 'utf8'));
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    const settle = async (predicate) => {
      for (let attempt = 0; attempt < 50 && !predicate(); attempt++)
        await new Promise((resolve) => setTimeout(resolve, 10));
      assert.ok(predicate());
    };
    await settle(() => document.querySelectorAll('.icon-cell').length === 1776);
    assert.equal(document.querySelector('.icon-cell').title, 'heart');
    const search = document.getElementById('search');
    search.value = 'heart';
    search.dispatchEvent(new window.Event('input'));
    assert.ok(document.querySelectorAll('.icon-cell').length < 1776);
    document.querySelector('[data-style="outline"]').click();
    assert.match(document.querySelector('.icon-cell use').getAttribute('href'), /sprite-outline/);
    const size = document.getElementById('icon-size');
    size.value = '32';
    size.dispatchEvent(new window.Event('input'));
    assert.equal(document.documentElement.style.getPropertyValue('--icon-size'), '32px');
    document.getElementById('hero').getBoundingClientRect = () => ({ height: 460, bottom: 460 });
    document.querySelector('.toolbar-inner').getBoundingClientRect = () => ({ height: 48 });
    document.getElementById('icon-drawer').getBoundingClientRect = () => ({ height: 260 });
    const selectedCell = document.querySelector('.icon-cell');
    selectedCell.getBoundingClientRect = () => ({ height: 112, top: 720, bottom: 832 });
    selectedCell.click();
    assert.equal(scrollRequests.length, 1);
    assert.ok(scrollRequests[0].top > 460, 'opening the icon must scroll the hero away');
    assert.ok(720 - scrollRequests[0].top >= 72, 'selected icon must clear the pinned toolbar');
    assert.ok(
      832 - scrollRequests[0].top <= window.innerHeight - 260,
      'selected icon must clear the detail drawer',
    );
    assert.equal(selectedCell.getAttribute('aria-pressed'), 'true');
    assert.equal(document.getElementById('selected-name').textContent, 'Outline heart icon');
    assert.equal(document.getElementById('icon-drawer').hidden, false);
    assert.equal(document.getElementById('customizer'), null);
    document.getElementById('selected-preview').style.color = '#4f4f4f';
    const copy = async (format) => {
      const previousCount = copied.length;
      const button = document.querySelector(`[data-export="${format}"]`);
      button.click();
      await settle(() => copied.length === previousCount + 1 && !button.disabled);
      return copied.at(-1);
    };
    const svg = xml(await copy('svg'));
    assert.equal(svg.documentElement.getAttribute('width'), '32');
    assert.equal(svg.documentElement.getAttribute('fill'), 'none');
    assert.equal(svg.documentElement.getAttribute('stroke'), 'currentColor');
    const original = xml(await readFile(join(root, 'outline/icons/heart.svg'), 'utf8'));
    assert.equal(
      svg.querySelector('path').getAttribute('d'),
      original.querySelector('path').getAttribute('d'),
    );
    assert.match(await copy('jsx'), /strokeLinecap="round"/);
    const dataUrl = await copy('data-url');
    assert.match(dataUrl, /^data:image\/svg\+xml,/);
    const portable = xml(decodeURIComponent(dataUrl.split(',')[1]));
    assert.equal(portable.documentElement.getAttribute('stroke'), 'rgb(79, 79, 79)');
    assert.equal(await copy('component-name'), 'Heart');
    const vue = await copy('vue');
    assert.match(vue, /^<template>/);
    assert.equal(
      xml(vue.replace(/^<template>\n|\n<\/template>$/g, ''))
        .querySelector('path')
        .getAttribute('d'),
      original.querySelector('path').getAttribute('d'),
    );
    assert.equal(xml(await copy('svelte')).documentElement.getAttribute('width'), '32');
    const angular = await copy('angular');
    assert.match(angular, /selector: 'app-heart-icon'/);
    assert.match(angular, /export class HeartIcon/);
    assert.match(angular, /width="32"/);

    const svgToggle = document.getElementById('svg-menu-toggle');
    svgToggle.click();
    assert.equal(document.getElementById('svg-export-menu').hidden, false);
    assert.equal(document.activeElement.textContent.trim(), 'Copy SVG');
    document.activeElement.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    assert.equal(document.activeElement.textContent.trim(), 'Copy Data URL');
    document.activeElement.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    assert.equal(document.getElementById('svg-export-menu').hidden, true);
    assert.equal(document.activeElement, svgToggle);
    assert.equal(document.getElementById('icon-drawer').hidden, false);
    svgToggle.click();
    document.getElementById('component-menu-toggle').click();
    assert.equal(document.getElementById('svg-export-menu').hidden, true);
    assert.equal(document.getElementById('component-export-menu').hidden, false);
    const previousCount = copied.length;
    document.querySelector('[data-export="component-name"]').click();
    await settle(() => copied.length === previousCount + 1);
    assert.equal(document.getElementById('component-export-menu').hidden, true);

    document.querySelector('[data-export="download-svg"]').click();
    await settle(() => downloads.length === 1);
    assert.equal(downloads[0].name, 'heart-outline.svg');
    assert.equal(downloads[0].blob.type, 'image/svg+xml');
    assert.equal(
      xml(await downloads[0].blob.text()).documentElement.getAttribute('stroke'),
      'rgb(79, 79, 79)',
    );

    // A click on another icon while source loading must not change the pending export.
    const previousCopies = copied.length;
    document.getElementById('copy-svg').click();
    search.value = '';
    search.dispatchEvent(new window.Event('input'));
    document.querySelector('[data-key="icons/house"]').click();
    await settle(() => copied.length === previousCopies + 1);
    assert.equal(
      xml(copied.at(-1)).querySelector('path').getAttribute('d'),
      original.querySelector('path').getAttribute('d'),
    );
    assert.equal(document.getElementById('selected-name').textContent, 'Outline house icon');
    document.querySelector('.theme-toggle').click();
    assert.equal(document.documentElement.dataset.theme, 'dark');
    observeHero([{ isIntersecting: false, boundingClientRect: { bottom: -1 } }]);
    assert.ok(document.getElementById('toolbar').classList.contains('is-pinned'));
    const logo = xml(await readFile(join(output, 'filed-lucide-logo.svg'), 'utf8'));
    assert.equal(logo.documentElement.getAttribute('viewBox'), '0 0 200 200');
    assert.deepEqual(
      [...logo.querySelectorAll('path')].map((path) => path.getAttribute('fill')),
      ['#f56565', '#2d3748'],
    );
  });
});
