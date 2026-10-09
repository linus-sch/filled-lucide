import { copyText, iconSvg, toast } from './common.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem('lucide-filled-browser-v2') || '{}') || {};
} catch {
  // The library also works without local storage.
}
const state = {
  style: params.has('style')
    ? params.get('style') === 'outline'
      ? 'outline'
      : 'filled'
    : saved.style === 'outline'
      ? 'outline'
      : 'filled',
  size: Number.isFinite(saved.size) ? Math.max(16, Math.min(64, saved.size)) : 48,
  category: params.get('category') || '',
  includeLab: params.get('lab') === 'true',
  items: [],
  categories: {},
  selected: null,
  ready: false,
};
const grid = $('icon-grid');
const drawer = $('icon-drawer');
const sourceCache = new Map();
let selectionTrigger;
let urlTimer;
let openMenu;
let drawerAnimation;
const menuAnimations = new WeakMap();
const recommended = [
  'heart',
  'house',
  'search',
  'star',
  'settings',
  'user',
  'check',
  'x',
  'plus',
  'arrow-right',
  'chevron-down',
  'menu',
  'mail',
  'bell',
  'calendar',
  'camera',
  'bookmark',
  'map-pin',
  'cloud',
  'sun',
  'moon',
  'zap',
  'sparkles',
  'leaf',
  'flower-2',
  'face-slightly-smiling',
  'message-circle',
  'music',
  'play',
  'image',
  'download',
  'upload',
  'lock',
  'shield-check',
  'eye',
  'clock',
  'coffee',
  'shopping-bag',
  'gift',
  'flame',
  'globe',
  'link',
  'copy',
  'pencil',
  'trash-2',
  'folder',
  'file-text',
  'sliders-horizontal',
  'circle-help',
  'circle-alert',
  'circle-check',
  'arrow-up-right',
  'external-link',
  'refresh-cw',
  'headphones',
  'mic',
  'volume-2',
  'video',
  'wifi',
  'battery',
  'laptop',
  'smartphone',
  'palette',
  'gem',
  'rocket',
  'feather',
  'flag',
  'compass',
  'map',
  'navigation',
  'code',
  'terminal',
  'layers',
  'layout-grid',
  'database',
  'server',
  'chart-no-axes-combined',
];
const ranks = new Map(recommended.map((name, index) => [name, index]));
const itemKey = (icon) => `${icon.set}/${icon.n}`;
const activeItems = () => state.items.filter((icon) => state.includeLab || icon.set === 'icons');
const componentName = (name) =>
  name.replace(/(^|-)([a-z0-9])/g, (_, separator, letter) => letter.toUpperCase());

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.json();
}

