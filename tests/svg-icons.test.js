// The drawing helpers: svgFromString (reads SVG text into elements), icons, streak flames, path node art.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, byClass } from './helpers/fake-dom.js';
import { svgFromString } from '../src/ui/dom.js';
import { icon, ICON_NAMES } from '../src/ui/icons.js';
import { flameStageFor, createStreakFlame, FLAME_STAGES } from '../src/ui/flame.js';
import { createNodeSprite, createNodeArt } from '../src/ui/node-art.js';

let dom;
const start = () => { dom = installFakeDom(); };
const stop = () => dom.restore();

test('svgFromString: nested tags, attributes, self-closing tags and text', () => {
  start();
  const svg = svgFromString('<svg viewBox="0 0 10 10" class="a b"><g id="x"><path d="M0 0L5 5"/><text>hi</text></g><use href="#x"></use></svg>');
  assert.equal(svg.tagName, 'svg');
  assert.equal(svg.getAttribute('viewBox'), '0 0 10 10');
  assert.equal(svg.getAttribute('class'), 'a b');
  assert.equal(svg.children.length, 2);
  const g = svg.children[0];
  assert.equal(g.children.length, 2);
  assert.equal(g.children[0].getAttribute('d'), 'M0 0L5 5');
  assert.equal(g.children[1].textContent, 'hi');
  assert.equal(svg.children[1].getAttribute('href'), '#x');
  stop();
});

test('svgFromString: refuses markup that is not one complete element', () => {
  start();
  assert.throws(() => svgFromString('<svg><g></svg>'), /complete/);
  assert.throws(() => svgFromString(''), /complete/);
  assert.throws(() => svgFromString('just text'), /complete/);
  stop();
});

test('icons: every name makes a 24-grid svg of the asked size that takes the text colour', () => {
  start();
  assert.deepEqual([...ICON_NAMES].sort(), [
    'arrow-right', 'backup', 'calendar', 'check', 'flame', 'goal', 'home', 'path', 'settings', 'snowflake', 'stats', 'trophy', 'xp',
  ]);
  for (const name of ICON_NAMES) {
    const el = icon(name, 18);
    assert.ok(el.classList.contains('icon') && el.classList.contains(`icon--${name}`), name);
    assert.equal(el.getAttribute('data-icon'), name);
    assert.equal(el.getAttribute('viewBox'), '0 0 24 24');
    assert.equal(el.getAttribute('width'), '18');
    assert.equal(el.getAttribute('height'), '18');
    assert.equal(el.getAttribute('stroke'), 'currentColor');
    assert.equal(el.getAttribute('aria-hidden'), 'true');
    assert.ok(el.children.length >= 1, `${name} has shapes`);
  }
  assert.equal(icon('check').getAttribute('width'), '24'); // default size
  assert.equal(icon('check').getAttribute('stroke-width'), '3');
  assert.equal(icon('home').getAttribute('stroke-width'), '2');
  assert.throws(() => icon('nope'), /Unknown icon/);
  stop();
});

test('flames: the stage rule (dim until today is solved, then 1-6, 7-13, 14+)', () => {
  assert.equal(flameStageFor(0, false), 'dim');
  assert.equal(flameStageFor(11, false), 'dim');
  assert.equal(flameStageFor(30, false), 'dim');
  assert.equal(flameStageFor(1, true), 'stage-1');
  assert.equal(flameStageFor(6, true), 'stage-1');
  assert.equal(flameStageFor(7, true), 'stage-2');
  assert.equal(flameStageFor(13, true), 'stage-2');
  assert.equal(flameStageFor(14, true), 'stage-3');
  assert.equal(flameStageFor(200, true), 'stage-3');
});

test('flames: each stage draws its own art, never an empty svg', () => {
  start();
  for (const stage of FLAME_STAGES) {
    const el = createStreakFlame(stage);
    assert.ok(el.classList.contains('flame-art'));
    assert.equal(el.getAttribute('data-flame'), stage);
    assert.equal(el.getAttribute('aria-hidden'), 'true');
    assert.ok(el.findAll(() => true).length >= 1, stage); // the dim flame is a single shape
  }
  // Gradient ids are prefixed per stage, so a stage never borrows another stage's gradient.
  const idsOf = (stage) => createStreakFlame(stage).findAll((e) => 'id' in e.attrs).map((e) => e.attrs.id);
  assert.ok(idsOf('stage-1').every((id) => id.startsWith('streak-f1-')));
  assert.ok(idsOf('stage-2').every((id) => id.startsWith('streak-f2-')));
  assert.ok(idsOf('stage-3').every((id) => id.startsWith('streak-f3-')));
  assert.equal(byClass(createStreakFlame('dim'), 'flame-art__dim').length, 1);
  assert.throws(() => createStreakFlame('stage-9'), /Unknown flame stage/);
  stop();
});

test('node art: one sprite with both shapes; each node just points at one of them', () => {
  start();
  const sprite = createNodeSprite();
  assert.ok(sprite.classList.contains('node-sprite'));
  const symbols = sprite.findAll((e) => e.tagName === 'symbol').map((e) => e.attrs.id);
  assert.deepEqual(symbols.sort(), ['node-star', 'node-upcoming']);
  // Gradients inside use only black and white, so one sprite works for every topic colour.
  const stops = sprite.findAll((e) => e.tagName === 'stop').map((e) => e.attrs['stop-color']);
  assert.ok(stops.length > 0 && stops.every((c) => c === '#000' || c === '#fff'), stops.join());
  assert.equal(createNodeArt(false).children[0].getAttribute('href'), '#node-star');
  assert.equal(createNodeArt(true).children[0].getAttribute('href'), '#node-upcoming');
  assert.ok(createNodeArt().classList.contains('node__art'));
  stop();
});

