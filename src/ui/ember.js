// Ember: the app's own flame mascot, drawn as inline SVG (an original character).
// Three moods: 'sleepy' (streak at risk), 'happy' (done today), 'cheering' (milestones).
//   createEmber({ mood: 'happy', size: 88, lit: true })
import { h } from './dom.js';

let counter = 0;
const INK = '#3b2100'; // dark brown used for eyes and mouth

// A 4-point sparkle star centred on (cx, cy).
function star(cx, cy, r, delay) {
  const k = r * 0.3;
  const points = [
    [cx, cy - r], [cx + k, cy - k], [cx + r, cy], [cx + k, cy + k],
    [cx, cy + r], [cx - k, cy + k], [cx - r, cy], [cx - k, cy - k],
  ].map((p) => p.join(',')).join(' ');
  return h('polygon', { points, fill: '#ffc800', class: 'ember__spark', style: { 'animation-delay': delay } });
}

function faceFor(mood) {
  const cheeks = [
    h('circle', { cx: 37, cy: 104, r: 6, fill: '#ff4b4b', opacity: '0.35' }),
    h('circle', { cx: 83, cy: 104, r: 6, fill: '#ff4b4b', opacity: '0.35' }),
  ];
  if (mood === 'sleepy') {
    return [
      h('path', { d: 'M40 92 Q46 99 52 92', fill: 'none', stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
      h('path', { d: 'M68 92 Q74 99 80 92', fill: 'none', stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
      h('ellipse', { cx: 60, cy: 107, rx: 4.5, ry: 3.5, fill: INK }),
      ...cheeks,
      h('text', { x: 94, y: 40, 'font-size': 16, 'font-weight': 800, fill: '#1cb0f6', class: 'ember__z' }, 'z'),
      h('text', { x: 102, y: 22, 'font-size': 20, 'font-weight': 800, fill: '#1cb0f6', class: 'ember__z ember__z--late' }, 'Z'),
    ];
  }
  if (mood === 'cheering') {
    return [
      h('path', { d: 'M40 93 Q46 84 52 93', fill: 'none', stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
      h('path', { d: 'M68 93 Q74 84 80 93', fill: 'none', stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
      h('path', { d: 'M47 102 Q60 126 73 102 Z', fill: INK }),
      h('ellipse', { cx: 60, cy: 112, rx: 6.5, ry: 4, fill: '#ff4b4b' }),
      ...cheeks,
    ];
  }
  // happy
  return [
    h('ellipse', { cx: 46, cy: 90, rx: 5.5, ry: 7.5, fill: INK }),
    h('ellipse', { cx: 74, cy: 90, rx: 5.5, ry: 7.5, fill: INK }),
    h('circle', { cx: 48, cy: 87, r: 2.2, fill: '#fff' }),
    h('circle', { cx: 76, cy: 87, r: 2.2, fill: '#fff' }),
    h('path', { d: 'M50 103 Q60 114 70 103', fill: 'none', stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
    ...cheeks,
  ];
}

export function createEmber({ mood = 'happy', size = 88, lit = false } = {}) {
  counter += 1;
  const gradientId = `ember-grad-${counter}`;
  const label = { sleepy: 'Ember, sleepy', happy: 'Ember, happy', cheering: 'Ember, cheering' }[mood] || 'Ember';

  const defs = h('defs', null,
    h('linearGradient', { id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1 },
      h('stop', { offset: '0', 'stop-color': '#ff6a00' }),
      h('stop', { offset: '1', 'stop-color': '#ffb100' })));

  const body = h('path', {
    d: 'M62 4 C66 26 96 44 98 84 C100 114 82 134 60 134 C38 134 20 116 22 86 C23 66 34 56 40 40 C44 50 48 56 54 58 C50 38 54 18 62 4 Z',
    fill: `url(#${gradientId})`,
  });
  const glow = h('ellipse', { cx: 60, cy: 116, rx: 26, ry: 14, fill: '#ffe27a', opacity: '0.55' });

  const extras = [];
  if (mood === 'cheering') {
    // Little raised arms and sparkles.
    extras.push(
      h('path', { d: 'M26 98 Q10 86 12 64', fill: 'none', stroke: '#ff8a00', 'stroke-width': 9, 'stroke-linecap': 'round' }),
      h('path', { d: 'M94 98 Q110 86 108 64', fill: 'none', stroke: '#ff8a00', 'stroke-width': 9, 'stroke-linecap': 'round' }),
      h('circle', { cx: 12, cy: 62, r: 6, fill: '#ffb100' }),
      h('circle', { cx: 108, cy: 62, r: 6, fill: '#ffb100' }),
      star(14, 28, 9, '0s'), star(108, 34, 8, '0.4s'), star(60, 4, 7, '0.8s'));
  }

  return h('svg', {
    class: `ember ember--${mood}${lit ? ' ember--lit' : ''}`,
    viewBox: '0 0 120 140', width: size, height: Math.round((size * 140) / 120),
    role: 'img', 'aria-label': label,
  }, defs, ...extras, body, glow, ...faceFor(mood));
}
