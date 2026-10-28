// Runs the real Home screen code against a pretend page (tests/helpers/fake-dom.js).
import test, { beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, hasText, byClass } from './helpers/fake-dom.js';
import { fakeStorage } from './helpers/fake-storage.js';
import * as actions from '../src/state/actions.js';
import * as selectors from '../src/state/selectors.js';
import home from '../src/features/home/index.js';
import { createNav } from '../src/ui/nav.js';
import { createRing } from '../src/ui/ring.js';
import { createEmber } from '../src/ui/ember.js';
import { showToast } from '../src/ui/toast.js';
import { features } from '../src/features/index.js';

const NOON = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
const tick = () => new Promise((resolve) => setImmediate(resolve));
let dom;
let fake;

async function setup(solves = []) {
  mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOON(2026, 6, 10) });
  dom = installFakeDom();
  fake = fakeStorage();
  fake.solves = solves;
  actions.useStorage(fake);
  await actions.init();
}

function mountHome() {
  const root = document.createElement('main');
  dom.body.append(root);
  const unmount = home.mount(root, { store: actions.store, actions, selectors });
  return { root, unmount };
}
const solveOn = (problemId, y, m, d) => ({ problemId, day: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, at: NOON(y, m, d) });
const solvedButton = (root) => root.find((e) => e.tagName === 'button' && /Solved/.test(e.textContent));

beforeEach(() => {});
afterEach(() => { mock.timers.reset(); dom.restore(); });

test('home: new user sees the start message, the problem and a Solved button', async () => {
  await setup();
  const { root } = mountHome();
  assert.ok(hasText(root, 'Start your streak today'));
  assert.ok(hasText(root, 'One problem is enough.'));
  assert.ok(hasText(root, 'Linear Search'));
  assert.ok(hasText(root, '#1 of 405'));
  assert.ok(hasText(root, 'Arrays · Fundamentals'));
  assert.ok(hasText(root, 'Basic'));
  assert.ok(hasText(root, 'Solve it on takeUforward, then tap Solved.'));
  assert.ok(solvedButton(root));
  assert.ok(root.classList.contains('view--fill'));
});

test('home: top row shows streak, freezes (x of 2), XP and the goal ring', async () => {
  await setup();
  const { root } = mountHome();
  const top = byClass(root, 'top-row')[0];
  assert.equal(top.children.length, 4);
  assert.ok(hasText(top, '🔥'));
  assert.ok(hasText(top, '0/2'));
  assert.ok(hasText(top, '⭐'));
  assert.ok(hasText(top, 'Level 1'));
  assert.ok(hasText(top, '0/1')); // goal ring
  assert.equal(byClass(root, 'ring').length, 1);
});

test('home: the week strip has 7 days with today last', async () => {
  await setup();
  const { root } = mountHome();
  const days = byClass(root, 'day');
  assert.equal(days.length, 7);
  assert.ok(days[6].classList.contains('is-today'));
  assert.equal(byClass(days[6], 'dot--today').length, 1);
  assert.equal(byClass(root, 'dot--empty').length, 6);
});

test('home: tapping Solved marks it, celebrates, and offers Undo', async () => {
  await setup();
  const { root } = mountHome();
  solvedButton(root).click();
  await tick();
  dom.flushFrames();

  assert.equal(actions.store.get().solves.length, 1);
  assert.equal(fake.solves.length, 1);
  // Now the "done today" state
  assert.ok(hasText(root, 'Done for today. See you tomorrow'));
  assert.ok(hasText(root, 'Next up') || hasText(root, 'Second Largest Element'));
  assert.ok(hasText(root, '#2 of 405'));
  // Smaller secondary button for doing more
  const more = root.find((e) => e.tagName === 'button' && /Solved one more/.test(e.textContent));
  assert.ok(more);
  assert.ok(more.classList.contains('btn--ghost'));
  // XP float and messages
  assert.equal(byClass(root, 'xp-float').length, 1);
  assert.ok(hasText(dom.body, 'Marked #1 solved'));
  assert.ok(hasText(dom.body, '+5 daily goal reached'));
  assert.ok(hasText(dom.body, 'Streak started'));
  // The flame bounced once, then the one-time effect is gone on the next draw
  assert.equal(byClass(root, 'is-bounce').length >= 1, true);
  assert.equal(root.find((e) => e.classList.contains('top-row')).textContent.includes('1'), true);
});

