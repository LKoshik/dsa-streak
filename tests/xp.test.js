// XP tests. day(n) is the date n days after 2026-01-01.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  goalForDay, withGoalChange, solvesPerDay, computeXp, levelFromXp, dailyProgress,
} from '../src/core/xp.js';
import { addDays } from '../src/core/dates.js';

const day = (n) => addDays('2026-01-01', n);
const START = { from: '0000-01-01', goal: 1 };
const solve = (problemId, d) => ({ problemId, day: d, at: 0 });

test('1. three solves: two on day A, one on day B', () => {
  const solves = [solve(1, day(1)), solve(2, day(1)), solve(3, day(2))];
  assert.deepEqual(computeXp(solves, [START]), { total: 40, solveXp: 30, bonusXp: 10, bonusDays: 2 });
  const goal2 = [{ from: '0000-01-01', goal: 2 }];
  assert.deepEqual(computeXp(solves, goal2), { total: 35, solveXp: 30, bonusXp: 5, bonusDays: 1 });
});

test('2. solves beyond the goal give the +5 only once per day', () => {
  const solves = [1, 2, 3, 4, 5].map((n) => solve(n, day(1)));
  assert.deepEqual(computeXp(solves, [START]), { total: 55, solveXp: 50, bonusXp: 5, bonusDays: 1 });
});

test('3. goal history: past days keep their old goal', () => {
  const history = [START, { from: day(3), goal: 3 }];
  // Day 1: one solve, goal 1 -> bonus. Day 3: two solves, goal 3 -> no bonus.
  const solves = [solve(1, day(1)), solve(2, day(3)), solve(3, day(3))];
  assert.deepEqual(computeXp(solves, history), { total: 35, solveXp: 30, bonusXp: 5, bonusDays: 1 });
  assert.equal(goalForDay(history, day(2)), 1);
  assert.equal(goalForDay(history, day(3)), 3);
  assert.equal(goalForDay(history, day(9)), 3);
});

test('4. undo removes a bonus it had created', () => {
  const goal2 = [{ from: '0000-01-01', goal: 2 }];
  const both = [solve(1, day(1)), solve(2, day(1))];
  assert.equal(computeXp(both, goal2).total, 25);
  assert.equal(computeXp(both.slice(0, 1), goal2).total, 10);
});

test('5. goalForDay with empty history gives 1', () => {
  assert.equal(goalForDay([], day(1)), 1);
});

test('5b. a day before every entry also falls back to 1', () => {
  assert.equal(goalForDay([{ from: day(5), goal: 3 }], day(2)), 1);
});

test('5c. two entries with the same date: the last one wins', () => {
  assert.equal(goalForDay([START, { from: day(2), goal: 2 }, { from: day(2), goal: 3 }], day(2)), 3);
});

test('5d. withGoalChange adds an entry, keeps only the last one for the same day, and keeps the input', () => {
  const start = [START];
  const a = withGoalChange(start, day(4), 2);
  assert.deepEqual(a, [START, { from: day(4), goal: 2 }]);
  const b = withGoalChange(a, day(4), 3);
  assert.deepEqual(b, [START, { from: day(4), goal: 3 }]);
  assert.deepEqual(start, [START]);
  assert.deepEqual(a, [START, { from: day(4), goal: 2 }]);
  // An older day stays sorted when a later entry already exists.
  const c = withGoalChange(b, day(2), 2);
  assert.deepEqual(c.map((e) => e.from), ['0000-01-01', day(2), day(4)]);
});

test('6. levelFromXp thresholds', () => {
  const l = (xp) => levelFromXp(xp).level;
  assert.equal(l(0), 1);
  assert.equal(l(99), 1);
  assert.equal(l(100), 2);
  assert.equal(l(299), 2);
  assert.equal(l(300), 3);
  assert.equal(l(599), 3);
  assert.equal(l(600), 4);
  assert.equal(l(999), 4);
  assert.equal(l(1000), 5);
});

test('6b. xpIntoLevel, xpForNext and fraction', () => {
  assert.deepEqual(levelFromXp(0), { level: 1, xpIntoLevel: 0, xpForNext: 100, fraction: 0 });
  assert.deepEqual(levelFromXp(50), { level: 1, xpIntoLevel: 50, xpForNext: 100, fraction: 0.5 });
  assert.deepEqual(levelFromXp(100), { level: 2, xpIntoLevel: 0, xpForNext: 200, fraction: 0 });
  assert.deepEqual(levelFromXp(250), { level: 2, xpIntoLevel: 150, xpForNext: 200, fraction: 0.75 });
  assert.deepEqual(levelFromXp(1000), { level: 5, xpIntoLevel: 0, xpForNext: 500, fraction: 0 });
});

test('6c. levels have no cap and never skip', () => {
  let previous = 1;
  for (let xp = 0; xp <= 200000; xp += 7) {
    const level = levelFromXp(xp).level;
    assert.ok(level === previous || level === previous + 1);
    previous = level;
  }
  assert.equal(levelFromXp(50 * 99 * 100).level, 100);
  assert.equal(levelFromXp(50 * 99 * 100 - 1).level, 99);
});

test('6d. bad XP values count as 0', () => {
  assert.equal(levelFromXp(-5).level, 1);
  assert.equal(levelFromXp(NaN).level, 1);
});

test('7. dailyProgress gives done, goal and met for today', () => {
  const history = [START, { from: day(5), goal: 2 }];
  const solves = [solve(1, day(5)), solve(2, day(4))];
  assert.deepEqual(dailyProgress(solves, history, day(5)), { done: 1, goal: 2, met: false });
  assert.deepEqual(dailyProgress([...solves, solve(3, day(5))], history, day(5)), { done: 2, goal: 2, met: true });
  assert.deepEqual(dailyProgress(solves, history, day(4)), { done: 1, goal: 1, met: true });
  assert.deepEqual(dailyProgress([], history, day(6)), { done: 0, goal: 2, met: false });
});

test('solvesPerDay counts per day and does not change the input', () => {
  const solves = [solve(1, day(1)), solve(2, day(1)), solve(3, day(2))];
  const copy = JSON.parse(JSON.stringify(solves));
  assert.deepEqual(solvesPerDay(solves), { [day(1)]: 2, [day(2)]: 1 });
  assert.deepEqual(solvesPerDay([]), {});
  assert.deepEqual(solves, copy);
});

test('computeXp with no solves is all zero', () => {
  assert.deepEqual(computeXp([], [START]), { total: 0, solveXp: 0, bonusXp: 0, bonusDays: 0 });
});
