// The "New version ready" banner with a Reload button, shown at the top of the screen.
//   const banner = createUpdateBanner({ onReload });  document.body.append(banner.el);
import { h } from './dom.js';

export function createUpdateBanner({ onReload }) {
  let busy = false;
  const button = h('button', {
    type: 'button', class: 'btn btn--blue update-banner__btn',
    onclick: () => {
      if (busy) return;
      busy = true;
      button.setAttribute('disabled', 'disabled');
      button.textContent = 'Updating…';
      onReload();
    },
  }, 'Reload');
  const el = h('div', { class: 'update-banner', role: 'status', 'aria-live': 'polite' },
    h('span', { class: 'update-banner__text' }, 'New version ready'),
    button);
  return { el, button };
}