test('home: Undo from the toast brings the old state back', async () => {
  await setup();
  const { root } = mountHome();
  solvedButton(root).click();
  await tick();
  dom.flushFrames();
  const undo = dom.body.find((e) => e.tagName === 'button' && e.textContent === 'Undo');
  assert.ok(undo);
  undo.click();
  await tick();
  dom.flushFrames();
  assert.equal(actions.store.get().solves.length, 0);
  assert.ok(hasText(root, 'Start your streak today'));
  assert.ok(hasText(root, '#1 of 405'));
});

test('home: the Undo message shows ABOVE the Next-up card, never on top of its Solved button', async () => {
  await setup();
  const { root } = mountHome();
  solvedButton(root).click();
  await tick();
  dom.flushFrames();
  const home = byClass(root, 'home')[0];
  const kinds = home.children.map((c) => (c.classList.contains('home__scroll') ? 'scroll'
    : c.classList.contains('home__toast-anchor') ? 'anchor' : c.classList.contains('next') ? 'card' : 'other'));
  assert.deepEqual(kinds, ['scroll', 'anchor', 'card']);
  const anchor = byClass(root, 'home__toast-anchor')[0];
  assert.ok(anchor.find((e) => e.tagName === 'button' && e.textContent === 'Undo'), 'Undo lives in the Home toast box');
  assert.ok(anchor.textContent.includes('Marked #1 solved'));
  // The shared bottom box was not used for this message.
  assert.equal(dom.body.find((e) => e.classList.contains('toasts') && !e.classList.contains('toasts--inline')), null);
  // Another redraw must not throw the message away.
  actions.store.set({ today: actions.store.get().today });
  dom.flushFrames();
  assert.ok(byClass(root, 'home__toast-anchor')[0].textContent.includes('Marked #1 solved'));
});

test('home: streak waiting for today shows the keep-your-streak message and a pulsing flame', async () => {
  await setup([solveOn(1, 2026, 6, 9)]);
  const { root } = mountHome();
  assert.ok(hasText(root, 'Solve 1 problem to keep your 1-day streak'));
  assert.ok(byClass(root, 'is-pulse').length >= 1);
  const sleepy = root.find((e) => e.classList.contains('ember--sleepy'));
  assert.ok(sleepy);
});

test('home: after a missed day the words are kind', async () => {
  await setup([solveOn(1, 2026, 6, 5)]);
  const { root } = mountHome();
  assert.ok(hasText(root, "Welcome back. Let's start a new streak"));
  assert.ok(!/miss|lost|fail/i.test(root.textContent.replace(/aria/g, '')));
});

test('home: solving two in a row works and the second is a plain secondary tap', async () => {
  await setup();
  const { root } = mountHome();
  solvedButton(root).click();
  await tick();
  dom.flushFrames();
  const more = root.find((e) => e.tagName === 'button' && /Solved one more/.test(e.textContent));
  more.click();
  await tick();
  dom.flushFrames();
  assert.equal(actions.store.get().solves.length, 2);
  assert.ok(hasText(root, '#3 of 405'));
});

test('home: a double tap saves only once', async () => {
  await setup();
  const { root } = mountHome();
  const button = solvedButton(root);
  button.click();
  button.click();
  await tick();
  assert.equal(actions.store.get().solves.length, 1);
});

test('home: when saving fails, a message appears and nothing changes', async () => {
  await setup();
  const { root } = mountHome();
  fake.failWrites = true;
  const errors = mock.method(console, 'error', () => {});
  solvedButton(root).click();
  await tick();
  assert.equal(actions.store.get().solves.length, 0);
  assert.ok(hasText(dom.body, 'Could not save'));
  errors.mock.restore();
});

test('home: backup reminder banner links to settings', async () => {
  await setup([solveOn(1, 2026, 5, 1)]);
  const { root } = mountHome();
  const banner = root.find((e) => e.tagName === 'a');
  assert.ok(banner);
  assert.equal(banner.getAttribute('href'), '#/settings');
});

