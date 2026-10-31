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
import { createEmber, setEmberMood } from '../src/ui/ember.js';
import { showToast } from '../src/ui/toast.js';
import { features } from '../src/features/index.js';
import { getProblem, TOPICS } from '../src/core/catalog.js';

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
const buttonWithText = (root, text) => root.find((e) => e.tagName === 'button' && e.textContent.trim() === text);
const homeNext = () => selectors.selectHome(actions.store.get()).next;
// Solved, then wait for the save and the redraw.
async function solveNow(root) {
  solvedButton(root).click();
  await tick();
  dom.flushFrames();
}
// On the gold card: wait until Next problem is awake, tap it, and let the next problem slide in.
function goNext(root) {
  mock.timers.tick(600);
  buttonWithText(root, 'Next problem').click();
  mock.timers.tick(200);
  dom.flushFrames();
}
const solvedButton = (root) => root.find((e) => e.tagName === 'button' && /Solved/.test(e.textContent));

beforeEach(() => {});
afterEach(() => { mock.timers.reset(); dom.restore(); });

test('home: new user sees the start message, the problem and a Solved button', async () => {
  await setup();
  const { root } = mountHome();
  assert.ok(hasText(root, 'Start your streak today'));
  assert.ok(hasText(root, 'One problem is enough.'));
  assert.ok(hasText(root, 'Next up'));
  assert.ok(hasText(root, 'Linear Search'));
  assert.ok(hasText(root, 'Arrays · Fundamentals'));
  assert.ok(hasText(root, 'Basic'));
  assert.ok(hasText(root, `0/${homeNext().subTotal}`)); // how far the section is
  assert.ok(hasText(root, '+15 XP'));                    // 10 XP + the 5 goal bonus: this solve completes today's goal
  assert.ok(byClass(root, 'next2')[0].classList.contains('topic--green'));
  assert.ok(solvedButton(root));
  assert.ok(root.classList.contains('view--fill'));
});

test('home: top row shows freezes (x of 2), XP and the goal ring; the streak has its own big block', async () => {
  await setup();
  const { root } = mountHome();
  const top = byClass(root, 'top-row')[0];
  assert.equal(top.children.length, 3);
  assert.equal(byClass(top, 'flame-art').length, 0);
  assert.equal(byClass(root, 'streak-hero').length, 1);
  assert.equal(byClass(byClass(root, 'streak-hero')[0], 'flame-art').length, 1);
  assert.equal(byClass(top, 'icon--snowflake').length, 1);
  assert.equal(byClass(top, 'icon--xp').length, 1);
  assert.ok(hasText(top, '0/2'));
  assert.ok(hasText(top, 'Level 1'));
  assert.ok(hasText(top, '0/1')); // goal ring
  assert.equal(byClass(root, 'ring').length, 1);
});

test('home: the week bar shows 4 past days, today and 2 upcoming days, so it is never full', async () => {
  await setup();
  const { root } = mountHome();
  const days = byClass(root, 'day');
  assert.equal(days.length, 7);
  assert.ok(days[4].classList.contains('is-today'));
  assert.equal(byClass(days[4], 'dot--today').length, 1);
  assert.ok(days[5].classList.contains('is-future') && days[6].classList.contains('is-future'));
  assert.equal(byClass(root, 'dot--future').length, 2);
  assert.equal(byClass(root, 'dot--empty').length, 4);
  assert.equal(days[5].getAttribute('aria-label'), '2026-06-11: upcoming');
  // The upcoming days are the next two real dates (Wed 10 June 2026 is today).
  assert.deepEqual(days.map((d) => byClass(d, 'day__letter')[0].textContent).slice(4), ['W', 'T', 'F']);
});

test('home: even a long streak leaves the upcoming days empty', async () => {
  const solves = [];
  for (let i = 0; i < 10; i += 1) solves.push(solveOn(i + 1, 2026, 6, 10 - i));
  await setup(solves);
  const { root } = mountHome();
  assert.equal(byClass(root, 'dot--future').length, 2);
  assert.equal(pills(root).length, 1);
  assert.deepEqual([pills(root)[0].style['--from'], pills(root)[0].style['--len']], ['1', '5']); // 5 of 7 slots, not the whole bar
});

