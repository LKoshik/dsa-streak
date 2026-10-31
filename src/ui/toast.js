// Small messages at the bottom of the screen, above the navigation bar.
// showToast({ message, actionLabel, onAction, duration, variant }) returns a function that closes it.
//   variant 'reward' = a celebration message; 'default' = a normal one (like "Marked #5 solved" + Undo).
//   icon = an optional icon element shown before the text (see ui/icons.js).
//   host = an element to show the message in (Home uses one above its Next-up card).
//          Without it, messages go in one shared box above the navigation bar.
import { h } from './dom.js';

const MAX_VISIBLE = 4;
let container = null;

export function showToast({ message, actionLabel = null, onAction = null, duration = 6000, variant = 'default', host = null, icon = null }) {
  let box = host;
  if (!box) {
    if (!container || !container.isConnected) {
      container = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
      document.body.append(container);
    }
    box = container;
  }
  let timer = null;
  let closed = false;

  function dismiss() {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 200);
  }

  const el = h('div', { class: `toast toast--${variant}` },
    icon ? h('span', { class: 'toast__icon' }, icon) : null,
    h('span', { class: 'toast__text' }, message),
    actionLabel
      ? h('button', { class: 'toast__action', type: 'button', onclick: () => { dismiss(); if (onAction) onAction(); } }, actionLabel)
      : null);

  // Keep the pile small: drop the oldest message when there are too many.
  while (box.children.length >= MAX_VISIBLE) box.children[0].remove();
  box.append(el);
  timer = setTimeout(dismiss, duration);
  return dismiss;
}
