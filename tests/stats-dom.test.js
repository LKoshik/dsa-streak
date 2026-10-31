// Runs the real Stats screen code against a pretend page (tests/helpers/fake-dom.js).
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, hasText, byClass } from './helpers/fake-dom.js';
import { fakeStorage } from './helpers/fake-storage.js';
import * as actions from '../src/state/actions.js';
import * as selectors from '../src/state/selectors.js';
import stats from '../src/features/stats/index.js';
import { features } from '../src/features/index.js';

const NOON = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
const tick = () => new Promise((resolve) => setImmediate(resolve));
const solveOn = (problemId, day) => {
  const [y, m, d] = day.split('-').map(Number);
  return { problemId, day, at: NOON(y, m, d) };
};
let dom;
let savedWindow;

async function setup(solves = []) {
  mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOON(2026, 6, 10) });
  // The count-up reads performance.now(); a far-away start makes it finish on the first frame.
  mock.method(performance, 'now', () => -10000);
  dom = installFakeDom();
  const fake = fakeStorage();
  fake.solves = solves;
  actions.useStorage(fake);
  await actions.init();
}

// Mounts the screen. By default it also runs the queued frames, so the count-up numbers are at their final value.
function mountStats({ settle = true } = {}) {
  const root = document.createElement('main');
  dom.body.append(root);
  const unmount = stats.mount(root, { store: actions.store, actions, selectors });
  if (settle) dom.flushFrames();
  return { root, unmount };
}

const button = (root, label) => root.find((e) => e.tagName === 'button' && e.getAttribute('aria-label') === label);
const isDisabled = (el) => el.getAttribute('disabled') !== null;
const title = (root) => byClass(root, 'cal__title')[0].textContent;
const cell = (root, day) => root.find((e) => e.dataset && e.dataset.day === day);
const bar = (root, label) => root.find((e) => e.getAttribute('aria-label') === label && e.getAttribute('role') === 'progressbar');
const hero = (root) => byClass(root, 'streak-hero')[0];
const bigNumber = (root) => byClass(root, 'streak-hero__number')[0];
const solvedLabel = (root) => byClass(root, 'progress__big')[0].getAttribute('aria-label');
const strip = (root, cls) => byClass(byClass(root, 'stats-strip')[0], cls)[0];
const headings = (root) => byClass(root, 'stats__h').map((e) => e.textContent);

afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
  if (savedWindow !== undefined) { globalThis.window = savedWindow.value; savedWindow = undefined; }
  if (dom) { dom.restore(); dom = null; }
});

test('stats is registered as the third screen', () => {
  assert.equal(stats.id, 'stats');
  assert.equal(features[2], stats);
});

test('stats: a new user sees a dim zero streak, an empty bar, zeros in the row and a plain calendar with today outlined', async () => {
  await setup();
  const { root } = mountStats();

  assert.deepEqual(headings(root), ['Streak Calendar', 'Progress']);
  assert.equal(hero(root).getAttribute('aria-label'), '0-day streak');
  assert.ok(hero(root).classList.contains('is-dim'));
  assert.ok(hero(root).classList.contains('streak-hero--dim'));
  assert.equal(bigNumber(root).textContent, '0');
  assert.ok(hasText(root, 'day streak!'));

  assert.equal(solvedLabel(root), 'Solved 0 of 405');
  assert.equal(bar(root, 'Solved progress').getAttribute('aria-valuenow'), '0');
  assert.ok(hasText(byClass(root, 'progress__pct')[0], '0%'));
  assert.equal(byClass(root, 'progress__hint')[0].textContent, 'Your first solve starts the bar.');
  assert.equal(strip(root, 'stat--longest').getAttribute('title'), '0-day longest streak');
  assert.ok(hasText(strip(root, 'stat--freeze'), '0/2'));
  assert.ok(hasText(strip(root, 'stat--days'), 'Days'));
  assert.equal(byClass(strip(root, 'stat--days'), 'stat__value')[0].textContent, '0');

  assert.equal(title(root), 'June 2026');
  assert.equal(byClass(root, 'cal__cell').length, 30);
  assert.equal(byClass(root, 'cal__cell--solved').length + byClass(root, 'cal__cell--frozen').length + byClass(root, 'cal__cell--missed').length, 0);
  assert.equal(byClass(root, 'cal__run').length, 0);
  assert.equal(byClass(root, 'is-today').length, 1);
  assert.equal(byClass(root, 'is-today')[0].dataset.day, '2026-06-10');
  assert.ok(isDisabled(button(root, 'Previous month')));
  assert.ok(isDisabled(button(root, 'Next month')));
});

