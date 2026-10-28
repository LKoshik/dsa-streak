import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRewards } from '../src/features/home/rewards.js';
import { TOPICS, getProblem } from '../src/core/catalog.js';

const xp = (level) => ({ total: 0, level, xpIntoLevel: 0, xpForNext: 100, fraction: 0 });
const snap = (patch = {}) => ({
  streak: 3, freezes: 0, daily: { done: 1, goal: 1, met: true }, xp: xp(1), ...patch,
});
const run = (before, after, id, solved = [id]) =>
  computeRewards({ before, after, problem: getProblem(id), solvedIds: new Set(solved) });

test('a normal extra solve gives no messages', () => {
  const r = run(snap(), snap({ daily: { done: 2, goal: 1, met: true } }), 5);
  assert.deepEqual(r, { messages: [], cheer: false });
});

test('reaching the daily goal', () => {
  const r = run(snap({ daily: { done: 0, goal: 1, met: false } }), snap(), 5);
  assert.deepEqual(r.messages, ['🎯 +5 daily goal reached']);
});

test('the very first solve starts a streak', () => {
  const r = run(snap({ streak: 0, daily: { done: 0, goal: 2, met: false } }), snap({ streak: 1, daily: { done: 1, goal: 2, met: false } }), 1);
  assert.deepEqual(r.messages, ['🔥 Streak started']);
  assert.equal(r.cheer, false);
});

test('freeze earned when the streak reaches 7', () => {
  const r = run(snap({ streak: 6, freezes: 0, daily: { done: 0, goal: 1, met: false } }), snap({ streak: 7, freezes: 1 }), 5);
  assert.deepEqual(r.messages, ['🎯 +5 daily goal reached', '❄️ Freeze earned']);
  assert.equal(r.cheer, true);
});

test('7-day milestone when both freezes were already full', () => {
  const r = run(snap({ streak: 20, freezes: 2, daily: { done: 0, goal: 1, met: false } }), snap({ streak: 21, freezes: 2 }), 5);
  assert.ok(r.messages.includes('🔥 21-day streak'));
  assert.equal(r.cheer, true);
});

test('level up', () => {
  const r = run(snap(), snap({ xp: xp(2) }), 5);
  assert.deepEqual(r.messages, ['⭐ Level 2']);
  assert.equal(r.cheer, true);
});

test('finishing a subsection (not the whole topic)', () => {
  const sub = TOPICS[0].subsections[0];
  const r = run(snap(), snap(), sub.ids[sub.ids.length - 1], sub.ids);
  assert.deepEqual(r.messages, [`✅ Section finished: ${sub.name}`]);
  assert.equal(r.cheer, false);
});

test('finishing a topic replaces the section message and cheers', () => {
  const topic = TOPICS.find((t) => t.name === 'Hashing');
  const r = run(snap(), snap(), topic.ids[topic.ids.length - 1], topic.ids);
  assert.deepEqual(r.messages, ['🏆 Topic finished: Hashing']);
  assert.equal(r.cheer, true);
});

test('several rewards at once keep a sensible order', () => {
  const sub = TOPICS[0].subsections[0];
  const r = run(
    snap({ streak: 6, daily: { done: 0, goal: 1, met: false } }),
    snap({ streak: 7, freezes: 1, xp: xp(2) }),
    sub.ids[sub.ids.length - 1], sub.ids);
  assert.deepEqual(r.messages, ['🎯 +5 daily goal reached', '❄️ Freeze earned', '⭐ Level 2', `✅ Section finished: ${sub.name}`]);
});
