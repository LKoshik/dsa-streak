// Icons: small inline SVG pictures that take their colour from the text (currentColor).
//   icon('check', 16) -> an <svg class="icon icon--check" data-icon="check"> element, size x size px.
// All icons are drawn on a 24 x 24 grid. Size is the only thing a screen chooses; colour comes from CSS.
import { svgFromString } from './dom.js';

// name -> { fill, strokeWidth, body (the shapes, as SVG text) }
const ICONS = {
  snowflake: { fill: 'none', strokeWidth: 2, body: '<path d="M12 2.7 12 21.3M20.05 7.35 3.95 16.65M20.05 16.65 3.95 7.35"/><path d="M9.99 4.39 12 6.2 14.01 4.39M17.58 6.46 17.02 9.1 19.59 9.93M19.59 14.07 17.02 14.9 17.58 17.54M14.01 19.61 12 17.8 9.99 19.61M6.42 17.54 6.98 14.9 4.41 14.07M4.41 9.93 6.98 9.1 6.42 6.46"/>' },
  xp: { fill: 'currentColor', strokeWidth: 2, body: '<path d="M13.5 3 5 13.5h5.8l-.9 7.5 9.1-11h-5.8z"/>' },
  check: { fill: 'none', strokeWidth: 3, body: '<path d="M5 12.5 10 17.5 19 7"/>' },
  backup: { fill: 'none', strokeWidth: 2, body: '<path d="M12 4v10"/><path d="M8 10.5 12 14.5 16 10.5"/><path d="M5 15v2.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V15"/>' },
  'arrow-right': { fill: 'none', strokeWidth: 2, body: '<path d="M5 12h14M13 6l6 6-6 6"/>' },
  goal: { fill: 'none', strokeWidth: 2, body: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>' },
  home: { fill: 'none', strokeWidth: 2, body: '<path d="M4 11.2 12 4.5l8 6.7"/><path d="M6 9.5V19a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V9.5"/><path d="M10 20.5v-4.2a2 2 0 0 1 4 0v4.2"/>' },
  path: { fill: 'none', strokeWidth: 2, body: '<circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><path d="M8 18.5h6.25a3.25 3.25 0 0 0 0-6.5h-4.5a3.25 3.25 0 0 1 0-6.5H16"/>' },
  stats: { fill: 'none', strokeWidth: 2, body: '<rect x="5" y="13" width="2" height="6" rx="1" fill="currentColor"/><rect x="11" y="5" width="2" height="14" rx="1" fill="currentColor"/><rect x="17" y="9" width="2" height="10" rx="1" fill="currentColor"/>' },
  settings: { fill: 'none', strokeWidth: 2, body: '<path d="M10.39 5.29 10.53 2.72 13.47 2.72 13.61 5.29 15.61 6.12 17.53 4.4 19.6 6.47 17.88 8.39 18.71 10.39 21.28 10.53 21.28 13.47 18.71 13.61 17.88 15.61 19.6 17.53 17.53 19.6 15.61 17.88 13.61 18.71 13.47 21.28 10.53 21.28 10.39 18.71 8.39 17.88 6.47 19.6 4.4 17.53 6.12 15.61 5.29 13.61 2.72 13.47 2.72 10.53 5.29 10.39 6.12 8.39 4.4 6.47 6.47 4.4 8.39 6.12z"/><circle cx="12" cy="12" r="3"/>' },
  trophy: { fill: 'currentColor', strokeWidth: 2, body: '<path d="M7 3.5h10V10a5 5 0 0 1-10 0z"/><path d="M7 5.5H5a1 1 0 0 0-1 1V8a3.5 3.5 0 0 0 3.5 3.5" fill="none"/><path d="M17 5.5h2a1 1 0 0 1 1 1V8a3.5 3.5 0 0 1-3.5 3.5" fill="none"/><path d="M12 15v3" fill="none"/><rect x="8" y="18" width="8" height="3" rx="1.2"/>' },
  flame: { fill: 'currentColor', strokeWidth: 2, body: '<path d="M12.6 2.6C13.3 5.7 17.9 8.3 17.9 13.7C17.9 17.6 15.3 21 12 21C8.7 21 6.1 18.2 6.1 14.7C6.1 12.5 7.1 10.7 8.4 9.4C8.6 11 9.4 12.1 10.4 12.5C10 8.7 10.9 5 12.6 2.6Z"/>' },
  calendar: { fill: 'none', strokeWidth: 2, body: '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4"/>' },
};

export const ICON_NAMES = Object.keys(ICONS);

export function icon(name, size = 24) {
  const spec = ICONS[name];
  if (!spec) throw new Error(`Unknown icon: ${name}`);
  return svgFromString(
    `<svg class="icon icon--${name}" data-icon="${name}" viewBox="0 0 24 24" width="${size}" height="${size}" `
    + `fill="${spec.fill}" stroke="currentColor" stroke-width="${spec.strokeWidth}" stroke-linecap="round" `
    + `stroke-linejoin="round" focusable="false" aria-hidden="true">${spec.body}</svg>`);
}