test('home: tapping Solved turns the card into the gold Solved card with rewards, Undo and Next problem', async () => {
  await setup();
  const { root } = mountHome();
  await solveNow(root);

  assert.equal(actions.store.get().solves.length, 1);
  assert.equal(fake.solves.length, 1);
  assert.ok(hasText(root, 'Done for today. See you tomorrow'));
  // The same card, now gold: the solved problem, its rewards, Undo and Next problem.
  const card = byClass(root, 'next2')[0];
  assert.ok(card.classList.contains('next2--done'));
  assert.ok(hasText(card, 'Solved'));
  assert.ok(hasText(card, 'Linear Search'));
  assert.deepEqual(byClass(card, 'reward-chip').map((c) => c.textContent.trim()), ['+10 XP', '+5 daily goal reached', 'Streak started']);
  assert.ok(buttonWithText(card, 'Undo'));
  assert.equal(buttonWithText(card, 'Next problem').disabled, true); // wakes up a moment later
  // Rewards live on the card now: no toast, no floating XP.
  assert.ok(!hasText(dom.body, 'Marked #1 solved'));
  assert.equal(byClass(root, 'xp-float').length, 0);
  // First solve of the day: the flame, the number and the week pill all animate.
  assert.equal(byClass(root, 'streak-hero__number')[0].textContent, '1');
  assert.ok(byClass(root, 'streak-hero__flame')[0].classList.contains('is-bounce'));
  assert.ok(byClass(root, 'streak-hero__number')[0].classList.contains('is-bounce'));
  assert.ok(pills(root)[0].classList.contains('is-fresh'));
});

test('home: the flame, number and week bar animate only for the first solve of the day; Ember reacts every time', async () => {
  await setup();
  const { root } = mountHome();
  await solveNow(root);
  assert.ok(byClass(root, 'hero__ember')[0].classList.contains('is-bounce'));
  goNext(root);
  assert.ok(hasText(root, 'Bonus round'));
  await solveNow(root);                        // a second problem the same day
  assert.equal(actions.store.get().solves.length, 2);
  assert.equal(byClass(root, 'streak-hero__number')[0].textContent, '1');
  assert.ok(!byClass(root, 'streak-hero__flame')[0].classList.contains('is-bounce'));
  assert.ok(!byClass(root, 'streak-hero__number')[0].classList.contains('is-bounce'));
  assert.equal(byClass(root, 'week__run').filter((r) => r.classList.contains('is-fresh')).length, 0);
  assert.ok(byClass(root, 'hero__ember')[0].classList.contains('is-bounce'));
});

test('home: Next problem wakes up after a moment, then the next problem slides in as a bonus round', async () => {
  await setup();
  const { root } = mountHome();
  await solveNow(root);
  const first = getProblem(1).title;
  const next = buttonWithText(root, 'Next problem');
  next.click();                                   // too early: ignored
  mock.timers.tick(200);
  dom.flushFrames();
  assert.ok(byClass(root, 'next2')[0].classList.contains('next2--done'));
  goNext(root);
  const card = byClass(root, 'next2')[0];
  assert.ok(!card.classList.contains('next2--done'));
  assert.ok(card.classList.contains('is-enter'));
  assert.ok(hasText(card, 'Bonus round'));
  assert.ok(hasText(card, homeNext().problem.title));
  assert.ok(!hasText(card, first));
  const more = buttonWithText(card, 'Solved one more');
  assert.ok(more.classList.contains('btn--blue'));
  assert.ok(hasText(card, '+10 XP') && !hasText(card, '+15 XP'));
});

test('home: Undo on the gold card brings the old state back', async () => {
  await setup();
  const { root } = mountHome();
  await solveNow(root);
  buttonWithText(root, 'Undo').click();
  await tick();
  dom.flushFrames();
  assert.equal(actions.store.get().solves.length, 0);
  assert.ok(hasText(root, 'Start your streak today'));
  assert.ok(hasText(root, 'Linear Search'));
  assert.ok(!byClass(root, 'next2')[0].classList.contains('next2--done'));
});

