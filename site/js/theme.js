// Light "vellum" / dark "blueprint" theme. Follows the OS until the visitor chooses, then remembers the choice.
import { storageGet, storageSet } from './dom.js';

const STORAGE_KEY = 'portfolio-theme';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'light' || forced === 'dark') return forced;
  return prefersDark.matches ? 'dark' : 'light';
}

function applyTheme(theme, button) {
  document.documentElement.dataset.theme = theme;
  button.setAttribute('aria-pressed', String(theme === 'dark'));
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

export function initTheme(button) {
  const saved = storageGet(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  button.setAttribute('aria-pressed', String(currentTheme() === 'dark'));

  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    storageSet(STORAGE_KEY, next);
    applyTheme(next, button);
  });

  prefersDark.addEventListener('change', () => {
    if (storageGet(STORAGE_KEY)) return;
    delete document.documentElement.dataset.theme;
    applyTheme(currentTheme(), button);
  });
}
