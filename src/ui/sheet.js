// A bottom sheet: slides up over the screen with a title, a scrolling body and a fixed footer.
//   const sheet = openSheet({ label, title, subtitle, progress, body, footer, hue, onClose });
//   hue = a topic colour name ('green', 'purple', 'teal', 'pink', 'blue'): the sheet and its progress bar wear it.
//   sheet.update({ title, body, ... })  // redraw parts; the body keeps its scroll position
//   sheet.close();  sheet.isOpen();
// Closes with the X button, a tap on the dark background, the Escape key, or a swipe down.
// Only one sheet is open at a time. Toasts move to the top while a sheet is open (CSS: .has-sheet).
import { h } from './dom.js';

const CLOSE_MS = 220;
const SWIPE_CLOSE_PX = 90;

let active = null;
let counter = 0;

function asList(value) {
  if (value === null || value === undefined || value === false) return [];
  return Array.isArray(value) ? value : [value];
}

export function openSheet({ label = '', title = '', subtitle = '', progress = null, body = null, footer = null, hue = null, onClose = null } = {}) {
  if (active) active.close();
  counter += 1;
  const titleId = `sheet-title-${counter}`;
  let open = true;
  let drag = null;

  const labelEl = h('div', { class: 'label sheet__label' });
  const titleEl = h('h2', { class: 'sheet__title', id: titleId });
  const subtitleEl = h('p', { class: 'sheet__subtitle' });
  const barFill = h('div', { class: 'sheet__bar-fill' });
  const barEl = h('div', { class: 'sheet__bar', 'aria-hidden': 'true' }, barFill);
  const closeBtn = h('button', { class: 'sheet__close', type: 'button', 'aria-label': 'Close', onclick: () => close() }, '✕');
  const bodyEl = h('div', { class: 'sheet__body' });
  const footerEl = h('div', { class: 'sheet__footer' });

  const grab = h('div', { class: 'sheet__grab' },
    h('div', { class: 'sheet__handle', 'aria-hidden': 'true' }),
    h('div', { class: 'sheet__head' },
      h('div', { class: 'sheet__head-text' }, labelEl, titleEl, subtitleEl),
      closeBtn),
    barEl);

  const panel = h('div', { class: hue ? `sheet sheet--${hue}` : 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    grab, bodyEl, footerEl);
  const backdrop = h('div', { class: 'sheet-backdrop', onclick: () => close() });
  const layer = h('div', { class: 'sheet-layer' }, backdrop, panel);

  function update(parts = {}) {
    if (parts.label !== undefined) labelEl.replaceChildren(parts.label);
    if (parts.title !== undefined) titleEl.replaceChildren(parts.title);
    if (parts.subtitle !== undefined) subtitleEl.replaceChildren(parts.subtitle);
    if (parts.progress !== undefined) {
      if (parts.progress === null) {
        barEl.classList.add('is-hidden');
      } else {
        barEl.classList.remove('is-hidden');
        const percent = Math.round(Math.max(0, Math.min(1, parts.progress)) * 100);
        barFill.style.width = `${percent}%`;
      }
    }
    if (parts.body !== undefined) {
      const scrollTop = bodyEl.scrollTop;
      bodyEl.replaceChildren(...asList(parts.body));
      bodyEl.scrollTop = scrollTop;
    }
    if (parts.footer !== undefined) {
      const items = asList(parts.footer);
      footerEl.replaceChildren(...items);
      if (items.length === 0) footerEl.classList.add('is-hidden');
      else footerEl.classList.remove('is-hidden');
    }
  }

  function onKeydown(event) {
    if (event && event.key === 'Escape') close();
  }

  function close() {
    if (!open) return;
    open = false;
    if (active === controller) active = null;
    if (typeof document.removeEventListener === 'function') document.removeEventListener('keydown', onKeydown);
    document.body.classList.remove('has-sheet');
    layer.classList.add('is-leaving');
    setTimeout(() => layer.remove(), CLOSE_MS);
    if (onClose) onClose();
  }

  // Swipe down on the header to close. Buttons inside the header are left alone.
  function insideButton(event) {
    const target = event && event.target;
    return Boolean(target && typeof target.closest === 'function' && target.closest('button'));
  }
  grab.addEventListener('pointerdown', (event) => {
    if (insideButton(event)) return;
    drag = { startY: event.clientY, dy: 0, captured: false };
  });
  grab.addEventListener('pointermove', (event) => {
    if (!drag) return;
    drag.dy = Math.max(0, event.clientY - drag.startY);
    if (drag.dy > 6 && !drag.captured) {
      drag.captured = true;
      if (typeof grab.setPointerCapture === 'function') grab.setPointerCapture(event.pointerId);
    }
    if (drag.captured) {
      panel.style.transition = 'none';
      panel.style.transform = `translateY(${drag.dy}px)`;
    }
  });
  const endDrag = () => {
    if (!drag) return;
    const { dy } = drag;
    drag = null;
    if (dy > SWIPE_CLOSE_PX) {
      close();
    } else {
      panel.style.transition = '';
      panel.style.transform = '';
    }
  };
  grab.addEventListener('pointerup', endDrag);
  grab.addEventListener('pointercancel', endDrag);

  const controller = { el: layer, update, close, isOpen: () => open };

  update({ label, title, subtitle, progress, body, footer });
  document.body.append(layer);
  document.body.classList.add('has-sheet');
  if (typeof document.addEventListener === 'function') document.addEventListener('keydown', onKeydown);
  if (typeof closeBtn.focus === 'function') closeBtn.focus({ preventScroll: true });
  active = controller;
  return controller;
}
