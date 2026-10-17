// src/lib/theme.js
//
// Dark / light mode. The choice lives on <html data-theme>, which globals.css
// keys every colour token off, and is remembered in localStorage. _document
// applies the stored choice before first paint so a light-mode visitor never
// sees a flash of black.

export const THEME_KEY = 'ab-theme';

// Browser-bar tint per theme; matches --bg in globals.css.
const THEME_COLOR = { dark: '#000000', light: '#f3f0e9' };

/** Runs inline in <head>, before React. Keep it tiny and dependency-free. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'){document.documentElement.dataset.theme='light';var m=document.querySelector('meta[name=theme-color]');if(m)m.content='${THEME_COLOR.light}';}}catch(e){}})();`;

export function getTheme() {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(theme) {
  const root = document.documentElement;

  // Fade the swap instead of snapping. Only for the switch itself — leaving
  // the class on would slow every hover on the page.
  root.classList.add('theme-transition');
  setTimeout(() => root.classList.remove('theme-transition'), 400);

  if (theme === 'light') root.dataset.theme = 'light';
  else delete root.dataset.theme;

  document.querySelector('meta[name=theme-color]')?.setAttribute('content', THEME_COLOR[theme]);

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode or blocked storage: the switch still works for this visit.
  }
}
