// Runs the real Path screen and bottom sheet against the pretend page.
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, hasText, byClass } from './helpers/fake-dom.js';
import { fakeStorage } from './helpers/fake-storage.js';
import * as actions from '../src/state/actions.js';
import * as selectors from '../src/state/selectors.js';
import { TOPICS, getProblem } from '../src/core/catalog.js';
import path from '../src/features/path/index.js';
import home from '../src/features/home/index.js';
import { features } from '../src/features/index.js';

const NOON = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
const tick = () => new Promise((resolve) => setImmediate(resolve));
const solve = (problemId, day = '2026-06-10') => ({ problemId, day, at: NOON(2026, 6, 10) });
const ctx = () => ({ store: actions.store, actions, selectors });

let dom;
let fake;
let unmounts = [];

async function setup({ solves = [], currentTopic = null } = {}) {
  mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOON(2026, 6, 10) });
  dom = installFakeDom();
  fake = fakeStorage();
  fake.solves = solves;
  fake.settings = { ...fake.settings, currentTopic };
  actions.useStorage(fake);
  await actions.init();
}

function mountPath() {
  const root = document.createElement('main');
  root.className = 'view';
  dom.body.append(root);
  const unmount = path.mount(root, ctx());
  unmounts.push(unmount);
  return { root, unmount };
}

afterEach(() => {
  for (const fn of unmounts) fn();
  unmounts = [];
  mock.timers.reset();
  dom.restore();
});

const nodes = (root) => byClass(root, 'node');
const nodeByKey = (root, key) => nodes(root).find((n) => n.dataset.key === key);
const nodeButton = (root, key) => nodeByKey(root, key).find((e) => e.tagName === 'button');
const sheetLayer = () => dom.body.find((e) => e.classList.contains('sheet-layer') && !e.classList.contains('is-leaving'));
const rows = () => (sheetLayer() ? byClass(sheetLayer(), 'prow') : []);
const footerContinue = (scope) => byClass(scope, 'sheet__footer').map((f) => f.find((e) => e.tagName === 'button' && e.textContent.trim() === 'Continue here')).find(Boolean) || null;
const buttonWithText = (scope, text) => scope.find((e) => e.tagName === 'button' && e.textContent.trim() === text);
async function settle() { await tick(); dom.flushFrames(); }
const next = () => selectors.selectHome(actions.store.get()).next;

test('path: classes for its own scrolling, 18 sticky topic banners, 71 nodes', async () => {
  await setup();
  const { root } = mountPath();
  assert.ok(root.classList.contains('view--fill'));
  assert.ok(root.classList.contains('view--path'));
  assert.equal(byClass(root, 'path').length, 1);
  const banners = byClass(root, 'topic-banner');
  assert.equal(banners.length, 18);
  assert.equal(banners[2].getAttribute('aria-label'), 'TOPIC 3 · Binary Search · 0 of 32');
  assert.ok(hasText(banners[0], 'TOPIC 1 · 0 of 32'));
  assert.ok(hasText(banners[0], 'Arrays'));
  assert.equal(nodes(root).length, 71);
  assert.ok(hasText(root, 'Fundamentals'));
});

test('path: nodes zig-zag with a sideways shift', async () => {
  await setup();
  const { root } = mountPath();
  const shifts = nodes(root).slice(0, 5).map((n) => n.style['--x']);
  assert.deepEqual(shifts, ['0px', '38px', '64px', '38px', '0px']);
});

test('path: a new user sees one pulsing START node and grey upcoming nodes', async () => {
  await setup();
  const { root } = mountPath();
  assert.equal(byClass(root, 'node--current').length, 1);
  assert.equal(byClass(root, 'node--upcoming').length, 70);
  assert.equal(byClass(root, 'node--done').length, 0);
  const bubble = byClass(root, 'node__bubble');
  assert.equal(bubble.length, 1);
  assert.equal(bubble[0].textContent, 'START');
  assert.ok(nodeByKey(root, 't0s0').classList.contains('node--current'));
});

