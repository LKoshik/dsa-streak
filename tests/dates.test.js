import test from 'node:test';
import assert from 'node:assert/strict';
import { toDayString, addDays, isValidDay, eachDay, msUntilNextMidnight } from '../src/core/dates.js';

const HOUR = 3600 * 1000;

test('toDayString uses the local calendar date', () => {
  assert.equal(toDayString(new Date(2026, 0, 5, 23, 59, 59)), '2026-01-05');
  assert.equal(toDayString(new Date(2026, 0, 6, 0, 0, 0)), '2026-01-06');
  assert.equal(toDayString(new Date(2026, 11, 31, 12, 0)), '2026-12-31');
  assert.equal(toDayString(new Date(2028, 1, 29, 8, 0)), '2028-02-29');
});

test('addDays: forward, backward, zero', () => {
  assert.equal(addDays('2026-01-01', 1), '2026-01-02');
  assert.equal(addDays('2026-01-01', 0), '2026-01-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-01-01', 365), '2027-01-01');
  assert.equal(addDays('2026-01-01', -365), '2025-01-01');
});

test('addDays: leap year 2028', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-02-29', 1), '2028-03-01');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
  assert.equal(addDays('2028-01-01', 366), '2029-01-01');
});

test('addDays: works with the 0000-01-01 start used by goalHistory', () => {
  assert.equal(addDays('0000-01-01', 1), '0000-01-02');
});

test('addDays throws on an invalid day', () => {
  assert.throws(() => addDays('2026-02-30', 1), RangeError);
  assert.throws(() => addDays('nope', 1), RangeError);
});

test('isValidDay accepts real dates', () => {
  assert.equal(isValidDay('2026-01-01'), true);
  assert.equal(isValidDay('2028-02-29'), true);
  assert.equal(isValidDay('0000-01-01'), true);
  assert.equal(isValidDay('2026-12-31'), true);
});

test('isValidDay rejects impossible dates and bad formats', () => {
  assert.equal(isValidDay('2026-02-30'), false);
  assert.equal(isValidDay('2026-02-29'), false); // 2026 is not a leap year
  assert.equal(isValidDay('2100-02-29'), false); // 2100 is not a leap year
  assert.equal(isValidDay('2026-13-01'), false);
  assert.equal(isValidDay('2026-00-10'), false);
  assert.equal(isValidDay('2026-01-00'), false);
  assert.equal(isValidDay('2026-1-1'), false);
  assert.equal(isValidDay('26-01-01'), false);
  assert.equal(isValidDay('2026/01/01'), false);
  assert.equal(isValidDay('2026-01-01 '), false);
  assert.equal(isValidDay('2026-01-01T00:00:00'), false);
  assert.equal(isValidDay(''), false);
  assert.equal(isValidDay(null), false);
  assert.equal(isValidDay(undefined), false);
  assert.equal(isValidDay(20260101), false);
});

test('eachDay is inclusive', () => {
  assert.deepEqual(eachDay('2026-01-01', '2026-01-01'), ['2026-01-01']);
  assert.deepEqual(eachDay('2026-01-30', '2026-02-02'), ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
  assert.deepEqual(eachDay('2026-01-05', '2026-01-04'), []);
});

test('eachDay across a year end and 29 February 2028', () => {
  assert.deepEqual(eachDay('2026-12-30', '2027-01-02'), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  assert.deepEqual(eachDay('2028-02-28', '2028-03-01'), ['2028-02-28', '2028-02-29', '2028-03-01']);
  assert.equal(eachDay('2026-01-01', '2026-12-31').length, 365);
  assert.equal(eachDay('2028-01-01', '2028-12-31').length, 366);
});

test('eachDay across daylight-saving weeks of 2026 gives one entry per day', () => {
  // US: 8 March and 1 November. Europe: 29 March and 25 October.
  for (const [from, to, count] of [
    ['2026-03-05', '2026-03-12', 8],
    ['2026-03-26', '2026-04-02', 8],
    ['2026-10-22', '2026-10-28', 7],
    ['2026-10-30', '2026-11-05', 7],
  ]) {
    const days = eachDay(from, to);
    assert.equal(days.length, count);
    assert.equal(new Set(days).size, count);
  }
});

test('msUntilNextMidnight: simple cases', () => {
  assert.equal(msUntilNextMidnight(new Date(2026, 5, 10, 23, 0, 0, 0)), HOUR);
  assert.equal(msUntilNextMidnight(new Date(2026, 5, 10, 0, 0, 0, 0)), 24 * HOUR);
  assert.equal(msUntilNextMidnight(new Date(2026, 5, 10, 23, 59, 59, 999)), 1);
});

test('msUntilNextMidnight: always lands exactly on a local midnight', () => {
  const start = new Date(2026, 0, 1, 7, 13, 5, 250);
  for (let i = 0; i < 400; i++) {
    const now = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 7, 13, 5, 250);
    const target = new Date(now.getTime() + msUntilNextMidnight(now));
    assert.equal(target.getHours(), 0);
    assert.equal(target.getMinutes(), 0);
    assert.equal(target.getSeconds(), 0);
    assert.equal(target.getMilliseconds(), 0);
  }
});

test('msUntilNextMidnight: 23 and 25 hour days (needs a time zone with daylight saving)', (t) => {
  const oldTz = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    // If this computer ignores the TZ change, skip rather than fail.
    if (new Date(2026, 0, 15, 12).getTimezoneOffset() !== 300 || new Date(2026, 6, 15, 12).getTimezoneOffset() !== 240) {
      t.skip('time zone could not be changed here');
      return;
    }
    // 8 March 2026: clocks jump forward at 02:00, the day has 23 hours.
    assert.equal(msUntilNextMidnight(new Date(2026, 2, 8, 0, 30)), 22.5 * HOUR);
    // 1 November 2026: clocks go back at 02:00, the day has 25 hours.
    assert.equal(msUntilNextMidnight(new Date(2026, 10, 1, 0, 30)), 24.5 * HOUR);
    // toDayString still gives the right local date around midnight.
    assert.equal(toDayString(new Date(2026, 2, 8, 23, 59)), '2026-03-08');
    assert.equal(toDayString(new Date(2026, 2, 9, 0, 0)), '2026-03-09');
  } finally {
    if (oldTz === undefined) delete process.env.TZ; else process.env.TZ = oldTz;
  }
});
