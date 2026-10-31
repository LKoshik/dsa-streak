// A circular progress ring (SVG). The returned element has setValue(fraction)
// which moves the ring smoothly (the animation is done by CSS).
import { h } from './dom.js';

const clamp = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

// options: size (px), stroke (px), value (0 to 1), color (CSS color or var; null = no inline colour, CSS decides),
// content (shown in the middle)
export function createRing({ size = 48, stroke = 6, value = 0, color = 'var(--green)', content = null } = {}) {
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const track = h('circle', { cx: center, cy: center, r: radius, fill: 'none', 'stroke-width': stroke, class: 'ring__track' });
  const bar = h('circle', {
    cx: center, cy: center, r: radius, fill: 'none', 'stroke-width': stroke, 'stroke-linecap': 'round',
    class: 'ring__value', style: color ? { stroke: color } : null,
    'stroke-dasharray': circumference, 'stroke-dashoffset': circumference * (1 - clamp(value)),
    transform: `rotate(-90 ${center} ${center})`,
  });
  const svg = h('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': 'true' }, track, bar);
  const el = h('div', { class: 'ring', style: { width: size + 'px', height: size + 'px' } },
    svg, content ? h('div', { class: 'ring__content' }, content) : null);

  el.setValue = (next) => bar.setAttribute('stroke-dashoffset', circumference * (1 - clamp(next)));
  return el;
}

// ---------- the segmented ring (Path nodes) ----------
// The ring is split into a few equal-length arcs (3 or 4), whatever the number of problems in the subsection.
// The problems are shared out as evenly as possible between the arcs (no arc ever holds more than 1 problem
// more than another). Each arc fills from its start as its problems are solved.

// How the problems of a subsection are divided between the arcs: an array with the number of problems in each arc.
//   0 or 1 problem  -> one plain ring            (can't be split)
//   2 or 3 problems -> one arc per problem       (2 arcs / 3 arcs)
//   4 or more       -> 4 arcs if 4 divides it evenly, else 3 arcs if 3 divides it evenly, else 4 arcs.
// The leftover problems go to the first arcs, e.g. 49 -> [13, 12, 12, 12], 50 -> [13, 13, 12, 12], 17 -> [5, 4, 4, 4].
export function splitProblems(total = 0) {
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  if (safeTotal <= 1) return [safeTotal];
  if (safeTotal <= 3) return Array.from({ length: safeTotal }, () => 1);
  let count = 4;
  if (safeTotal % 4 !== 0 && safeTotal % 3 === 0) count = 3;
  const base = Math.floor(safeTotal / count);
  const extra = safeTotal % count;
  return Array.from({ length: count }, (_, index) => base + (index < extra ? 1 : 0));
}

// The geometry, as plain numbers (easy to test). Lengths are along the circle, in px.
// Returns { circumference, radius, full, segments: [{ index, problems, solved, start, length, fillLength }] }
//   start / length = where the grey arc is drawn (the round end caps are already taken off, so the arcs
//   are `gap` px apart as you SEE them). All arcs have the same length. fillLength = the coloured part
//   (0 = nothing solved in this arc).
export function ringSegments({ size = 88, stroke = 6, solved = 0, total = 0, gap = 4 } = {}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const done = Math.max(0, Math.min(safeTotal, Math.floor(Number.isFinite(solved) ? solved : 0)));
  const sizes = splitProblems(safeTotal);
  if (sizes.length <= 1) {
    const fraction = safeTotal > 0 ? done / safeTotal : 0;
    return {
      circumference, radius, full: true,
      segments: [{ index: 0, problems: safeTotal, solved: done, start: 0, length: circumference, fillLength: circumference * fraction }],
    };
  }
  const count = sizes.length;
  const visible = (circumference - count * gap) / count;   // every arc as you see it, with its round ends
  const room = visible - stroke;                           // the centre line is shorter by the two round caps
  const length = room > 0 ? room : 0.01;                   // a tiny arc is drawn as a dot
  const segments = [];
  let before = 0;                                          // problems in the arcs before this one
  for (let index = 0; index < count; index += 1) {
    const problems = sizes[index];
    const begins = gap / 2 + index * (visible + gap);
    const start = room > 0 ? begins + stroke / 2 : begins + visible / 2;
    const inArc = Math.max(0, Math.min(problems, done - before));
    const fillLength = inArc === 0 ? 0 : Math.max(0.01, (inArc / problems) * length);
    segments.push({ index, problems, solved: inArc, start, length, fillLength });
    before += problems;
  }
  return { circumference, radius, full: false, segments };
}

// size / stroke in px. The ring has no colour of its own: CSS colours it (the topic colour on the Path).
export function createSegmentedRing({ size = 88, stroke = 6, solved = 0, total = 0 } = {}) {
  const geometry = ringSegments({ size, stroke, solved, total });
  const center = size / 2;
  const { radius, circumference } = geometry;
  const arc = (className, segment, length) => h('circle', {
    cx: center, cy: center, r: radius, fill: 'none', 'stroke-width': stroke, 'stroke-linecap': 'round',
    class: className, dataset: { segment: String(segment.index) },
    'stroke-dasharray': `${length} ${circumference}`, 'stroke-dashoffset': -segment.start,
  });
  const marks = [];
  for (const segment of geometry.segments) {
    marks.push(arc('ring__track', segment, segment.length));
    if (segment.fillLength > 0) marks.push(arc('ring__value', segment, segment.fillLength));
  }
  const svg = h('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': 'true' },
    h('g', { transform: `rotate(-90 ${center} ${center})` }, marks));
  return h('div', { class: `ring ring--segments${geometry.full ? '' : ' is-split'}`, style: { width: `${size}px`, height: `${size}px` } }, svg);
}