async function loadLibrary() {
  $('error-state').hidden = true;
  grid.setAttribute('aria-busy', 'true');
  $('results-count').textContent = 'Loading icons…';
  try {
    const [icons, lab, categories] = await Promise.all([
      getJson('/icons-index.json'),
      getJson('/lab-index.json'),
      getJson('/categories.json'),
    ]);
    state.items = [
      ...icons.map((icon) => ({ ...icon, set: 'icons' })),
      ...lab.map((icon) => ({ ...icon, set: 'lab' })),
    ].map((icon) => ({
      ...icon,
      search: [icon.n, ...icon.t, ...icon.a].join(' ').toLowerCase().replace(/-/g, ' '),
    }));
    state.categories = categories;
    state.ready = true;
    if (!activeItems().some((icon) => icon.c.includes(state.category))) state.category = '';
    const initialIcon = params.get('icon');
    const initialSet = params.get('set') === 'lab' ? 'lab' : 'icons';
    const selection = state.items.find((icon) => icon.n === initialIcon && icon.set === initialSet);
    if (selection?.set === 'lab') state.includeLab = true;
    renderGrid();
    if (selection) openIcon(selection);
  } catch {
    $('error-state').hidden = false;
    $('results-count').textContent = 'Library unavailable';
    $('total-count').textContent = 'Icon library';
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

function renderGrid() {
  if (!state.ready) return;
  const terms = $('search')
    .value.trim()
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);
  const items = activeItems();
  const hits = items.filter(
    (icon) =>
      (!state.category || icon.c.includes(state.category)) &&
      terms.every((term) => icon.search.includes(term)),
  );
  hits.sort((a, b) => {
    const difference = (ranks.get(a.n) ?? Infinity) - (ranks.get(b.n) ?? Infinity);
    return difference || a.n.localeCompare(b.n);
  });
  const fragment = document.createDocumentFragment();
  for (const icon of hits) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'icon-cell';
    cell.dataset.key = itemKey(icon);
    cell.setAttribute('aria-label', `${icon.n}${icon.set === 'lab' ? ' (Lab)' : ''}`);
    cell.setAttribute(
      'aria-pressed',
      String(Boolean(state.selected && itemKey(state.selected) === itemKey(icon))),
    );
    cell.title = icon.n;
    cell.append(iconSvg(icon.n, { style: state.style, set: icon.set, className: 'grid-icon' }));
    const name = document.createElement('span');
    name.textContent = icon.n;
    cell.append(name);
    fragment.append(cell);
  }
  grid.replaceChildren(fragment);
  $('empty-state').hidden = hits.length > 0;
  $('results-count').textContent =
    terms.length || state.category
      ? `${hits.length.toLocaleString()} of ${items.length.toLocaleString()} icons`
      : `All ${hits.length.toLocaleString()} icons`;
  $('total-count').textContent = `${items.length.toLocaleString()} icons`;
  $('search').placeholder = `Search ${items.length.toLocaleString('de-CH')} icons…`;
  const categoryChip = $('active-category');
  categoryChip.hidden = !state.category;
  categoryChip.querySelector('span').textContent =
    state.categories[state.category] || state.category.replace(/-/g, ' ');
  updateUrl();
}

function updateUrl() {
  window.clearTimeout(urlTimer);
  urlTimer = window.setTimeout(() => {
    const url = new URL(location.href);
    const values = {
      q: $('search').value.trim(),
      category: state.category,
      style: state.style === 'outline' ? 'outline' : '',
      lab: state.includeLab ? 'true' : '',
      icon: state.selected?.n || '',
      set: state.selected?.set === 'lab' ? 'lab' : '',
    };
    for (const [name, value] of Object.entries(values)) {
      if (value) url.searchParams.set(name, value);
      else url.searchParams.delete(name);
    }
    history.replaceState(null, '', url);
  }, 160);
}

function syncCustomization() {
  document.documentElement.style.setProperty('--icon-size', `${state.size}px`);
  $('icon-size').value = state.size;
  $('size-value').textContent = `${state.size} px`;
  $('icon-size').style.setProperty('--range-fill', `${((state.size - 16) / 48) * 100}%`);
  document
    .querySelectorAll('[data-style]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.style === state.style)),
    );
  try {
    localStorage.setItem(
      'lucide-filled-browser-v2',
      JSON.stringify({ style: state.style, size: state.size }),
    );
  } catch {
    // Keep the controls available when storage is disabled.
  }
  if (state.selected) updateDrawer();
  updateUrl();
}

function sourceUrl(icon, style) {
  return `${style === 'outline' ? '/outline' : ''}/${icon.set}/${icon.n}.svg`;
}

async function getSource(icon, style) {
  const url = sourceUrl(icon, style);
  if (!sourceCache.has(url)) {
    const request = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('Icon source unavailable');
        return response.text();
      })
      .catch((error) => {
        sourceCache.delete(url);
        throw error;
      });
    sourceCache.set(url, request);
  }
  return sourceCache.get(url);
}

