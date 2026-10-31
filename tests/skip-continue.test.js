// Skip + "Continue here" on any node / any problem: the rules, the actions, and the Home and Path screens.
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, hasText, byClass } from './helpers/fake-dom.js';
import { fakeStorage } from './helpers/fake-storage.js';
import * as actions from '../src/state/actions.js';
import * as selectors from '../src/state/selectors.js';
import { TOPICS, getProblem } from '../src/core/catalog.js';
import { findNext } from '../src/core/next.js';
import { continueTargetFor } from '../src/features/path/model.js';
import path from '../src/features/path/index.js';
import home from '../src/features/home/index.js';

const NOON = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
const tick = () => new Promise((resolve) => setImmediate(resolve));
const solve = (problemId) => ({ problemId, day: '2026-06-10', at: NOON(2026, 6, 10) });
const ctx = () => ({ store: actions.store, actions, selectors });
const nextId = () => selectors.selectHome(actions.store.get()).next?.problem.id ?? null;
const A = TOPICS[0].subsections[0].ids; // Arrays > Fundamentals (6 problems)
const B = TOPICS[0].subsections[1].ids;

let dom;
let fake;
const unmounts = [];

async function setup({ solves = [], settings = {} } = {}) {
  mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOON(2026, 6, 10) });
  dom = installFakeDom();
  fake = fakeStorage();
  fake.solves = solves;
  fake.settings = { ...fake.settings, ...settings };
  actions.useStorage(fake);
  await actions.init();
}
afterEach(() => {
  while (unmounts.length) unmounts.pop()();
  mock.timers.reset();
  if (dom) dom.restore();
  dom = null;
});
async function settle() { await tick(); dom.flushFrames(); }
function mountScreen(screen) {
  const root = document.createElement('main');
  root.className = 'view';
  dom.body.append(root);
  unmounts.push(screen.mount(root, ctx()));
  return root;
}
const buttonWithText = (scope, text) => scope.find((e) => e.tagName === 'button' && e.textContent.trim() === text) || null;
const sheetLayer = () => dom.body.find((e) => e.classList.contains('sheet-layer') && !e.classList.contains('is-leaving'));
const nodeButton = (root, key) => byClass(root, 'node').find((n) => n.dataset.key === key).find((e) => e.tagName === 'button');
const footerContinue = (layer) => byClass(layer, 'sheet__footer').map((f) => buttonWithText(f, 'Continue here')).find(Boolean) || null;

// ---------- the rule (findNext) ----------

const T = [{ name: 'A', ids: [1, 2, 3] }, { name: 'B', ids: [4, 5, 6] }];

test('findNext: starts at the pointer problem, then walks forward and wraps', () => {
  assert.equal(findNext(T, new Set(), null, { currentProblemId: 5 }).problemId, 5);
  assert.equal(findNext(T, new Set([5]), null, { currentProblemId: 5 }).problemId, 6);
  assert.equal(findNext(T, new Set([5, 6]), null, { currentProblemId: 5 }).problemId, 1); // wraps to the start
  assert.deepEqual(findNext(T, new Set(), null, { currentProblemId: 5 }), { topic: 'B', problemId: 5 });
});

test('findNext: skipped problems are passed over, and never come back by themselves', () => {
  assert.equal(findNext(T, new Set(), null, { skippedIds: [1] }).problemId, 2);
  assert.equal(findNext(T, new Set([2, 3, 4, 5]), null, { skippedIds: [1, 6] }), null); // only skipped ones left
  assert.equal(findNext(T, new Set([2, 3, 4, 5]), null, { skippedIds: new Set([1]) }).problemId, 6);
});

test('findNext: an unknown pointer falls back to the topic, then to the start', () => {
  assert.equal(findNext(T, new Set(), 'B', { currentProblemId: 999 }).problemId, 4);
  assert.equal(findNext(T, new Set(), null, { currentProblemId: 999 }).problemId, 1);
  assert.equal(findNext(T, new Set(), 'B').problemId, 4); // old call shape still works
});

// ---------- the actions ----------

test('skipProblem: stays unsolved, Next up moves on, nothing is solved or counted', async () => {
  await setup();
  assert.equal(nextId(), A[0]);
  assert.equal(await actions.skipProblem(A[0]), true);
  assert.equal(nextId(), A[1]);
  assert.deepEqual(fake.settings.skippedIds, [A[0]]);
  assert.equal(actions.store.get().solves.length, 0);
  assert.equal(selectors.selectHome(actions.store.get()).solvedCount, 0);
  assert.equal(selectors.selectHome(actions.store.get()).streak, 0);
});

test('skipProblem: skipping twice in a row keeps going; unknown and solved problems are ignored', async () => {
  await setup({ solves: [solve(A[2])] });
  await actions.skipProblem(A[0]);
  await actions.skipProblem(A[1]);
  assert.equal(nextId(), A[3]);
  assert.equal(await actions.skipProblem(99999), false);
  assert.equal(await actions.skipProblem(A[2]), false); // already solved
  assert.deepEqual(actions.store.get().settings.skippedIds, [A[0], A[1]]);
});

test('unskipProblem (the Undo of Skip) puts the problem straight back as Next up', async () => {
  await setup();
  await actions.skipProblem(A[0]);
  assert.equal(await actions.unskipProblem(A[0]), true);
  assert.equal(nextId(), A[0]);
  assert.equal(await actions.unskipProblem(A[0]), false);
});