// ---------- segmented ring (Path nodes) ----------
import { ringSegments, createSegmentedRing, splitProblems } from '../src/ui/ring.js';

test('segmented ring: 4 or more problems are shared between 3 or 4 arcs as evenly as possible', () => {
  assert.deepEqual(splitProblems(15), [5, 5, 5]);
  assert.deepEqual(splitProblems(16), [4, 4, 4, 4]);
  assert.deepEqual(splitProblems(20), [5, 5, 5, 5]);
  assert.deepEqual(splitProblems(21), [7, 7, 7]);
  assert.deepEqual(splitProblems(12), [3, 3, 3, 3]);   // both divide: 4 arcs
  assert.deepEqual(splitProblems(49), [13, 12, 12, 12]);
  assert.deepEqual(splitProblems(50), [13, 13, 12, 12]);
  assert.deepEqual(splitProblems(17), [5, 4, 4, 4]);
  for (let total = 4; total <= 300; total += 1) {
    const parts = splitProblems(total);
    assert.ok(parts.length === 3 || parts.length === 4, `total ${total}`);
    assert.equal(parts.reduce((sum, n) => sum + n, 0), total);
    assert.ok(Math.max(...parts) - Math.min(...parts) <= 1, `total ${total}`);
  }
  assert.deepEqual([4, 5, 6, 7].map((n) => splitProblems(n).length), [4, 4, 3, 4]); // 6 = 2+2+2
});

test('segmented ring: very small subsections', () => {
  assert.deepEqual(splitProblems(0), [0]);
  assert.deepEqual(splitProblems(1), [1]);
  assert.deepEqual(splitProblems(2), [1, 1]);
  assert.deepEqual(splitProblems(3), [1, 1, 1]);
  assert.deepEqual(splitProblems(NaN), [0]);
  assert.equal(ringSegments({ total: 2 }).segments.length, 2);
  assert.equal(ringSegments({ total: 3 }).segments.length, 3);
});

test('segmented ring: 0 or 1 problem is one plain ring that fills like a progress ring', () => {
  const none = ringSegments({ size: 88, stroke: 6, solved: 0, total: 1 });
  assert.equal(none.full, true);
  assert.equal(none.segments.length, 1);
  assert.equal(none.segments[0].fillLength, 0);
  const one = ringSegments({ solved: 1, total: 1 });
  assert.ok(Math.abs(one.segments[0].fillLength - one.circumference) < 1e-9);
  assert.equal(ringSegments({ solved: 0, total: 0 }).segments[0].fillLength, 0);
});

test('segmented ring: arcs fill one after the other and never run into each other', () => {
  const geo = ringSegments({ size: 88, stroke: 6, solved: 7, total: 15, gap: 4 });
  assert.equal(geo.full, false);
  const [a, b, c] = geo.segments;
  assert.equal(a.solved, 5);
  assert.ok(Math.abs(a.fillLength - a.length) < 1e-9);      // first arc full
  assert.equal(b.solved, 2);
  assert.ok(Math.abs(b.fillLength - b.length * 0.4) < 1e-9); // 2 of 5
  assert.equal(c.fillLength, 0);                              // untouched
  // Seen with their round ends, neighbours are exactly `gap` px apart, and the whole circle is used.
  const visibleEnd = (s) => s.start + s.length + 3;           // + half of stroke 6
  const visibleStart = (s) => s.start - 3;
  assert.ok(Math.abs(visibleStart(b) - visibleEnd(a) - 4) < 1e-9);
  assert.ok(Math.abs(visibleStart(c) - visibleEnd(b) - 4) < 1e-9);
  assert.ok(Math.abs((visibleStart(a) + geo.circumference) - visibleEnd(c) - 4) < 1e-9);
});

test('segmented ring: every arc has the same length, even when they hold a different number of problems', () => {
  const geo = ringSegments({ size: 88, stroke: 6, solved: 20, total: 49 }); // 13 + 12 + 12 + 12
  assert.deepEqual(geo.segments.map((s) => s.problems), [13, 12, 12, 12]);
  assert.ok(geo.segments.every((s) => Math.abs(s.length - geo.segments[0].length) < 1e-9));
  assert.deepEqual(geo.segments.map((s) => s.solved), [13, 7, 0, 0]);
  assert.ok(Math.abs(geo.segments[1].fillLength - geo.segments[1].length * (7 / 12)) < 1e-9);
});

test('segmented ring: a total that does not fit (huge total) still gives positive lengths', () => {
  const geo = ringSegments({ size: 88, stroke: 6, solved: 1, total: 200 });
  assert.ok(geo.segments.every((s) => s.length > 0 && Number.isFinite(s.start)));
  assert.ok(geo.segments[0].fillLength > 0);
});

test('segmented ring: the element has a grey and a coloured arc per segment, centred, no inline colour', () => {
  start();
  const ring = createSegmentedRing({ size: 88, stroke: 6, solved: 7, total: 15 });
  assert.ok(ring.classList.contains('ring') && ring.classList.contains('ring--segments') && ring.classList.contains('is-split'));
  assert.equal(byClass(ring, 'ring__track').length, 3);
  assert.equal(byClass(ring, 'ring__value').length, 2); // arc 1 full, arc 2 part, arc 3 empty
  assert.ok(byClass(ring, 'ring__value').every((c) => c.style.stroke === undefined));
  assert.equal(ring.children[0].getAttribute('viewBox'), '0 0 88 88');
  const plain = createSegmentedRing({ solved: 1, total: 1 });
  assert.ok(!plain.classList.contains('is-split'));
  assert.equal(byClass(plain, 'ring__track').length, 1);
  stop();
});
