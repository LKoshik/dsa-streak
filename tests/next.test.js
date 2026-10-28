// Next-problem tests with small fake topics (no real catalog needed).
import test from 'node:test';
import assert from 'node:assert/strict';
import { findNext, topicProgress } from '../src/core/next.js';

// Topic A has ids 1-3, B has 4-6, C has 7-9.
const topic = (name, ids) => ({ name, ids, subsections: [{ name: `${name} part`, ids }] });
const TOPICS = [topic('A', [1, 2, 3]), topic('B', [4, 5, 6]), topic('C', [7, 8, 9])];
const set = (...ids) => new Set(ids);

test('1. nothing solved, currentTopic null: first problem of A', () => {
  assert.deepEqual(findNext(TOPICS, set(), null), { topic: 'A', problemId: 1 });
});

test('2. currentTopic B gives the first problem of B; unknown name acts like null', () => {
  assert.deepEqual(findNext(TOPICS, set(), 'B'), { topic: 'B', problemId: 4 });
  assert.deepEqual(findNext(TOPICS, set(), 'Nope'), { topic: 'A', problemId: 1 });
  assert.deepEqual(findNext(TOPICS, set(), undefined), { topic: 'A', problemId: 1 });
});

test('3. solved out of order: the lowest unsolved id comes first', () => {
  assert.deepEqual(findNext(TOPICS, set(2), null), { topic: 'A', problemId: 1 });
  assert.deepEqual(findNext(TOPICS, set(1, 3), null), { topic: 'A', problemId: 2 });
});

test('4a. current topic finished: next is the first unsolved of the following topic', () => {
  assert.deepEqual(findNext(TOPICS, set(1, 2, 3), 'A'), { topic: 'B', problemId: 4 });
  assert.deepEqual(findNext(TOPICS, set(1, 2, 3, 4), 'A'), { topic: 'B', problemId: 5 });
});

test('4b. a finished topic in the middle is skipped', () => {
  assert.deepEqual(findNext(TOPICS, set(1, 2, 3, 4, 5, 6), 'A'), { topic: 'C', problemId: 7 });
  assert.deepEqual(findNext(TOPICS, set(4, 5, 6), 'B'), { topic: 'C', problemId: 7 });
  assert.deepEqual(findNext(TOPICS, set(4, 5, 6, 7, 8, 9), 'B'), { topic: 'A', problemId: 1 });
});

test('4c. last topic finished: wraps to the first topic that still has an unsolved problem', () => {
  assert.deepEqual(findNext(TOPICS, set(7, 8, 9), 'C'), { topic: 'A', problemId: 1 });
  assert.deepEqual(findNext(TOPICS, set(1, 2, 3, 7, 8, 9), 'C'), { topic: 'B', problemId: 4 });
});

test('4d. current topic keeps being used while it has unsolved problems', () => {
  assert.deepEqual(findNext(TOPICS, set(1, 2, 3, 4), 'B'), { topic: 'B', problemId: 5 });
});

test('5. everything solved: null', () => {
  assert.equal(findNext(TOPICS, set(1, 2, 3, 4, 5, 6, 7, 8, 9), 'B'), null);
  assert.equal(findNext(TOPICS, set(1, 2, 3, 4, 5, 6, 7, 8, 9), null), null);
});

test('5b. no topics at all: null', () => {
  assert.equal(findNext([], set(), null), null);
});

test('6. undoing a solve in a finished topic returns to that topic', () => {
  const all = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(findNext(TOPICS, new Set(all.slice(0, 3)), 'A'), { topic: 'B', problemId: 4 });
  // Undo problem 2 of A: A has an unsolved problem again.
  assert.deepEqual(findNext(TOPICS, set(1, 3), 'A'), { topic: 'A', problemId: 2 });
});

test('7. topicProgress gives solved, total and done', () => {
  assert.deepEqual(topicProgress(TOPICS, set(1, 2, 3, 4)), [
    { topic: 'A', solved: 3, total: 3, done: true },
    { topic: 'B', solved: 1, total: 3, done: false },
    { topic: 'C', solved: 0, total: 3, done: false },
  ]);
  assert.deepEqual(topicProgress([], set()), []);
});

test('ids from other topics in solvedIds are ignored by topicProgress', () => {
  assert.deepEqual(topicProgress([topic('A', [1, 2])], set(1, 99))[0], { topic: 'A', solved: 1, total: 2, done: false });
});

test('findNext does not change its inputs', () => {
  const solved = set(1, 2);
  const before = JSON.stringify(TOPICS);
  findNext(TOPICS, solved, 'A');
  assert.equal(JSON.stringify(TOPICS), before);
  assert.deepEqual([...solved], [1, 2]);
});