test('path: done nodes have a check, in-progress nodes a ring with the count', async () => {
  const sub0 = TOPICS[0].subsections[0].ids;
  const sub2 = TOPICS[0].subsections[2].ids;
  await setup({ solves: [...sub0.map((id) => solve(id)), ...sub2.slice(0, 2).map((id) => solve(id))] });
  const { root } = mountPath();
  const done = nodeByKey(root, 't0s0');
  assert.ok(done.classList.contains('node--done'));
  assert.equal(byClass(nodeButton(root, 't0s0'), 'node__art').length, 1);
  assert.equal(byClass(nodeButton(root, 't0s0'), 'node__art')[0].children[0].getAttribute('href'), '#node-star');
  assert.equal(byClass(done, 'ring').length, 0);
  const progress = nodeByKey(root, 't0s2');
  assert.ok(progress.classList.contains('node--progress'));
  assert.ok(/2 of 15 solved, in progress/.test(nodeButton(root, 't0s2').getAttribute('aria-label')));
  assert.equal(byClass(progress, 'ring').length, 1);
  // The ring takes its colour from the topic (CSS), so the progress circle has no inline stroke.
  assert.equal(byClass(progress, 'ring__value')[0].style.stroke, undefined);
  assert.ok(nodeByKey(root, 't0s1').classList.contains('node--current'));
});

test('path: there are no links anywhere, not even inside the sheet', async () => {
  await setup();
  const { root } = mountPath();
  nodeButton(root, 't0s0').click();
  const anchors = (el) => el.findAll((e) => e.tagName === 'a' || ('href' in e.attrs && e.tagName !== 'use')); // <use href="#node-star"> only points inside the page
  assert.equal(anchors(root).length, 0);
  assert.equal(anchors(sheetLayer()).length, 0);
});

test('path: tapping a node opens the sheet with its problems as checkboxes', async () => {
  await setup();
  const { root } = mountPath();
  nodeButton(root, 't0s0').click();
  const layer = sheetLayer();
  assert.ok(layer);
  assert.ok(hasText(layer, 'TOPIC 1 · Arrays'));
  assert.ok(hasText(layer, 'Fundamentals'));
  assert.ok(hasText(layer, '0 of 6 solved'));
  assert.equal(rows().length, 6);
  assert.ok(rows().every((r) => r.getAttribute('role') === 'checkbox' && r.getAttribute('aria-checked') === 'false'));
  assert.ok(hasText(rows()[0], 'Linear Search'));
  assert.ok(hasText(rows()[0], '#1'));
  assert.ok(hasText(rows()[0], 'Next up'));
  assert.ok(!hasText(rows()[1], 'Next up'));
  // This node holds Next up: a note instead of the node's Continue here button, and no Continue here on that row.
  assert.ok(hasText(layer, 'Your Next up is here'));
  assert.equal(footerContinue(layer), null);
  assert.equal(byClass(layer, 'prow__go').length, 5); // every other problem has its own Continue here
});

test('path: Continue here on a node moves Next up to its first problem, closes the sheet and changes Home\'s Next up', async () => {
  await setup();
  const { root } = mountPath();
  assert.equal(next().topic, 'Arrays');
  nodeButton(root, 't2s0').click();
  const button = footerContinue(sheetLayer());
  assert.ok(button);
  button.click();
  await settle();
  assert.equal(actions.store.get().settings.currentTopic, 'Binary Search');
  assert.equal(fake.settings.currentTopic, 'Binary Search');
  assert.equal(fake.settings.currentProblemId, TOPICS[2].ids[0]);
  assert.equal(next().topic, 'Binary Search');
  assert.equal(next().problem.id, TOPICS[2].ids[0]);
  assert.equal(sheetLayer(), null);
  assert.ok(hasText(dom.body, 'Next up: Binary Search'));
  // The path moved the START bubble to the new topic.
  assert.ok(nodeByKey(root, 't2s0').classList.contains('node--current'));
  assert.ok(nodeByKey(root, 't0s0').classList.contains('node--upcoming'));
  // And the real Home screen shows it.
  const homeRoot = document.createElement('main');
  dom.body.append(homeRoot);
  const unmountHome = home.mount(homeRoot, ctx());
  assert.ok(hasText(homeRoot, 'Binary Search · Fundamentals'));
  assert.ok(hasText(homeRoot, getProblem(TOPICS[2].ids[0]).title));
  unmountHome();
});