test('stats: the old boxes are gone (no tiles, legend, level or XP card, sentence card or goal bar)', async () => {
  await setup([1, 2, 3].map((i) => solveOn(i, `2026-06-0${i}`)));
  const { root } = mountStats();
  for (const cls of ['tile', 'legend', 'donut', 'note', 'goal', 'level-bar']) assert.equal(byClass(root, cls).length, 0, cls);
  assert.ok(!hasText(root, 'XP'));
  assert.ok(!hasText(root, 'Level'));
});

test('stats: calendar matches the replayed streak (solved, frozen, missed, today) and neighbours join into pills', async () => {
  // Solve 1 to 7 June (freeze earned), skip the 8th (frozen) and the 9th (missed), today is the 10th.
  await setup([1, 2, 3, 4, 5, 6, 7].map((i) => solveOn(i, `2026-06-0${i}`)));
  const { root } = mountStats();

  const days = (cls) => byClass(root, cls).map((e) => e.dataset.day);
  assert.deepEqual(days('cal__cell--solved'), ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07']);
  assert.deepEqual(days('cal__cell--frozen'), ['2026-06-08']);
  assert.deepEqual(days('cal__cell--missed'), ['2026-06-09']);
  assert.deepEqual(days('is-today'), ['2026-06-10']);
  assert.ok(!cell(root, '2026-06-10').classList.contains('cal__cell--solved'));
  assert.ok(cell(root, '2026-06-11').classList.contains('is-future'));
  assert.equal(cell(root, '2026-06-08').getAttribute('aria-label'), '2026-06-08: frozen');
  assert.equal(cell(root, '2026-06-09').getAttribute('aria-label'), '2026-06-09: missed');
  assert.equal(cell(root, '2026-06-10').getAttribute('aria-label'), '2026-06-10: today');

  // 1 to 7 June is one Monday-to-Sunday row: one orange pill. The frozen 8th is its own ice pill.
  const pills = byClass(root, 'cal__run');
  const solvedPills = pills.filter((e) => !e.classList.contains('cal__run--frozen'));
  const frozenPills = pills.filter((e) => e.classList.contains('cal__run--frozen'));
  assert.equal(solvedPills.length, 1);
  assert.equal(String(solvedPills[0].style['--from']), '1');
  assert.equal(String(solvedPills[0].style['--len']), '7');
  assert.equal(frozenPills.length, 1);
  assert.equal(String(frozenPills[0].style['--from']), '1');
  assert.equal(String(frozenPills[0].style['--len']), '1');

  // Same numbers the selector gives: streak 0 after the miss, longest 7, freezes used up.
  const s = selectors.selectStats(actions.store.get());
  assert.equal(s.streak, 0);
  assert.equal(s.longest, 7);
  assert.equal(s.freezes, 0);
  assert.equal(hero(root).getAttribute('aria-label'), '0-day streak');
  assert.equal(strip(root, 'stat--longest').getAttribute('title'), '7-day longest streak');
  assert.equal(byClass(strip(root, 'stat--longest'), 'stat__value')[0].textContent, '7');
  assert.ok(hasText(strip(root, 'stat--freeze'), '0/2'));
  assert.equal(solvedLabel(root), 'Solved 7 of 405');
  assert.equal(bar(root, 'Solved progress').getAttribute('aria-valuenow'), '2');
  assert.equal(bar(root, 'Solved progress').children[0].style.width, '2%');
  assert.equal(byClass(root, 'progress__hint')[0].textContent, '18 more to reach 25');
  assert.equal(byClass(strip(root, 'stat--days'), 'stat__value')[0].textContent, '7');
  assert.ok(hasText(strip(root, 'stat--days'), 'Days'));
});

test('stats: a solved run that wraps over two rows becomes one pill per row', async () => {
  // 4 to 10 June 2026 is Thursday to Wednesday, so the run is split by the Sunday / Monday row break.
  await setup([4, 5, 6, 7, 8, 9, 10].map((i) => solveOn(i, `2026-06-${String(i).padStart(2, '0')}`)));
  const { root } = mountStats();
  const pills = byClass(root, 'cal__run').filter((e) => !e.classList.contains('cal__run--frozen'));
  assert.equal(pills.length, 2);
  assert.deepEqual(pills.map((e) => [String(e.style['--from']), String(e.style['--len'])]), [['4', '4'], ['1', '3']]);
});

test('stats: today solved is outlined, the hero is lit and the row says "Day"', async () => {
  await setup([solveOn(1, '2026-06-10')]);
  const { root } = mountStats();
  const today = cell(root, '2026-06-10');
  assert.ok(today.classList.contains('is-today'));
  assert.ok(today.classList.contains('cal__cell--solved'));
  assert.equal(hero(root).getAttribute('aria-label'), '1-day streak');
  assert.ok(!hero(root).classList.contains('is-dim'));
  assert.ok(hero(root).classList.contains('streak-hero--stage-1'));
  assert.equal(bigNumber(root).textContent, '1');
  assert.ok(hasText(strip(root, 'stat--days'), 'Day'));
  assert.ok(!hasText(strip(root, 'stat--days'), 'Days'));
  assert.equal(solvedLabel(root), 'Solved 1 of 405');
});

test('stats: the flame stage follows the streak (stage 2 from 7 days, stage 3 from 14) with sparks, and the pills take the same colour', async () => {
  const run = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => solveOn(from + i, `2026-06-${String(from + i).padStart(2, '0')}`));
  await setup(run(1, 7).concat(solveOn(8, '2026-06-08'), solveOn(9, '2026-06-09'), solveOn(10, '2026-06-10')));
  let { root } = mountStats();
  assert.equal(hero(root).getAttribute('aria-label'), '10-day streak');
  assert.ok(hero(root).classList.contains('streak-hero--stage-2'));
  assert.equal(byClass(root, 'streak-hero__spark').length, 3);
  assert.ok(byClass(root, 'cal')[0].classList.contains('cal--stage-2'));
  dom.restore(); mock.timers.reset(); mock.restoreAll();

  // 28 May to 10 June is 14 days in a row.
  const many = [];
  for (let d = 28; d <= 31; d++) many.push(solveOn(d, `2026-05-${d}`));
  for (let d = 1; d <= 10; d++) many.push(solveOn(10 + d, `2026-06-${String(d).padStart(2, '0')}`));
  await setup(many);
  ({ root } = mountStats());
  assert.ok(hero(root).classList.contains('streak-hero--stage-3'));
  assert.ok(byClass(root, 'cal')[0].classList.contains('cal--stage-3'));
});