function exportSelection() {
  return {
    icon: state.selected,
    style: state.style,
    size: state.size,
    color: getComputedStyle($('selected-preview')).color || '#4f4f4f',
  };
}

async function makeCode(format, selection) {
  const { icon, style, size, color } = selection;
  if (format === 'component-name') return componentName(icon.n);
  const source = await getSource(icon, style);
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('Invalid icon source');
  const svg = parsed.documentElement;
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  const portable = ['data-url', 'download-svg', 'download-png'].includes(format);
  svg.setAttribute(style === 'outline' ? 'stroke' : 'fill', portable ? color : 'currentColor');
  if (style === 'outline') svg.setAttribute('stroke-width', '2');
  const serializer = new XMLSerializer();
  const attributes = [...svg.attributes]
    .map((attribute) => `  ${attribute.name}="${attribute.value}"`)
    .join('\n');
  const body = [...svg.children]
    .map((child) => `  ${serializer.serializeToString(child).replace(/ xmlns="[^"]*"/g, '')}`)
    .join('\n');
  const markup = `<svg\n${attributes}\n>\n${body}\n</svg>`;
  if (format === 'data-url') return `data:image/svg+xml,${encodeURIComponent(markup)}`;
  if (format === 'jsx')
    return markup.replace(
      /\b([a-z]+(?:-[a-z]+)+)=/g,
      (_, name) => `${name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())}=`,
    );
  if (format === 'vue')
    return `<template>\n${markup
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n')}\n</template>`;
  if (format === 'angular')
    return `import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-${icon.n}-icon',\n  standalone: true,\n  template: \`\n${markup
      .split('\n')
      .map((line) => `    ${line}`)
      .join('\n')}\n  \`,\n})\nexport class ${componentName(icon.n)}Icon {}`;
  // SVG markup is also a complete Svelte component.
  return markup;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function pngBlob(markup, size) {
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const image = document.createElement('img');
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Could not render this icon'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG export unavailable');
    context.drawImage(image, 0, 0, size, size);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('PNG export unavailable'))),
        'image/png',
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

const exportLabels = {
  svg: 'SVG',
  'data-url': 'Data URL',
  jsx: 'JSX',
  'component-name': 'Component name',
  vue: 'Vue',
  svelte: 'Svelte',
  angular: 'Angular',
};
async function performExport(format, button) {
  if (!state.selected) return;
  const selection = exportSelection();
  button.disabled = true;
  try {
    const code = await makeCode(format, selection);
    const filename = `${selection.icon.n}-${selection.style}`;
    if (format === 'download-svg') {
      downloadBlob(new Blob([code], { type: 'image/svg+xml' }), `${filename}.svg`);
      toast('SVG downloaded');
    } else if (format === 'download-png') {
      downloadBlob(await pngBlob(code, selection.size), `${filename}.png`);
      toast('PNG downloaded');
    } else {
      await copyText(code);
      toast(`${exportLabels[format]} copied to clipboard`);
    }
  } catch {
    toast(
      `Could not ${format.startsWith('download-') ? 'download' : 'copy'} this icon. Try again.`,
    );
  } finally {
    button.disabled = false;
  }
}

function animateExportMenu(menu, open) {
  const closed = { transform: 'translateY(6px) scale(0.97)', opacity: 0 };
  const from = menu.hidden
    ? closed
    : { transform: getComputedStyle(menu).transform, opacity: getComputedStyle(menu).opacity };
  menuAnimations.get(menu)?.cancel();
  menuAnimations.delete(menu);
  menu.inert = !open;
  menu.setAttribute('aria-hidden', String(!open));
  if (open) menu.hidden = false;
  if (!menu.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    menu.hidden = !open;
    return;
  }
  const animation = menu.animate(
    [from, open ? { transform: 'translateY(0) scale(1)', opacity: 1 } : closed],
    {
      duration: open ? 160 : 110,
      easing: open ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.4, 0, 1, 1)',
      fill: 'forwards',
    },
  );
  menuAnimations.set(menu, animation);
  animation.finished
    .then(() => {
      if (menuAnimations.get(menu) !== animation) return;
      menu.hidden = !open;
      animation.cancel();
      menuAnimations.delete(menu);
    })
    .catch(() => {
      // Reversing a menu keeps its current position and opacity.
    });
}