test('path: checking a problem out of order works and Next up stays on the first unsolved one', async () => {
  await setup();
  const { root } = mountPath();
  nodeButton(root, 't0s0').click();
  rows()[3].click();
  await settle();
  assert.equal(actions.store.get().solves.length, 1);
  assert.equal(actions.store.get().solves[0].problemId, 4);
  assert.equal(fake.solves.length, 1);
  assert.equal(rows()[3].getAttribute('aria-checked'), 'true');
  assert.equal(rows()[0].getAttribute('aria-checked'), 'false');
  assert.ok(hasText(sheetLayer(), '1 of 6 solved'));
  assert.equal(next().problem.id, 1);
  assert.ok(hasText(rows()[0], 'Next up'));
  assert.ok(hasText(dom.body, '+5 daily goal reached'));
  assert.ok(hasText(sheetLayer(), '+10 XP'));
  assert.ok(byClass(root, 'node--current').length === 1);
});

test('path: finishing a subsection shows a message and moves Next up on', async () => {
  const sub0 = TOPICS[0].subsections[0].ids;
  await setup({ solves: sub0.slice(0, -1).map((id) => solve(id)) });
  const { root } = mountPath();
  nodeButton(root, 't0s0').click();
  assert.equal(next().problem.id, sub0[5]);
  rows()[5].click();
  await settle();
  assert.ok(hasText(dom.body, 'Section finished: Fundamentals'));
  assert.ok(!hasText(dom.body, 'Topic finished'));
  assert.equal(next().problem.id, TOPICS[0].subsections[1].ids[0]);
  assert.ok(nodeByKey(root, 't0s0').classList.contains('node--done'));
  assert.ok(nodeByKey(root, 't0s1').classList.contains('node--current'));
  assert.ok(hasText(sheetLayer(), 'All 6 solved'));
});

test('path: finishing a topic shows a message, a trophy, and Next up moves to another topic', async () => {
  const maths = TOPICS[17];
  await setup({ solves: maths.ids.slice(0, -1).map((id) => solve(id)), currentTopic: 'Maths' });
  const { root } = mountPath();
  nodeButton(root, 't17s0').click();
  rows()[2].click();
  await settle();
  assert.ok(hasText(dom.body, 'Topic finished: Maths'));
  assert.ok(!hasText(dom.body, 'Section finished'));
  assert.equal(next().topic, 'Arrays');
  assert.ok(byClass(root, 'topic')[17].classList.contains('topic--done'));
  assert.equal(byClass(byClass(root, 'topic-banner__badge')[17], 'icon--trophy').length, 1);
});

test('path: unchecking asks first; Keep it changes nothing', async () => {
  await setup({ solves: [solve(1)] });
  const { root } = mountPath();
  nodeButton(root, 't0s0').click();
  rows()[0].click();
  await settle();
  assert.ok(hasText(sheetLayer(), 'Uncheck #1 Linear Search?'));
  assert.equal(actions.store.get().solves.length, 1);
  buttonWithText(sheetLayer(), 'Keep it').click();
  await settle();
  assert.ok(!hasText(sheetLayer(), 'Uncheck #1'));
  assert.equal(actions.store.get().solves.length, 1);
  assert.equal(rows()[0].getAttribute('aria-checked'), 'true');
});

test('path: confirming an uncheck calls unmarkSolved and brings the problem back as Next up', async () => {
  const sub0 = TOPICS[0].subsections[0].ids;
  await setup({ solves: sub0.map((id) => solve(id)) });
  const { root } = mountPath();
  assert.equal(next().problem.id, TOPICS[0].subsections[1].ids[0]);
  nodeButton(root, 't0s0').click();
  rows()[2].click();
  await settle();
  assert.equal(actions.store.get().solves.length, 6); // still there until confirmed
  buttonWithText(sheetLayer(), 'Uncheck').click();
  await settle();
  assert.equal(actions.store.get().solves.length, 5);
  assert.equal(fake.solves.length, 5);
  assert.equal(next().problem.id, sub0[2]);
  assert.equal(rows()[2].getAttribute('aria-checked'), 'false');
  assert.ok(hasText(dom.body, 'Unchecked #' + sub0[2]));
  assert.ok(nodeByKey(root, 't0s0').classList.contains('node--current'));
  assert.ok(nodeByKey(root, 't0s1').classList.contains('node--upcoming'));
  assert.ok(!hasText(sheetLayer(), 'It will count as not solved'));
});