test('stats: the hero is dim and has no sparks while today is still open', async () => {
  await setup([1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => solveOn(i, `2026-06-0${i}`)));
  const { root } = mountStats();
  assert.ok(hero(root).classList.contains('is-dim'));
  assert.equal(byClass(root, 'streak-hero__spark').length, 0);
  assert.equal(hero(root).getAttribute('aria-label'), '9-day streak');
  // The calendar pills still use the colour of the streak, not the dim flame.
  assert.ok(byClass(root, 'cal')[0].classList.contains('cal--stage-2'));
});

test('stats: the hint under the bar aims at the next round number', async () => {
  await setup([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => solveOn(i, `2026-05-${String(i).padStart(2, '0')}`)));
  const { root } = mountStats();
  assert.equal(solvedLabel(root), 'Solved 12 of 405');
  assert.equal(byClass(root, 'progress__hint')[0].textContent, '13 more to reach 25');
});

test('stats: previous and next month buttons move the calendar and stop at the limits', async () => {
  await setup([solveOn(1, '2026-05-30'), solveOn(2, '2026-05-31'), solveOn(3, '2026-06-01')]);
  const { root } = mountStats();
  assert.equal(title(root), 'June 2026');
  assert.ok(!isDisabled(button(root, 'Previous month')));
  assert.ok(isDisabled(button(root, 'Next month')));

  button(root, 'Previous month').click();
  assert.equal(title(root), 'May 2026');
  assert.equal(byClass(root, 'cal__cell').length, 31);
  assert.deepEqual(byClass(root, 'cal__cell--solved').map((e) => e.dataset.day), ['2026-05-30', '2026-05-31']);
  assert.equal(byClass(root, 'is-today').length, 0);
  assert.ok(isDisabled(button(root, 'Previous month')));
  assert.ok(!isDisabled(button(root, 'Next month')));

  // A tap on a disabled button does nothing.
  button(root, 'Previous month').click();
  assert.equal(title(root), 'May 2026');

  button(root, 'Next month').click();
  assert.equal(title(root), 'June 2026');
  button(root, 'Next month').click();
  assert.equal(title(root), 'June 2026');
});

