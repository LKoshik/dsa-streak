// Path screen logic: node states, zig-zag, banner text, scrolling. Pure code, no screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS } from '../src/core/catalog.js';
import { selectPath } from '../src/state/selectors.js';
import { zigzagOffset, nodeState, buildPathModel, bannerText, centeredScrollTop } from '../src/features/path/model.js';

const NOON = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
const stateWith = (ids, currentTopic = null) => ({
  today: '2026-06-10',
  solves: ids.map((problemId) => ({ problemId, day: '2026-06-10', at: NOON(2026, 6, 10) })),
  settings: { goalHistory: [{ from: '0000-00-00', goal: 1 }], currentTopic, theme: 'system' },
});
const modelFor = (ids, currentTopic) => buildPathModel(selectPath(stateWith(ids, currentTopic)));
const states = (model) => [...model.nodes.values()].map((n) => n.state);

test('zigzagOffset: a smooth wave that repeats, never -0', () => {
  const first = Array.from({ length: 8 }, (_, i) => zigzagOffset(i));
  assert.deepEqual(first, [0, 38, 64, 38, 0, -38, -64, -38]);
  assert.equal(zigzagOffset(8), 0);
  assert.equal(zigzagOffset(10), 64);
  assert.equal(Object.is(zigzagOffset(0), -0), false);
  assert.equal(Object.is(zigzagOffset(4), -0), false);
  assert.equal(zigzagOffset(2, 10), 10);
});

test('nodeState: done, current, progress, upcoming', () => {
  assert.equal(nodeState({ solved: 5, total: 5, isCurrent: false }), 'done');
  assert.equal(nodeState({ solved: 5, total: 5, isCurrent: true }), 'done');
  assert.equal(nodeState({ solved: 2, total: 5, isCurrent: true }), 'current');
  assert.equal(nodeState({ solved: 0, total: 5, isCurrent: true }), 'current');
  assert.equal(nodeState({ solved: 2, total: 5, isCurrent: false }), 'progress');
  assert.equal(nodeState({ solved: 0, total: 5, isCurrent: false }), 'upcoming');
});

test('model: 18 topics, 71 nodes, numbered, with a wave across all of them', () => {
  const model = modelFor([]);
  assert.equal(model.topics.length, 18);
  assert.equal(model.nodes.size, 71);
  assert.deepEqual(model.topics.map((t) => t.number), Array.from({ length: 18 }, (_, i) => i + 1));
  const offsets = [...model.nodes.values()].map((n) => n.offset);
  assert.equal(offsets[0], 0);
  assert.equal(offsets[2], 64);
  assert.equal(new Set([...model.nodes.keys()]).size, 71); // unique keys
});

test('model: a new user has exactly one current node, the very first one', () => {
  const model = modelFor([]);
  const s = states(model);
  assert.equal(s.filter((x) => x === 'current').length, 1);
  assert.equal(s.filter((x) => x === 'upcoming').length, 70);
  assert.equal(model.currentKey, 't0s0');
  assert.equal(model.nodes.get('t0s0').nextProblemId, 1);
});

test('model: bannerText follows the amendment wording', () => {
  const model = modelFor(TOPICS[2].ids.slice(0, 12), 'Binary Search');
  const topic = model.topics[2];
  assert.equal(bannerText(topic), 'TOPIC 3 · Binary Search · 12 of 32');
});

test('model: checking out of order keeps the current node and moves Next up correctly', () => {
  const sub = TOPICS[0].subsections[0].ids; // Arrays > Fundamentals (6)
  const model = modelFor([sub[3]]); // solve the 4th one first
  const node = model.nodes.get('t0s0');
  assert.equal(node.state, 'current');
  assert.equal(node.solved, 1);
  assert.equal(node.nextProblemId, sub[0]); // lowest unsolved is still the first
});

test('model: finishing a subsection moves the current node on', () => {
  const sub0 = TOPICS[0].subsections[0].ids;
  const model = modelFor(sub0);
  assert.equal(model.nodes.get('t0s0').state, 'done');
  assert.equal(model.currentKey, 't0s1');
  assert.equal(model.nodes.get('t0s1').state, 'current');
  assert.equal(model.nodes.get('t0s1').nextProblemId, TOPICS[0].subsections[1].ids[0]);
});

test('model: a later subsection can be in progress while an earlier one is the current node', () => {
  const sub2 = TOPICS[0].subsections[2].ids;
  const model = modelFor(sub2.slice(0, 3));
  assert.equal(model.nodes.get('t0s0').state, 'current');
  assert.equal(model.nodes.get('t0s2').state, 'progress');
  assert.equal(model.nodes.get('t0s1').state, 'upcoming');
});

test('model: finishing a topic marks it done and the current node moves to the next topic', () => {
  const model = modelFor(TOPICS[0].ids);
  assert.equal(model.topics[0].done, true);
  assert.ok(model.topics[0].nodes.every((n) => n.state === 'done'));
  assert.equal(model.currentKey, 't1s0');
  assert.equal(model.topics[1].isCurrent, true);
});

test('model: Continue here (currentTopic) moves the current node to that topic', () => {
  const model = modelFor([], 'Binary Search');
  assert.equal(model.currentKey, 't2s0');
  assert.equal(model.nodes.get('t0s0').state, 'upcoming');
  assert.equal(model.topics[2].isCurrent, true);
});

test('model: a partly solved earlier topic shows as in progress when another topic is current', () => {
  const model = modelFor([TOPICS[0].ids[0]], 'Binary Search');
  assert.equal(model.nodes.get('t0s0').state, 'progress');
  assert.equal(model.currentKey, 't2s0');
});

test('model: when everything is solved there is no current node', () => {
  const all = TOPICS.flatMap((t) => t.ids);
  const model = modelFor(all);
  assert.equal(model.currentKey, null);
  assert.ok(states(model).every((x) => x === 'done'));
  assert.ok(model.topics.every((t) => t.done));
});

test('model: unchecking brings the old node state back', () => {
  const sub0 = TOPICS[0].subsections[0].ids;
  const done = modelFor(sub0);
  const undone = modelFor(sub0.slice(0, -1));
  assert.equal(done.currentKey, 't0s1');
  assert.equal(undone.currentKey, 't0s0');
  assert.equal(undone.nodes.get('t0s0').nextProblemId, sub0[sub0.length - 1]);
});

test('centeredScrollTop: puts the node a little above the middle and never goes negative', () => {
  assert.equal(centeredScrollTop({ nodeTop: 700, nodeHeight: 60, viewHeight: 600, scrollTop: 0 }), 460);
  assert.equal(centeredScrollTop({ nodeTop: 700, nodeHeight: 60, viewHeight: 600, scrollTop: 100 }), 560);
  assert.equal(centeredScrollTop({ nodeTop: 50, nodeHeight: 60, viewHeight: 600, scrollTop: 0 }), 0);
});