test('path: tapping the same solved row again cancels the question', async () => {
  await setup({ solves: [solve(1)] });
  const { root } = mountPath();
  nodeButton(root, 't0s0').click();
  rows()[0].click();
  await settle();
  assert.ok(rows()[0].classList.contains('is-confirming'));
  rows()[0].click();
  await settle();
  assert.ok(!rows()[0].classList.contains('is-confirming'));
  assert.equal(actions.store.get().solves.length, 1);
});

test('path: a problem undone elsewhere clears a pending question', async () => {
  await setup({ solves: [solve(1)] });
  const { root } = mountPath();
  nodeButton(root, 't0s0').click();
  rows()[0].click();
  await settle();
  await actions.unmarkSolved(1); // for example Undo on the Home screen
  await settle();
  assert.ok(!hasText(sheetLayer(), 'It will count as not solved'));
  assert.equal(rows()[0].getAttribute('aria-checked'), 'false');
});

test('path: when saving fails a message shows and nothing changes', async () => {
  await setup();
  const { root } = mountPath();
  nodeButton(root, 't0s0').click();
  fake.failWrites = true;
  const errors = mock.method(console, 'error', () => {});
  rows()[0].click();
  await settle();
  assert.equal(actions.store.get().solves.length, 0);
  assert.equal(rows()[0].getAttribute('aria-checked'), 'false');
  assert.ok(hasText(dom.body, 'Could not save'));
  errors.mock.restore();
});

test('path: a double tap on a checkbox saves once', async () => {
  await setup();
  const { root } = mountPath();
  nodeButton(root, 't0s0').click();
  const row = rows()[0];
  row.click();
  row.click();
  await settle();
  assert.equal(actions.store.get().solves.length, 1);
});

test('path: the sheet closes with Escape or the dark background and the node gets focus back', async () => {
  await setup();
  const { root } = mountPath();
  nodeButton(root, 't0s0').click();
  assert.ok(sheetLayer());
  dom.pressKey('Escape');
  assert.equal(sheetLayer(), null);
  assert.equal(document.activeElement, nodeButton(root, 't0s0'));
  nodeButton(root, 't1s0').click();
  byClass(dom.body, 'sheet-backdrop').pop().click();
  assert.equal(sheetLayer(), null);
});

test('path: the first draw scrolls to the current node, Continue here scrolls smoothly', async () => {
  await setup();
  const proto = Object.getPrototypeOf(dom.body);
  const scrolls = [];
  Object.defineProperty(proto, 'clientHeight', { configurable: true, get() { return 600; } });
  proto.getBoundingClientRect = function getBoundingClientRect() {
    return this.classList.contains('node__btn') ? { top: 1000, height: 62 } : { top: 0, height: 600 };
  };
  proto.scrollTo = function scrollTo(options) { scrolls.push(options); };
  try {
    const { root } = mountPath();
    dom.flushFrames();
    assert.deepEqual(scrolls, [{ top: 761, behavior: 'auto' }]);
    nodeButton(root, 't2s0').click();
    buttonWithText(sheetLayer(), 'Continue here').click();
    await settle();
    assert.equal(scrolls.length, 2);
    assert.equal(scrolls[1].behavior, 'smooth');
    // Checking a problem redraws the path but does not yank the scroll position.
    nodeButton(root, 't2s0').click();
    rows()[0].click();
    await settle();
    assert.equal(scrolls.length, 2);
  } finally {
    delete proto.clientHeight;
    delete proto.getBoundingClientRect;
    delete proto.scrollTo;
  }
});

test('path: the screen keeps its scroll position when it redraws', async () => {
  await setup();
  const { root } = mountPath();
  const scroller = byClass(root, 'path')[0];
  scroller.scrollTop = 500;
  nodeButton(root, 't0s0').click();
  rows()[0].click();
  await settle();
  assert.equal(scroller.scrollTop, 500);
});

