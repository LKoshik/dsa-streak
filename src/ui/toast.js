// Small messages at the bottom of the screen, above the navigation bar.
// showToast({ message, actionLabel, onAction, duration, variant }) returns a function that closes it.
//   variant 'reward' = a celebration message; 'default' = a normal one (like "Marked #5 solved" + Undo).
import { h } from './dom.js';

const MAX_VISIBLE = 4;
let container = null;

export function showToast({ message, actionLabel = null, onAction = null, duration = 6000, variant = 'default' }) {
  if (!container || !container.isConnected) {
    container = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(container);
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
    h('span', { class: 'toast__text' }, message),
    actionLabel
      ? h('button', { class: 'toast__action', type: 'button', onclick: () => { dismiss(); if (onAction) onAction(); } }, actionLabel)
      : null);

  // Keep the pile small: drop the oldest message when there are too many.
  while (container.children.length >= MAX_VISIBLE) container.children[0].remove();
  container.append(el);
  timer = setTimeout(dismiss, duration);
  return dismiss;
}
