// Applies the theme ('system', 'light' or 'dark') to the page.
// The CSS reads the data-theme attribute on the <html> element.
const COLORS = { dark: '#131f24', light: '#ffffff' };

function systemIsDark() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // The colour of the phone's browser bar.
  const resolved = theme === 'system' ? (systemIsDark() ? 'dark' : 'light') : theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COLORS[resolved]);
}
