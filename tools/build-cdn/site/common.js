let toastTimer;

export function toast(message) {
  const element = document.getElementById('toast');
  element.textContent = message;
  element.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (element.hidden = true), 2600);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(input);
    const focused = document.activeElement;
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    focused?.focus({ preventScroll: true });
    if (!copied) throw new Error('Copy unavailable');
  }
}

export function iconSvg(name, { style = 'filled', set = 'icons', className = '', size = 24 } = {}) {
  const sprite = style === 'outline' ? 'sprite-outline' : 'sprite';
  const suffix = set === 'lab' ? '-lab' : '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `/${sprite}${suffix}.svg#${name}`);
  svg.append(use);
  return svg;
}