test('continueFrom: Next up starts at that exact problem; a skipped problem is brought back', async () => {
  await setup();
  await actions.skipProblem(B[1]);
  assert.equal(await actions.continueFrom(B[1]), true);
  assert.equal(nextId(), B[1]);
  assert.deepEqual(actions.store.get().settings.skippedIds, []);
  assert.equal(fake.settings.currentProblemId, B[1]);
  assert.equal(await actions.continueFrom(99999), false);
  assert.equal(nextId(), B[1]);
});

test('continueFrom a solved problem carries on after it', async () => {
  await setup({ solves: [solve(A[0]), solve(A[1])] });
  await actions.continueFrom(A[0]);
  assert.equal(nextId(), A[2]);
});

test('solving a skipped problem takes it off the skipped list', async () => {
  await setup();
  await actions.skipProblem(A[0]);
  await actions.markSolved(A[0]);
  assert.deepEqual(actions.store.get().settings.skippedIds, []);
  assert.deepEqual(fake.settings.skippedIds, []);
});

test('continueTargetFor: first open problem, or the last one when nothing is open', () => {
  const p = (id, solved, skipped = false) => ({ id, solved, skipped });
  assert.equal(continueTargetFor({ problems: [p(1, true), p(2, false, true), p(3, false)] }), 3);
  assert.equal(continueTargetFor({ problems: [p(1, true), p(2, true)] }), 2);
  assert.equal(continueTargetFor({ problems: [p(1, true), p(2, false, true)] }), 2);
  assert.equal(continueTargetFor({ problems: [] }), null);
});

// ---------- Home ----------

test('home: Skip button moves to the next problem and shows an Undo', async () => {
  await setup();
  const root = mountScreen(home);
  assert.ok(hasText(root, 'Linear Search'));
  const skip = buttonWithText(root, 'Skip');
  assert.ok(skip);
  skip.click();
  await settle();
  assert.equal(nextId(), A[1]);
  assert.ok(!hasText(root, 'Linear Search'));
  assert.ok(hasText(dom.body, `Skipped #${A[0]}`));
  assert.ok(hasText(root, getProblem(A[1]).title));
  buttonWithText(dom.body, 'Undo').click();
  await settle();
  assert.equal(nextId(), A[0]);
  assert.ok(hasText(root, 'Linear Search'));
});

test('home: when only skipped problems are left it says so (not "all done")', async () => {
  const all = TOPICS.flatMap((t) => t.ids);
  await setup({ solves: all.slice(1).map(solve), settings: { skippedIds: [all[0]] } });
  const root = mountScreen(home);
  assert.ok(hasText(root, 'Only 1 skipped problem left'));
  assert.ok(!hasText(root, 'problems done'));
  assert.equal(buttonWithText(root, 'Skip'), null);
});

// ---------- Path ----------

test('path: Continue here on a problem row moves Next up there, and Home shows the same problem', async () => {
  await setup();
  const root = mountScreen(path);
  nodeButton(root, 't0s0').click();
  const go = byClass(sheetLayer(), 'prow__go');
  assert.equal(go.length, 5);
  go[2].click(); // the 4th problem of the node (the first row is the Next up one and has no button)
  await settle();
  assert.equal(nextId(), A[3]);
  assert.equal(sheetLayer(), null);
  assert.ok(hasText(dom.body, `Next up: Arrays · #${A[3]}`));
  const homeRoot = mountScreen(home);
  assert.ok(hasText(homeRoot, getProblem(A[3]).title));
});

test('path: a problem in a later node can be continued from, and that node becomes the current one', async () => {
  await setup();
  const root = mountScreen(path);
  nodeButton(root, 't0s1').click();
  byClass(sheetLayer(), 'prow__go')[1].click(); // second row of the second node: first row is not Next up here, so all 5-6 rows have buttons
  await settle();
  assert.equal(nextId(), B[1]);
  assert.ok(byClass(root, 'node').find((n) => n.dataset.key === 't0s1').classList.contains('node--current'));
  assert.ok(byClass(root, 'node').find((n) => n.dataset.key === 't0s0').classList.contains('node--progress') ||
    byClass(root, 'node').find((n) => n.dataset.key === 't0s0').classList.contains('node--upcoming'));
  assert.equal(byClass(root, 'node--current').length, 1);
});

test('path: Continue here on a node starts at its first open problem and skips over skipped ones', async () => {
  await setup({ solves: [solve(B[0])], settings: { skippedIds: [B[1]] } });
  const root = mountScreen(path);
  nodeButton(root, 't0s1').click();
  footerContinue(sheetLayer()).click();
  await settle();
  assert.equal(nextId(), B[2]);
});

test('path: a skipped problem has a Skipped tag, is passed over, and comes back only via its own Continue here', async () => {
  await setup({ settings: { skippedIds: [A[0]] } });
  const root = mountScreen(path);
  assert.equal(nextId(), A[1]);
  nodeButton(root, 't0s0').click();
  const rows = byClass(sheetLayer(), 'prow');
  assert.ok(hasText(rows[0], 'Skipped'));
  assert.ok(!hasText(rows[1], 'Skipped'));
  assert.ok(hasText(rows[1], 'Next up'));
  byClass(sheetLayer(), 'prow__go')[0].click(); // the skipped problem's own Continue here
  await settle();
  assert.equal(nextId(), A[0]);
  assert.deepEqual(actions.store.get().settings.skippedIds, []);
});

test('path: the current node follows Next up, so skipping the last problem of a node moves the START bubble on', async () => {
  await setup({ solves: A.slice(0, 5).map(solve) });
  const root = mountScreen(path);
  assert.ok(byClass(root, 'node').find((n) => n.dataset.key === 't0s0').classList.contains('node--current'));
  await actions.skipProblem(A[5]);
  await settle();
  assert.ok(byClass(root, 'node').find((n) => n.dataset.key === 't0s1').classList.contains('node--current'));
});