function closeExportMenu(restoreFocus = false) {
  if (!openMenu) return;
  const menu = openMenu;
  openMenu = null;
  animateExportMenu(menu, false);
  const toggle = $(menu.getAttribute('aria-labelledby'));
  toggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus) toggle.focus({ preventScroll: true });
}

function toggleExportMenu(toggle, focusLast = false) {
  const menu = $(toggle.getAttribute('aria-controls'));
  const wasOpen = openMenu === menu;
  closeExportMenu();
  if (wasOpen) return;
  openMenu = menu;
  animateExportMenu(menu, true);
  toggle.setAttribute('aria-expanded', 'true');
  const items = [...menu.querySelectorAll('[role="menuitem"]')];
  (focusLast ? items.at(-1) : items[0]).focus({ preventScroll: true });
}

function slideDrawer(open) {
  const from = drawer.hidden
    ? { transform: 'translateY(100%)', opacity: 0.94 }
    : { transform: getComputedStyle(drawer).transform, opacity: getComputedStyle(drawer).opacity };
  drawerAnimation?.cancel();
  drawerAnimation = null;
  drawer.inert = !open;
  if (open) drawer.hidden = false;
  if (!drawer.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawer.hidden = !open;
    document.body.classList.toggle('drawer-open', open);
    return;
  }
  const animation = drawer.animate(
    [from, { transform: open ? 'translateY(0)' : 'translateY(100%)', opacity: open ? 1 : 0.94 }],
    {
      duration: open ? 440 : 180,
      easing: open ? 'cubic-bezier(0.22, 1, 0.36, 1)' : 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    },
  );
  drawerAnimation = animation;
  animation.finished
    .then(() => {
      if (drawerAnimation !== animation) return;
      drawer.hidden = !open;
      document.body.classList.toggle('drawer-open', open);
      animation.cancel();
      drawerAnimation = null;
    })
    .catch(() => {
      // A quick reopen continues from the current position instead of jumping.
    });
}