test('path: when everything is solved nothing is current and the end shows a finished message', async () => {
  const { PROBLEMS } = await import('../src/core/problems.data.js');
  await setup({ solves: PROBLEMS.map((p) => solve(p.id)) });
  const { root } = mountPath();
  assert.equal(byClass(root, 'node--current').length, 0);
  assert.equal(byClass(root, 'node--done').length, 71);
  assert.ok(hasText(root, 'You finished the whole path'));
  assert.equal(byClass(root, 'topic--done').length, 18);
});

test('path: unmount closes the sheet, removes its classes and stops listening', async () => {
  await setup();
  const { root, unmount } = mountPath();
  nodeButton(root, 't0s0').click();
  assert.ok(sheetLayer());
  unmount();
  unmounts = [];
  assert.equal(sheetLayer(), null);
  assert.ok(!root.classList.contains('view--fill'));
  assert.ok(!root.classList.contains('view--path'));
  assert.ok(!dom.body.classList.contains('has-sheet'));
  actions.store.set({ today: '2026-06-11' });
  dom.flushFrames(); // nothing redraws, nothing throws
});

test('path: the Path tab is still the second tab', () => {
  assert.deepEqual(features.map((f) => f.id), ['home', 'path', 'stats', 'settings']);
  assert.equal(path.label, 'Path');
});

test('path: topics wear five colours in order, with one shared node sprite', async () => {
  await setup();
  const { root } = mountPath();
  const topics = byClass(root, 'topic');
  const hues = ['green', 'purple', 'teal', 'pink', 'blue'];
  topics.forEach((t, i) => assert.ok(t.classList.contains(`topic--${hues[i % 5]}`), `topic ${i + 1}`));
  assert.equal(byClass(root, 'node-sprite').length, 1);
  // Not explored yet: the upcoming shape. The current node uses the star.
  assert.equal(byClass(nodeButton(root, 't0s0'), 'node__art')[0].children[0].getAttribute('href'), '#node-star');
  assert.equal(byClass(nodeButton(root, 't0s1'), 'node__art')[0].children[0].getAttribute('href'), '#node-upcoming');
});

test('path: the bottom sheet wears the colour of its topic and uses drawn icons', async () => {
  await setup({ solves: [solve(1)] });
  const { root } = mountPath();
  nodeButton(root, 't1s0').click(); // Hashing = topic 2 = purple
  const purple = sheetLayer().find((e) => e.classList.contains('sheet'));
  assert.ok(purple.classList.contains('sheet--purple'));
  sheetLayer().find((e) => e.classList.contains('sheet__close')).click();
  nodeButton(root, 't0s0').click(); // Arrays = topic 1 = green
  const green = sheetLayer().find((e) => e.classList.contains('sheet'));
  assert.ok(green.classList.contains('sheet--green'));
  const box = byClass(sheetLayer(), 'prow__box')[0]; // problem 1 is solved
  assert.equal(byClass(box, 'icon--check').length, 1);
  assert.equal(byClass(byClass(sheetLayer(), 'sheet__note')[0], 'icon--check').length, 1); // Arrays is the current topic
});

test('path: the ring is split into one arc per 5 problems of that subsection', async () => {
  const sub2 = TOPICS[0].subsections[2].ids; // 15 problems -> 3 arcs
  await setup({ solves: sub2.slice(0, 7).map((id) => solve(id)) });
  const { root } = mountPath();
  const ring = byClass(nodeByKey(root, 't0s2'), 'ring')[0];
  assert.ok(ring.classList.contains('ring--segments'));
  assert.equal(byClass(ring, 'ring__track').length, 3);
  assert.equal(byClass(ring, 'ring__value').length, 2); // 5 solved = arc 1 full, 2 solved = part of arc 2
  // The node and its ring live in the same 96 px stage, so they share one centre.
  assert.equal(ring.parent.classList.contains('node__stage'), true);
  assert.equal(ring.parent.children.includes(nodeButton(root, 't0s2')), true);
});
