/* Apply the saved theme before the first paint. */
(() => {
  let preference = 'system';
  try {
    preference = localStorage.getItem('lucide-filled-theme') || 'system';
  } catch {
    // Browsing still works when storage is unavailable.
  }
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const dark = preference === 'dark' || (preference === 'system' && media.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
      button.title = `Switch to ${dark ? 'light' : 'dark'} mode`;
      button
        .querySelector('use')
        .setAttribute('href', `/sprite-outline.svg#${dark ? 'moon' : 'sun'}`);
    });
  };
  apply();
  media.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        try {
          localStorage.setItem('lucide-filled-theme', preference);
        } catch {
          // Keep the choice for this page when storage is unavailable.
        }
        apply();
      });
    });
  });
})();
