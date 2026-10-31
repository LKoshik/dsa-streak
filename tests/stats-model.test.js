import test from 'node:test';
import assert from 'node:assert/strict';
import { statsToday, percent, monthLimits, clampMonth, nextMilestone } from '../src/features/stats/model.js';

test('statsToday: no solves means state.today', () => {
  assert.equal(statsToday('2026-06-10', {}), '2026-06-10');
  assert.equal(statsToday('2026-06-10', undefined), '2026-06-10');
});

test('statsToday: the newest day in statusByDay wins when it is later than state.today', () => {
  const statusByDay = { '2026-06-08': 'solved', '2026-06-09': 'missed', '2026-06-10': 'pending' };
  assert.equal(statsToday('2026-06-10', statusByDay), '2026-06-10');
  assert.equal(statsToday('2026-06-05', { ...statusByDay, '2026-06-12': 'solved' }), '2026-06-12');
});

test('percent rounds and stays between 0 and 100', () => {
  assert.equal(percent(0), 0);
  assert.equal(percent(7 / 405), 2);
  assert.equal(percent(0.5), 50);
  assert.equal(percent(1), 100);
  assert.equal(percent(1.7), 100);
  assert.equal(percent(-0.2), 0);
  assert.equal(percent(NaN), 0);
  assert.equal(percent(undefined), 0);
});

test('monthLimits: from the first solve month to the month of today', () => {
  assert.deepEqual(monthLimits('2025-12-31', '2026-06-10'), { first: { year: 2025, month: 12 }, last: { year: 2026, month: 6 } });
  assert.deepEqual(monthLimits(null, '2026-06-10'), { first: { year: 2026, month: 6 }, last: { year: 2026, month: 6 } });
  assert.deepEqual(monthLimits('2026-06-01', '2026-06-10'), { first: { year: 2026, month: 6 }, last: { year: 2026, month: 6 } });
});

test('clampMonth keeps a month inside the limits', () => {
  const limits = monthLimits('2026-03-15', '2026-06-10');
  assert.deepEqual(clampMonth({ year: 2026, month: 1 }, limits), { year: 2026, month: 3 });
  assert.deepEqual(clampMonth({ year: 2026, month: 4 }, limits), { year: 2026, month: 4 });
  assert.deepEqual(clampMonth({ year: 2027, month: 1 }, limits), { year: 2026, month: 6 });
});

test('nextMilestone: aims at the next round ten on a small sheet', () => {
  assert.deepEqual(nextMilestone(0, 69), { target: 10, remaining: 10, isFinish: false });
  assert.deepEqual(nextMilestone(9, 69), { target: 10, remaining: 1, isFinish: false });
  assert.deepEqual(nextMilestone(10, 69), { target: 20, remaining: 10, isFinish: false });
  assert.deepEqual(nextMilestone(27, 69), { target: 30, remaining: 3, isFinish: false });
});

test('nextMilestone: aims at every 25 on a big sheet (200 problems or more)', () => {
  assert.deepEqual(nextMilestone(0, 405), { target: 25, remaining: 25, isFinish: false });
  assert.deepEqual(nextMilestone(25, 405), { target: 50, remaining: 25, isFinish: false });
  assert.deepEqual(nextMilestone(7, 405), { target: 25, remaining: 18, isFinish: false });
  assert.deepEqual(nextMilestone(0, 200), { target: 25, remaining: 25, isFinish: false });
  assert.deepEqual(nextMilestone(0, 199), { target: 10, remaining: 10, isFinish: false });
});

test('nextMilestone: the last step is capped at the total and marked as the finish', () => {
  assert.deepEqual(nextMilestone(65, 69), { target: 69, remaining: 4, isFinish: true });
  assert.deepEqual(nextMilestone(400, 405), { target: 405, remaining: 5, isFinish: true });
  assert.deepEqual(nextMilestone(68, 69), { target: 69, remaining: 1, isFinish: true });
});

test('nextMilestone: nothing to aim at when everything is solved or the sheet is empty', () => {
  assert.equal(nextMilestone(69, 69), null);
  assert.equal(nextMilestone(70, 69), null);
  assert.equal(nextMilestone(0, 0), null);
  assert.equal(nextMilestone(0, undefined), null);
});