test('home: messages show ABOVE the Next-up card, never on top of its buttons', async () => {
  await setup();
  const { root } = mountHome();
  buttonWithText(root, 'Skip').click();
  await tick();
  dom.flushFrames();
  const home = byClass(root, 'home')[0];
  const kinds = home.children.map((c) => (c.classList.contains('top-row') ? 'top' : c.classList.contains('home__scroll') ? 'scroll'
    : c.classList.contains('home__toast-anchor') ? 'anchor' : c.classList.contains('next2') ? 'card' : 'other'));
  assert.deepEqual(kinds, ['top', 'scroll', 'anchor', 'card']);
  const anchor = byClass(root, 'home__toast-anchor')[0];
  assert.ok(anchor.find((e) => e.tagName === 'button' && e.textContent === 'Undo'), 'Undo lives in the Home toast box');
  assert.ok(anchor.textContent.includes('Skipped #1'));
  // The shared bottom box was not used for this message.
  assert.equal(dom.body.find((e) => e.classList.contains('toasts') && !e.classList.contains('toasts--inline')), null);
  // Another redraw must not throw the message away.
  actions.store.set({ today: actions.store.get().today });
  dom.flushFrames();
  assert.ok(byClass(root, 'home__toast-anchor')[0].textContent.includes('Skipped #1'));
});

test('home: streak waiting for today shows the keep-your-streak message and a pulsing flame', async () => {
  await setup([solveOn(1, 2026, 6, 9)]);
  const { root } = mountHome();
  assert.ok(hasText(root, 'Solve 1 problem to keep your 1-day streak'));
  assert.ok(byClass(root, 'is-pulse').length >= 1);
  // Today is still open: the flame is dim (and the number with it), and Ember waits.
  const chip = byClass(root, 'streak-hero')[0];
  assert.ok(chip.classList.contains('is-dim'));
  assert.equal(byClass(chip, 'flame-art')[0].getAttribute('data-flame'), 'dim');
  assert.ok(byClass(chip, 'streak-hero__flame')[0].classList.contains('is-pulse'));
  assert.ok(byClass(root, 'ember-rig')[0].classList.contains('is-mood-wait'));
});

test('home: after a missed day the words are kind', async () => {
  await setup([solveOn(1, 2026, 6, 5)]);
  const { root } = mountHome();
  assert.ok(hasText(root, "Welcome back. Let's start a new streak"));
  assert.ok(!/miss|lost|fail/i.test(root.textContent.replace(/aria/g, '')));
});

test('home: solving two in a row works, the second is a blue bonus-round tap', async () => {
  await setup();
  const { root } = mountHome();
  await solveNow(root);
  goNext(root);
  const secondTitle = homeNext().problem.title;
  buttonWithText(root, 'Solved one more').click();
  await tick();
  dom.flushFrames();
  assert.equal(actions.store.get().solves.length, 2);
  const card = byClass(root, 'next2')[0];
  assert.ok(card.classList.contains('next2--done'));
  assert.ok(hasText(card, secondTitle));
  assert.deepEqual(byClass(card, 'reward-chip').map((c) => c.textContent.trim()), ['+10 XP']); // no second goal bonus
});

test('home: the info pills open a short explanation, and the goal can be changed there', async () => {
  await setup();
  const { root } = mountHome();
  byClass(root, 'pill--freeze')[0].click();
  assert.ok(hasText(dom.body, 'A freeze protects your streak if you miss a day.'));
  buttonWithText(dom.body, 'Got it').click();
  byClass(root, 'pill--xp')[0].click();
  assert.ok(hasText(dom.body, 'Every solved problem gives 10 XP.'));
  assert.equal(byClass(dom.body, 'level-bar').length, 1);
  buttonWithText(dom.body, 'Got it').click();
  byClass(root, 'pill--goal')[0].click();
  assert.ok(hasText(dom.body, 'Your goal never affects your streak.'));
  buttonWithText(dom.body, '2').click();
  await tick();
  dom.flushFrames();
  assert.equal(selectors.selectHome(actions.store.get()).daily.goal, 2);
  assert.ok(hasText(byClass(root, 'pill--goal')[0], '0/2'));
});

