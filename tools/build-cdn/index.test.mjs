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
    assert.match(await readFile(join(output, 'index.html'), 'utf8'), /<title>Lucide Filled/);
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
    assert.equal(names[0], 'filled-lucide');
    const logos = [
      ...page.querySelectorAll('.package-logo img'),
      ...home.querySelectorAll('.hero-framework-logos img'),
    ];
    await Promise.all(
      logos.map((img) => readFile(join(output, img.getAttribute('src').replace(/\?.*$/, '')))),
    );
  });

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
    assert.equal(logo.documentElement.getAttribute('viewBox'), '0 0 48 48');
    assert.equal(logo.querySelector('path').getAttribute('fill'), '#f56565');
  });
});