test('home: when everything is solved a finished card shows and there is no button', async () => {
  const { PROBLEMS } = await import('../src/core/problems.data.js');
  await setup(PROBLEMS.map((p) => solveOn(p.id, 2026, 6, 10)));
  const { root } = mountHome();
  assert.ok(hasText(root, 'All 405 done!'));
  assert.ok(hasText(root, 'All 405 problems done'));
  assert.equal(solvedButton(root), null);
});

test('home: unmount stops listening to the store', async () => {
  await setup();
  const { unmount } = mountHome();
  dom.flushFrames();
  unmount();
  actions.store.set({ today: '2026-06-11' });
  assert.equal(dom.flushFrames(), undefined);
  // nothing was queued after unmount, so a flush does nothing and does not throw
});

test('nav: marks the active tab', () => {
  dom = installFakeDom();
  const nav = createNav(features);
  assert.equal(nav.el.children.length, 4);
  assert.deepEqual(features.map((f) => f.id), ['home', 'path', 'stats', 'settings']);
  nav.setActive('stats');
  const active = byClass(nav.el, 'is-active');
  assert.equal(active.length, 1);
  assert.equal(active[0].getAttribute('href'), '#/stats');
  assert.equal(active[0].getAttribute('aria-current'), 'page');
  nav.setActive('home');
  assert.equal(byClass(nav.el, 'is-active')[0].getAttribute('href'), '#/home');
  dom.restore();
});

test('ring: setValue moves the ring and clamps', () => {
  dom = installFakeDom();
  const ring = createRing({ size: 100, stroke: 10, value: 0 });
  const bar = ring.find((e) => e.classList.contains('ring__value'));
  const c = 2 * Math.PI * 45;
  assert.ok(Math.abs(Number(bar.getAttribute('stroke-dashoffset')) - c) < 1e-6);
  ring.setValue(0.5);
  assert.ok(Math.abs(Number(bar.getAttribute('stroke-dashoffset')) - c / 2) < 1e-6);
  ring.setValue(2);
  assert.equal(Number(bar.getAttribute('stroke-dashoffset')), 0);
  ring.setValue(-1);
  assert.ok(Math.abs(Number(bar.getAttribute('stroke-dashoffset')) - c) < 1e-6);
  dom.restore();
});

test('ember: three moods, each with its own label and face', () => {
  dom = installFakeDom();
  for (const mood of ['sleepy', 'happy', 'cheering']) {
    const el = createEmber({ mood, size: 80, lit: mood === 'happy' });
    assert.ok(el.classList.contains(`ember--${mood}`));
    assert.equal(el.getAttribute('aria-label'), `Ember, ${mood}`);
  }
  const lit = createEmber({ mood: 'happy', lit: true });
  assert.ok(lit.classList.contains('ember--lit'));
  assert.equal(byClass(createEmber({ mood: 'cheering' }), 'ember__spark').length, 3);
  assert.equal(byClass(createEmber({ mood: 'sleepy' }), 'ember__z').length, 2);
  dom.restore();
});

test('toast: with a host the message goes into that host, not the shared box', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  dom = installFakeDom();
  const host = document.createElement('div');
  dom.body.append(host);
  showToast({ message: 'in the host', host });
  assert.equal(host.children.length, 1);
  assert.ok(host.textContent.includes('in the host'));
  assert.equal(dom.body.find((e) => e.classList.contains('toasts')), null);
  mock.timers.reset();
  dom.restore();
});

test('toast: at most 4 visible, and the action closes it', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  dom = installFakeDom();
  let undone = 0;
  for (let i = 0; i < 6; i++) showToast({ message: `m${i}` });
  const container = dom.body.find((e) => e.classList.contains('toasts'));
  assert.equal(container.children.length, 4);
  showToast({ message: 'x', actionLabel: 'Undo', onAction: () => { undone++; } });
  const undo = dom.body.find((e) => e.tagName === 'button' && e.textContent === 'Undo');
  undo.click();
  assert.equal(undone, 1);
  mock.timers.reset();
  dom.restore();
});
