// A circular progress ring (SVG). The returned element has setValue(fraction)
// which moves the ring smoothly (the animation is done by CSS).
import { h } from './dom.js';

const clamp = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

// options: size (px), stroke (px), value (0 to 1), color (CSS color or var), content (shown in the middle)
export function createRing({ size = 48, stroke = 6, value = 0, color = 'var(--green)', content = null } = {}) {
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const track = h('circle', { cx: center, cy: center, r: radius, fill: 'none', 'stroke-width': stroke, class: 'ring__track' });
  const bar = h('circle', {
    cx: center, cy: center, r: radius, fill: 'none', 'stroke-width': stroke, 'stroke-linecap': 'round',
    class: 'ring__value', style: { stroke: color },
    'stroke-dasharray': circumference, 'stroke-dashoffset': circumference * (1 - clamp(value)),
    transform: `rotate(-90 ${center} ${center})`,
  });
  const svg = h('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': 'true' }, track, bar);
  const el = h('div', { class: 'ring', style: { width: size + 'px', height: size + 'px' } },
    svg, content ? h('div', { class: 'ring__content' }, content) : null);

  el.setValue = (next) => bar.setAttribute('stroke-dashoffset', circumference * (1 - clamp(next)));
  return el;
}
