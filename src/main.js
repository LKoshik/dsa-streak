// App start: load the data, apply the theme, show the shell (screen + bottom nav),
// and keep "today" fresh (page visible again, window focus, next midnight).
import { h } from './ui/dom.js';
import { createNav } from './ui/nav.js';
import { applyTheme } from './ui/theme.js';
import { msUntilNextMidnight } from './core/dates.js';
import * as actions from './state/actions.js';
import * as selectors from './state/selectors.js';
import { features } from './features/index.js';
import { startRouter } from './router.js';
import { registerWorker } from './ui/sw-client.js';
import { createUpdateBanner } from './ui/update-banner.js';

// Every screen gets the WHOLE actions file, so a new action can never be forgotten here.
const { store, init, refreshToday } = actions;
const appRoot = document.getElementById('app');

// Re-read the clock at the next local midnight (and re-arm the timer afterwards).
let midnightTimer = null;
function scheduleMidnight() {
  clearTimeout(midnightTimer);
  midnightTimer = setTimeout(() => {
    refreshToday();
    scheduleMidnight();
  }, msUntilNextMidnight(new Date()) + 100);
}

function showStartupError(error) {
  console.error(error);
  appRoot.replaceChildren(h('div', { class: 'boot' },
    h('p', null, 'Could not open the app storage on this phone.'),
    h('p', { class: 'boot__small' }, 'Private browsing can block it. Try a normal browser tab.'),
    h('button', { class: 'btn btn--blue', type: 'button', onclick: () => location.reload() }, 'Try again')));
}

async function start() {
  applyTheme('system');
  appRoot.replaceChildren(h('div', { class: 'boot' }, 'Loading…'));
  try {
    await init();
  } catch (error) {
    showStartupError(error);
    return;
  }

  // Theme: apply now, then whenever the setting (or the phone's light/dark mode) changes.
  let appliedTheme = store.get().settings.theme;
  applyTheme(appliedTheme);
  store.subscribe((state) => {
    if (state.settings.theme !== appliedTheme) {
      appliedTheme = state.settings.theme;
      applyTheme(appliedTheme);
    }
  });
  if (typeof matchMedia === 'function') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(appliedTheme));
  }

  const view = h('main', { class: 'view', id: 'view' });
  const nav = createNav(features);
  appRoot.replaceChildren(view, nav.el);
  startRouter({ root: view, features, ctx: { store, actions, selectors }, nav });

  // Keep "today" correct.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshToday();
      scheduleMidnight();
    }
  });
  window.addEventListener('focus', refreshToday);
  scheduleMidnight();
}

// Offline use and updates: register the service worker (relative path) and show the
// "New version ready" banner when a new version is waiting.
function setupOffline() {
  let updates = null;
  let banner = null;
  updates = registerWorker({
    onUpdateReady: () => {
      if (banner) return;
      banner = createUpdateBanner({ onReload: () => updates.applyUpdate() });
      document.body.append(banner.el);
    },
  });
}

start();
if (document.readyState === 'complete') setupOffline();
else window.addEventListener('load', setupOffline);