test('home: selectHome tells the card how far the section is', async () => {
  await setup();
  const sub = TOPICS[0].subsections[0];
  assert.deepEqual([homeNext().topicIndex, homeNext().subDone, homeNext().subTotal], [0, 0, sub.ids.length]);
  await actions.markSolved(1);
  assert.deepEqual([homeNext().subDone, homeNext().subTotal], [1, sub.ids.length]);
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

test('ember: one layered rig per call, with its own gradient ids and a label', () => {
  dom = installFakeDom();
  const a = createEmber();
  const b = createEmber({ label: 'Ember, waving' });
  assert.ok(a.classList.contains('ember-rig'));
  assert.equal(a.getAttribute('aria-label'), 'Ember');
  assert.equal(b.getAttribute('aria-label'), 'Ember, waving');
  const ids = (svg) => svg.findAll((e) => 'id' in e.attrs).map((e) => e.attrs.id);
  const idsA = ids(a);
  assert.ok(idsA.length > 10);
  assert.ok(ids(b).every((id) => !idsA.includes(id)), 'two Embers on one page must not share ids');
  // The parts the animations need.
  for (const part of ['ember-rig__float', 'ember-rig__act', 'ember-rig__face', 'ember-rig__hand--l', 'ember-rig__thumb']) {
    assert.equal(byClass(a, part).length, 1, part);
  }
  setEmberMood(a, 'wait');
  assert.ok(a.classList.contains('is-mood-wait'));
  setEmberMood(a, 'new');
  assert.ok(a.classList.contains('is-mood-new') && !a.classList.contains('is-mood-wait'));
  setEmberMood(a, null);
  assert.ok(![...['wait', 'new', 'happy']].some((m) => a.classList.contains(`is-mood-${m}`)));
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

test('home: the flame grows with the streak once today is solved, and is dim before', async () => {
  const stageOf = (root) => byClass(byClass(root, 'streak-hero')[0], 'flame-art')[0].getAttribute('data-flame');
  const dayBack = (back) => { const d = new Date(2026, 5, 10 - back); return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; };
  const run = (n) => Array.from({ length: n }, (_, i) => solveOn(i + 1, ...dayBack(i))); // n days ending today
  for (const [days, stage] of [[1, 'stage-1'], [6, 'stage-1'], [7, 'stage-2'], [13, 'stage-2'], [14, 'stage-3']]) {
    await setup(run(days));
    const { root } = mountHome();
    assert.equal(stageOf(root), stage, `${days} days, solved today`);
    assert.ok(!byClass(root, 'streak-hero')[0].classList.contains('is-dim'));
    dom.restore();
    mock.timers.reset();
  }
  // Same streak, but today not solved yet: dim.
  await setup(Array.from({ length: 10 }, (_, i) => solveOn(i + 1, ...dayBack(i + 1))));
  const { root } = mountHome();
  assert.equal(stageOf(root), 'dim');
  assert.ok(byClass(root, 'streak-hero')[0].classList.contains('is-dim'));
  assert.ok(hasText(byClass(root, 'streak-hero')[0], '10'));
  dom.restore();
  mock.timers.reset();
});

test('home: Ember is one element that survives redraws, with a face for each situation', async () => {
  await setup();
  const { root } = mountHome();
  const first = byClass(root, 'ember-rig')[0];
  assert.ok(first.classList.contains('is-mood-new'));      // brand new user
  assert.equal(byClass(root, 'ember').length, 0);           // the old mascot is gone
  actions.store.set({ today: actions.store.get().today });
  dom.flushFrames();
  assert.equal(byClass(root, 'ember-rig')[0], first, 'the same element is moved into the redrawn layout');
  assert.equal(byClass(root, 'ember-rig').length, 1);
});

test('home: finishing the daily goal makes Ember cheer once, then settle happy', async () => {
  await setup();
  const { root } = mountHome();
  solvedButton(root).click();
  await tick();
  dom.flushFrames();
  const rig = byClass(root, 'ember-rig')[0];
  assert.ok(rig.classList.contains('is-cheer'));
  // A redraw during the celebration leaves it alone.
  actions.store.set({ today: actions.store.get().today });
  dom.flushFrames();
  assert.ok(rig.classList.contains('is-cheer'));
  const act = rig.find((e) => e.classList.contains('ember-rig__act'));
  act.fire('animationend', { target: act, animationName: 'ember-cheer-act' });
  assert.ok(!rig.classList.contains('is-cheer'));
  assert.ok(rig.classList.contains('is-mood-happy'));
  // The ring shows a drawn check, not a symbol.
  assert.equal(byClass(byClass(root, 'ring__text--done')[0], 'icon--check').length, 1);
});

test('home: opening the app on a day already done shows the calm happy face, no celebration', async () => {
  await setup([solveOn(1, 2026, 6, 10)]);
  const { root } = mountHome();
  const rig = byClass(root, 'ember-rig')[0];
  assert.ok(rig.classList.contains('is-mood-happy'));
  assert.ok(!rig.classList.contains('is-cheer'));
});

test('home: Ember waves at most once per app open, not on every visit to Home', async () => {
  await setup();
  const waves = [];
  for (let i = 0; i < 3; i += 1) {
    const { root, unmount } = mountHome();
    waves.push(byClass(root, 'ember-rig')[0].classList.contains('is-wave'));
    unmount();
  }
  assert.ok(waves.filter(Boolean).length <= 1);
  assert.deepEqual(waves.slice(1), [false, false]);
});

// ---------- the big streak block and the merged week pill ----------

const dayBackFrom = (back) => { const d = new Date(2026, 5, 10 - back); return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; };
const runOf = (n, startBack = 0) => Array.from({ length: n }, (_, i) => solveOn(i + 1 + startBack * 100, ...dayBackFrom(i + startBack)));
const pills = (root) => byClass(root, 'week__run');

test('home: the big streak shows the number and "day streak", with the stage colour class', async () => {
  for (const [days, stage] of [[3, 'stage-1'], [8, 'stage-2'], [20, 'stage-3']]) {
    await setup(runOf(days));
    const { root } = mountHome();
    const hero = byClass(root, 'streak-hero')[0];
    assert.equal(byClass(hero, 'streak-hero__number')[0].textContent, String(days));
    assert.equal(byClass(hero, 'streak-hero__label')[0].textContent, 'day streak');
    assert.ok(hero.classList.contains(`streak-hero--${stage}`));
    assert.equal(hero.getAttribute('aria-label'), `${days}-day streak`);
    dom.restore();
    mock.timers.reset();
  }
});

test('home: sparks only fly from a lit flame of 7 days or more', async () => {
  const sparks = (root) => byClass(root, 'streak-hero__spark').length;
  await setup(runOf(3));
  assert.equal(sparks(mountHome().root), 0);
  dom.restore(); mock.timers.reset();
  await setup(runOf(7));
  assert.equal(sparks(mountHome().root), 3);
  dom.restore(); mock.timers.reset();
  await setup(runOf(10, 1)); // 10 days but today not solved yet: dim, no sparks
  assert.equal(sparks(mountHome().root), 0);
});

test('home: neighbouring solved days join into ONE pill, a gap makes a second pill', async () => {
  // today and the 2 days before are solved, 4 days back and 5 days back are solved (a gap at 3 days back)
  await setup([...runOf(3), solveOn(50, ...dayBackFrom(4)), solveOn(51, ...dayBackFrom(5))]);
  const { root } = mountHome();
  const found = pills(root);
  assert.equal(found.length, 2);
  // The bar is 7 slots with today in slot 5 (then 2 upcoming days): 4 days back is slot 1 (5 days back is off the bar),
  // and today with the 2 days before are slots 3-5.
  assert.deepEqual(found.map((p) => [p.style['--from'], p.style['--len']]), [['1', '1'], ['3', '3']]);
  assert.equal(byClass(root, 'day').length, 7);
  assert.equal(byClass(byClass(root, 'week')[0], 'icon--check').length, 4);
});

test('home: a frozen day is not part of the pill, and no solved days means no pill', async () => {
  await setup();
  assert.equal(pills(mountHome().root).length, 0);
  dom.restore(); mock.timers.reset();
  await setup([solveOn(1, ...dayBackFrom(0)), solveOn(2, ...dayBackFrom(2))]); // yesterday missed
  const { root } = mountHome();
  assert.equal(pills(root).length, 2);
  assert.ok(pills(root).every((p) => p.style['--len'] === '1'));
});

test('home: the pill that includes today grows in only right after a solve', async () => {
  await setup(runOf(2, 1)); // yesterday and the day before
  const { root } = mountHome();
  assert.ok(pills(root).every((p) => !p.classList.contains('is-fresh')));
  solvedButton(root).click();
  await tick();
  dom.flushFrames();
  assert.equal(pills(root).length, 1);
  assert.equal(pills(root)[0].style['--len'], '3');
  assert.ok(pills(root)[0].classList.contains('is-fresh'));
});

test('home: done days show drawn checks in the week strip and no emoji anywhere on the screen', async () => {
  await setup([solveOn(1, 2026, 6, 10), solveOn(2, 2026, 6, 9)]);
  const { root } = mountHome();
  assert.equal(byClass(byClass(root, 'week')[0], 'icon--check').length, 2);
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B50]/u.test(root.textContent), root.textContent);
});
