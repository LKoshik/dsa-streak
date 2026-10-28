import test from 'node:test';
import assert from 'node:assert/strict';
import { soundForSolve } from '../src/core/sound-events.js';
import { TOPICS, getProblem } from '../src/core/catalog.js';

const xp = (level) => ({ total: 0, level, xpIntoLevel: 0, xpForNext: 100, fraction: 0 });
const snap = (patch = {}) => ({
  streak: 3, freezes: 0, daily: { done: 1, goal: 1, met: true }, xp: xp(1), ...patch,
});
const pick = (before, after, id, solved = [id]) =>
  soundForSolve({ before, after, problem: getProblem(id), solvedIds: new Set(solved) });

test('a normal solve plays the small "solve" sound', () => {
  assert.equal(pick(snap(), snap({ daily: { done: 2, goal: 1, met: true } }), 5), 'solve');
});

test('reaching the daily goal plays goalMet', () => {
  assert.equal(pick(snap({ daily: { done: 0, goal: 1, met: false } }), snap(), 5), 'goalMet');
});

test('the first streak day plays streakStart', () => {
  const before = snap({ streak: 0, daily: { done: 0, goal: 2, met: false } });
  const after = snap({ streak: 1, daily: { done: 1, goal: 2, met: false } });
  assert.equal(pick(before, after, 1), 'streakStart');
});

test('a freeze earned beats the goal sound', () => {
  const before = snap({ streak: 6, freezes: 0, daily: { done: 0, goal: 1, met: false } });
  assert.equal(pick(before, snap({ streak: 7, freezes: 1 }), 5), 'freeze');
});

test('a 7-day milestone with full freezes plays milestone', () => {
  const before = snap({ streak: 20, freezes: 2 });
  assert.equal(pick(before, snap({ streak: 21, freezes: 2 }), 5), 'milestone');
});

test('a new level plays levelUp', () => {
  assert.equal(pick(snap(), snap({ xp: xp(2) }), 5), 'levelUp');
});

test('finishing a section plays section, and a level up still beats it', () => {
  const topic = TOPICS.find((t) => t.subsections.length > 1);
  const sub = topic.subsections[0];
  const id = sub.ids[sub.ids.length - 1];
  assert.equal(pick(snap(), snap(), id, sub.ids), 'section');
  assert.equal(pick(snap(), snap({ xp: xp(2) }), id, sub.ids), 'levelUp');
});

test('finishing a whole topic plays topicDone, the biggest sound', () => {
  const topic = TOPICS[0];
  const id = topic.ids[topic.ids.length - 1];
  const before = snap({ daily: { done: 0, goal: 1, met: false } });
  assert.equal(pick(before, snap({ xp: xp(2) }), id, topic.ids), 'topicDone');
});