function revealIcon(icon) {
  const heroRect = $('hero').getBoundingClientRect();
  const cell = grid.querySelector(`[data-key="${itemKey(icon)}"]`);
  const cellRect = cell?.getBoundingClientRect();
  if (!heroRect.height && !cellRect?.height) return;
  const pinnedPadding =
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--toolbar-pinned-padding'),
    ) || 12;
  const toolbarHeight =
    $('toolbar').querySelector('.toolbar-inner').getBoundingClientRect().height + pinnedPadding * 2;
  const visibleBottom = window.innerHeight - drawer.getBoundingClientRect().height - 12;
  if (
    heroRect.bottom <= 0 &&
    cellRect &&
    cellRect.top >= toolbarHeight + 12 &&
    cellRect.bottom <= visibleBottom
  )
    return;
  const heroEnd = window.scrollY + heroRect.bottom;
  const targetTop = cellRect ? window.scrollY + cellRect.top - toolbarHeight - 12 : heroEnd;
  window.scrollTo({
    top: Math.max(Math.ceil(heroEnd) + 1, targetTop),
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

function openIcon(icon, trigger) {
  const wasOpen = Boolean(state.selected);
  closeExportMenu();
  state.selected = icon;
  selectionTrigger = trigger;
  document.body.classList.add('drawer-open');
  grid
    .querySelectorAll('.icon-cell')
    .forEach((cell) =>
      cell.setAttribute('aria-pressed', String(cell.dataset.key === itemKey(icon))),
    );
  updateDrawer();
  if (!wasOpen) slideDrawer(true);
  revealIcon(icon);
  updateUrl();
  if (!wasOpen && trigger) $('close-drawer').focus({ preventScroll: true });
}

function updateDrawer() {
  const icon = state.selected;
  if (!icon) return;
  $('selected-name').textContent =
    `${state.style === 'filled' ? 'Filled' : 'Outline'} ${icon.n} icon`;
  $('selected-page').hidden = icon.set === 'lab';
  $('selected-page').href = `/icons/${icon.n}/`;
  $('selected-preview').replaceChildren(iconSvg(icon.n, { style: state.style, set: icon.set }));
}

function closeDrawer() {
  closeExportMenu();
  state.selected = null;
  slideDrawer(false);
  grid
    .querySelectorAll('[aria-pressed="true"]')
    .forEach((cell) => cell.setAttribute('aria-pressed', 'false'));
  const currentTrigger =
    selectionTrigger && grid.querySelector(`[data-key="${selectionTrigger.dataset.key}"]`);
  if (currentTrigger) currentTrigger.focus({ preventScroll: true });
  else $('search').focus({ preventScroll: true });
  updateUrl();
}

$('search').value = params.get('q') || '';
$('search').addEventListener('input', renderGrid);
grid.addEventListener('click', (event) => {
  const cell = event.target.closest('.icon-cell');
  if (!cell) return;
  const icon = state.items.find((item) => itemKey(item) === cell.dataset.key);
  if (icon) openIcon(icon, cell);
});
$('active-category').addEventListener('click', () => {
  state.category = '';
  renderGrid();
});
$('clear-filters').addEventListener('click', () => {
  $('search').value = '';
  state.category = '';
  renderGrid();
  $('search').focus();
});
$('retry-load').addEventListener('click', loadLibrary);
document.querySelectorAll('[data-style]').forEach((button) =>
  button.addEventListener('click', () => {
    closeExportMenu();
    state.style = button.dataset.style;
    syncCustomization();
    renderGrid();
  }),
);
$('icon-size').addEventListener('input', () => {
  state.size = Number($('icon-size').value);
  syncCustomization();
});
$('close-drawer').addEventListener('click', closeDrawer);
drawer.addEventListener('click', (event) => {
  const toggle = event.target.closest('.export-menu-toggle');
  if (toggle) {
    toggleExportMenu(toggle);
    return;
  }
  const button = event.target.closest('[data-export]');
  if (button) {
    closeExportMenu(button.getAttribute('role') === 'menuitem');
    performExport(button.dataset.export, button);
  }
});
document.addEventListener('pointerdown', (event) => {
  if (openMenu && !openMenu.parentElement.contains(event.target)) closeExportMenu();
});
document.addEventListener('focusin', (event) => {
  if (openMenu && !openMenu.parentElement.contains(event.target)) closeExportMenu();
});
document.addEventListener('keydown', (event) => {
  const toggle = event.target.closest('.export-menu-toggle');
  if (toggle && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    if (openMenu) closeExportMenu();
    toggleExportMenu(toggle, event.key === 'ArrowUp');
    return;
  }
  if (openMenu && openMenu.contains(event.target)) {
    const items = [...openMenu.querySelectorAll('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % items.length;
    if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      items[next].focus();
      return;
    }
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    if (openMenu) closeExportMenu(true);
    else if (state.selected) closeDrawer();
    else if ($('search').value) {
      $('search').value = '';
      renderGrid();
    }
    return;
  }
  const editing = event.target.matches('input, textarea, select, [contenteditable="true"]');
  if (
    (event.key === '/' && !editing) ||
    ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')
  ) {
    event.preventDefault();
    closeExportMenu();
    $('search').focus();
  }
});

syncCustomization();
loadLibrary();
new IntersectionObserver(([entry]) => {
  $('toolbar').classList.toggle(
    'is-pinned',
    !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
  );
}).observe($('hero'));