test('stats: going back across the new year works (December 2025)', async () => {
  await setup([solveOn(1, '2025-12-31'), solveOn(2, '2026-01-01')]);
  const { root } = mountStats();
  for (let i = 0; i < 6; i++) button(root, 'Previous month').click();
  assert.equal(title(root), 'December 2025');
  assert.equal(byClass(root, 'cal__cell--solved').map((e) => e.dataset.day)[0], '2025-12-31');
  assert.ok(isDisabled(button(root, 'Previous month')));
});

test('stats: the screen redraws after a solve and keeps the month being viewed', async () => {
  await setup([solveOn(1, '2026-05-30')]);
  const { root } = mountStats();
  button(root, 'Previous month').click();
  assert.equal(title(root), 'May 2026');

  await actions.markSolved(2);
  await tick();
  dom.flushFrames();
  assert.equal(title(root), 'May 2026');
  assert.equal(solvedLabel(root), 'Solved 2 of 405');

  button(root, 'Next month').click();
  assert.ok(cell(root, '2026-06-10').classList.contains('cal__cell--solved'));
  // 30 May and 10 June are not neighbours, so the streak restarts at 1.
  assert.equal(hero(root).getAttribute('aria-label'), '1-day streak');
  assert.equal(bigNumber(root).textContent, '1');
});

test('stats: a solve dated after today moves "today" forward', async () => {
  await setup([solveOn(1, '2026-06-12')]);
  const { root } = mountStats();
  assert.deepEqual(byClass(root, 'is-today').map((e) => e.dataset.day), ['2026-06-12']);
  assert.ok(cell(root, '2026-06-12').classList.contains('cal__cell--solved'));
});

test('stats: the opening animation plays on the first draw only (count-up, then the intro class goes away)', async () => {
  await setup([1, 2, 3].map((i) => solveOn(i, `2026-06-0${i}`)));
  const { root } = mountStats({ settle: false });
  const container = root.children[0];
  assert.ok(container.classList.contains('is-intro'));
  // Before the first frame the numbers start from 0; the final value is kept in data-count.
  assert.equal(String(bigNumber(root).dataset.count), '0');
  assert.equal(byClass(root, 'progress__big')[0].find((e) => e.tagName === 'b').textContent, '0');
  assert.equal(String(byClass(root, 'progress__big')[0].find((e) => e.tagName === 'b').dataset.count), '3');

  dom.flushFrames();
  assert.equal(byClass(root, 'progress__big')[0].find((e) => e.tagName === 'b').textContent, '3');

  mock.timers.tick(1500);
  assert.ok(!container.classList.contains('is-intro'));

  // A later redraw (a new solve) does not play the intro again.
  await actions.markSolved(4);
  await tick();
  dom.flushFrames();
  assert.ok(!container.classList.contains('is-intro'));
  assert.equal(byClass(root, 'progress__big')[0].find((e) => e.tagName === 'b').textContent, '4');
});

test('stats: with reduced motion the numbers are final at once and never count up', async () => {
  await setup([solveOn(1, '2026-06-10')]);
  savedWindow = { value: globalThis.window };
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  const { root } = mountStats({ settle: false });
  assert.equal(bigNumber(root).textContent, '1');
  assert.equal(byClass(root, 'progress__big')[0].find((e) => e.tagName === 'b').textContent, '1');
});

test('stats: unmount stops redrawing', async () => {
  await setup();
  const { root, unmount } = mountStats();
  unmount();
  const before = root.textContent;
  await actions.markSolved(1);
  await tick();
  dom.flushFrames();
  assert.equal(root.textContent, before);
});
