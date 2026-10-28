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

async function setup(solves = []) {
  mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOON(2026, 6, 10) });
  dom = installFakeDom();
  const fake = fakeStorage();
  fake.solves = solves;
  actions.useStorage(fake);
  await actions.init();
}

function mountStats() {
  const root = document.createElement('main');
  dom.body.append(root);
  const unmount = stats.mount(root, { store: actions.store, actions, selectors });
  return { root, unmount };
}

const button = (root, label) => root.find((e) => e.tagName === 'button' && e.getAttribute('aria-label') === label);
const isDisabled = (el) => el.getAttribute('disabled') !== null;
const title = (root) => byClass(root, 'cal__title')[0].textContent;
const cell = (root, day) => root.find((e) => e.dataset && e.dataset.day === day);
const bar = (root, label) => root.find((e) => e.getAttribute('aria-label') === label && e.getAttribute('role') === 'progressbar');

afterEach(() => {
  mock.timers.reset();
  if (dom) { dom.restore(); dom = null; }
});

test('stats is registered as the third screen', () => {
  assert.equal(stats.id, 'stats');
  assert.equal(features[2], stats);
});

test('stats: a new user sees zeros, an empty bar, level 1 and a plain calendar with today outlined', async () => {
  await setup();
  const { root } = mountStats();
  const tiles = byClass(root, 'tile');
  assert.equal(tiles.length, 3);
  assert.ok(hasText(tiles[0], 'Current streak'));
  assert.ok(hasText(tiles[1], 'Longest streak'));
  assert.ok(hasText(tiles[2], 'Freezes'));
  assert.ok(hasText(tiles[2], '0/2'));
  assert.ok(hasText(root, 'Solved 0 of 405'));
  assert.equal(bar(root, 'Problems solved').getAttribute('aria-valuenow'), '0');
  assert.ok(hasText(root, '0 XP'));
  assert.ok(hasText(root, 'Level 1'));
  assert.ok(hasText(root, '100 XP to Level 2'));
  assert.equal(bar(root, 'Progress to level 2').getAttribute('aria-valuenow'), '0');
  assert.ok(hasText(root, '0 days'));

  assert.equal(title(root), 'June 2026');
  assert.equal(byClass(root, 'cal__cell').length, 30);
  assert.equal(byClass(root, 'cal__cell--solved').length + byClass(root, 'cal__cell--frozen').length + byClass(root, 'cal__cell--missed').length, 0);
  assert.equal(byClass(root, 'is-today').length, 1);
  assert.equal(byClass(root, 'is-today')[0].dataset.day, '2026-06-10');
  assert.ok(isDisabled(button(root, 'Previous month')));
  assert.ok(isDisabled(button(root, 'Next month')));
});

test('stats: calendar matches the replayed streak (solved, frozen, missed, today)', async () => {
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

  // Same numbers the selector gives: streak 0 after the miss, longest 7, freezes used up.
  const s = selectors.selectStats(actions.store.get());
  assert.equal(s.streak, 0);
  assert.equal(s.longest, 7);
  assert.equal(s.freezes, 0);
  const tiles = byClass(root, 'tile');
  assert.ok(hasText(tiles[0], '0'));
  assert.ok(hasText(tiles[1], '7'));
  assert.ok(hasText(tiles[2], '0/2'));
  assert.ok(hasText(root, 'Solved 7 of 405'));
  assert.equal(bar(root, 'Problems solved').getAttribute('aria-valuenow'), '2');
  assert.equal(bar(root, 'Problems solved').children[0].style.width, '2%');
  assert.ok(hasText(root, `${s.xp.total} XP`));
  assert.ok(hasText(root, `Level ${s.xp.level}`));
  assert.ok(hasText(root, '7 days'));
});

test('stats: today solved is outlined and green', async () => {
  await setup([solveOn(1, '2026-06-10')]);
  const { root } = mountStats();
  const today = cell(root, '2026-06-10');
  assert.ok(today.classList.contains('is-today'));
  assert.ok(today.classList.contains('cal__cell--solved'));
  assert.ok(hasText(root, '1 day'));
});

test('stats: legend names all four colours', async () => {
  await setup();
  const { root } = mountStats();
  const legend = byClass(root, 'legend')[0];
  for (const word of ['Solved', 'Frozen', 'Missed', 'Today']) assert.ok(hasText(legend, word));
  assert.equal(byClass(legend, 'legend__item').length, 4);
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
  assert.ok(hasText(root, 'Solved 2 of 405'));

  button(root, 'Next month').click();
  assert.ok(cell(root, '2026-06-10').classList.contains('cal__cell--solved'));
});

test('stats: a solve dated after today moves "today" forward', async () => {
  await setup([solveOn(1, '2026-06-12')]);
  const { root } = mountStats();
  assert.deepEqual(byClass(root, 'is-today').map((e) => e.dataset.day), ['2026-06-12']);
  assert.ok(cell(root, '2026-06-12').classList.contains('cal__cell--solved'));
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
