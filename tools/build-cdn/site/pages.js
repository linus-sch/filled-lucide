import { copyText, toast } from './common.js';

async function copy(source, button) {
  button.disabled = true;
  try {
    await copyText(source);
    toast('Copied to clipboard');
  } catch {
    toast('Could not copy. Select the code and copy it manually.');
  } finally {
    button.disabled = false;
  }
}

document.querySelectorAll('[data-copy-code]').forEach((button) => {
  button.addEventListener('click', () =>
    copy(button.closest('.code-block').querySelector('code').textContent, button),
  );
});

document.querySelectorAll('[data-tabs]').forEach((group) => {
  const tabs = [...group.querySelectorAll('[data-tab]')];
  const select = (selected, focus = false) => {
    tabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      group.querySelector(`[data-panel="${tab.dataset.tab}"]`).hidden = !active;
    });
    if (focus) selected.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      let target;
      if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') target = tabs[(index + tabs.length - 1) % tabs.length];
      if (event.key === 'Home') target = tabs[0];
      if (event.key === 'End') target = tabs.at(-1);
      if (target) {
        event.preventDefault();
        select(target, true);
      }
    });
  });
  select(tabs[0]);
});

document.querySelectorAll('.install-block').forEach((block) => {
  block.querySelectorAll('[data-install-manager]').forEach((button) => {
    button.addEventListener('click', () => {
      const manager = button.dataset.installManager;
      block.querySelector('.install-command code').textContent =
        `${manager} ${manager === 'npm' ? 'install' : 'add'} ${block.dataset.package}`;
      block
        .querySelectorAll('[data-install-manager]')
        .forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    });
  });
});

const detail = document.querySelector('[data-icon-detail]');
if (detail) {
  const data = JSON.parse(document.getElementById('icon-data').textContent);
  const size = detail.querySelector('[data-icon-size]');
  const color = detail.querySelector('[data-icon-color]');
  let customColor;
  const syncColor = () => {
    if (!customColor)
      color.value =
        getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#4f4f4f';
  };
  syncColor();
  new MutationObserver(syncColor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  const source = () => {
    const svg = new DOMParser().parseFromString(data.svg, 'image/svg+xml').documentElement;
    svg.setAttribute('width', size.value);
    svg.setAttribute('height', size.value);
    if (customColor) svg.setAttribute('fill', customColor);
    return svg.outerHTML;
  };
  const update = () => {
    detail.querySelectorAll('[data-icon-preview] svg').forEach((svg) => {
      svg.setAttribute('width', size.value);
      svg.setAttribute('height', size.value);
      if (customColor) svg.style.color = customColor;
    });
    document.getElementById('preview-size-value').textContent = `${size.value} px`;
    detail.querySelector('[data-panel="svg"] code').textContent = source();
  };
  size.addEventListener('input', update);
  color.addEventListener('input', () => {
    customColor = color.value;
    update();
  });
  detail
    .querySelector('[data-copy-icon]')
    .addEventListener('click', (event) => copy(source(), event.currentTarget));
  detail.querySelector('[data-download-icon]').addEventListener('click', (event) => {
    event.preventDefault();
    const url = URL.createObjectURL(new Blob([source()], { type: 'image/svg+xml' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${data.name}.svg`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('SVG downloaded');
  });
  update();
}

const search = document.querySelector('[data-category-search]');
if (search) {
  const cards = [...document.querySelectorAll('[data-category-grid] [data-name]')];
  search.addEventListener('input', () => {
    const terms = search.value
      .toLowerCase()
      .trim()
      .split(/[\s-]+/)
      .filter(Boolean);
    let count = 0;
    cards.forEach((card) => {
      card.hidden = !terms.every((term) => card.dataset.name.replace(/-/g, ' ').includes(term));
      if (!card.hidden) count++;
    });
    document.querySelector('[data-category-count]').textContent = count;
    document.querySelector('.category-empty').hidden = count > 0;
  });
}
