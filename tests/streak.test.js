// Streak tests. day(n) is the date n days after 2026-01-01.
import test from 'node:test';
import assert from 'node:assert/strict';
import { replayStreak } from '../src/core/streak.js';
import { addDays } from '../src/core/dates.js';

const day = (n) => addDays('2026-01-01', n);
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => day(from + i));

test('1. no solves', () => {
  const r = replayStreak([], day(5));
  assert.equal(r.streak, 0);
  assert.equal(r.longest, 0);
  assert.equal(r.freezes, 0);
  assert.deepEqual(r.statusByDay, {});
  assert.equal(r.todayStatus, 'pending');
  assert.equal(r.firstDay, null);
});

test('2. solved today only', () => {
  const r = replayStreak([day(10)], day(10));
  assert.equal(r.streak, 1);
  assert.equal(r.todayStatus, 'solved');
  assert.equal(r.firstDay, day(10));
});

test('3. solved yesterday only, today pending', () => {
  const r = replayStreak([day(9)], day(10));
  assert.equal(r.streak, 1);
  assert.equal(r.todayStatus, 'pending');
  assert.equal(r.statusByDay[day(9)], 'solved');
  assert.equal(r.statusByDay[day(10)], 'pending');
});

test('4. solved two days ago only, no freeze: streak 0, yesterday missed', () => {
  const r = replayStreak([day(8)], day(10));
  assert.equal(r.streak, 0);
  assert.equal(r.statusByDay[day(9)], 'missed');
  assert.equal(r.todayStatus, 'pending');
  assert.equal(r.longest, 1);
});

test('5. seven solved days ending today: streak 7, one freeze', () => {
  const r = replayStreak(range(4, 10), day(10));
  assert.equal(r.streak, 7);
  assert.equal(r.freezes, 1);
});

test('6. a freeze covers one skipped day', () => {
  const r = replayStreak([...range(1, 7), day(9)], day(9));
  assert.equal(r.statusByDay[day(8)], 'frozen');
  assert.equal(r.streak, 8);
  assert.equal(r.freezes, 0);
});

test('7. freezes cap at 2', () => {
  assert.equal(replayStreak(range(1, 14), day(14)).freezes, 2);
  assert.equal(replayStreak(range(1, 21), day(21)).freezes, 2);
});

test('8. two freezes, three skipped days: 2 frozen, 1 missed', () => {
  const r = replayStreak([...range(1, 14), day(18)], day(18));
  assert.equal(r.statusByDay[day(15)], 'frozen');
  assert.equal(r.statusByDay[day(16)], 'frozen');
  assert.equal(r.statusByDay[day(17)], 'missed');
  assert.equal(r.streak, 1);
  assert.equal(r.freezes, 0);
  assert.equal(r.longest, 14);
});

test('9. undo: removing day 7 removes the freeze it earned', () => {
  const r = replayStreak([...range(1, 6), day(9)], day(9));
  assert.equal(r.statusByDay[day(7)], 'missed');
  assert.equal(r.statusByDay[day(8)], 'missed');
  assert.equal(r.streak, 1);
  assert.equal(r.freezes, 0);
});

test('10. repeats and unsorted input are fine, and the input is not changed', () => {
  const input = [day(3), day(1), day(3), day(2), day(1), day(3)];
  const copy = [...input];
  const r = replayStreak(input, day(3));
  assert.equal(r.streak, 3);
  assert.deepEqual(input, copy);
  // Same answer as clean sorted input.
  assert.deepEqual(r, replayStreak([day(1), day(2), day(3)], day(3)));
});

test('11a. runs across a month end, a year end and 29 February 2028', () => {
  const run = (from, count, today) => {
    const days = Array.from({ length: count }, (_, i) => addDays(from, i));
    return replayStreak(days, today);
  };
  assert.equal(run('2026-01-28', 8, '2026-02-04').streak, 8);
  assert.equal(run('2026-12-28', 8, '2027-01-04').streak, 8);
  const leap = run('2028-02-26', 5, '2028-03-01');
  assert.equal(leap.streak, 5);
  assert.equal(leap.statusByDay['2028-02-29'], 'solved');
  // 365 days from 2028-01-01 covers the leap day and gives 366 in a row.
  assert.equal(run('2028-01-01', 366, '2028-12-31').streak, 366);
});

test('11b. daylight-saving weeks of 2026 give no off-by-one', () => {
  // US 8 Mar and 1 Nov, Europe 29 Mar and 25 Oct.
  for (const [from, count] of [['2026-03-04', 10], ['2026-03-25', 10], ['2026-10-20', 14], ['2026-10-28', 10]]) {
    const days = Array.from({ length: count }, (_, i) => addDays(from, i));
    const r = replayStreak(days, days[days.length - 1]);
    assert.equal(r.streak, count);
    assert.equal(Object.keys(r.statusByDay).length, count);
  }
});

test('11c. the result is the same in any time zone (it only uses text days)', () => {
  const days = [...range(1, 9)];
  const expected = replayStreak(days, day(9));
  const oldTz = process.env.TZ;
  try {
    for (const tz of ['Pacific/Auckland', 'America/Los_Angeles', 'Asia/Kolkata', 'Europe/London']) {
      process.env.TZ = tz;
      assert.deepEqual(replayStreak(days, day(9)), expected);
    }
  } finally {
    if (oldTz === undefined) delete process.env.TZ; else process.env.TZ = oldTz;
  }
});

test('12. a solve dated after today (clock moved back)', () => {
  const r = replayStreak([day(5)], day(4));
  assert.equal(r.streak, 1);
  assert.equal(r.todayStatus, 'solved');
});

test('12b. clock moved back with earlier solves: the future day is the effective today', () => {
  const r = replayStreak([day(3), day(4), day(6)], day(4));
  // day 5 is in the past relative to the latest solve: missed. Day 6 solved.
  assert.equal(r.statusByDay[day(5)], 'missed');
  assert.equal(r.streak, 1);
  assert.equal(r.todayStatus, 'solved');
});

test('13. a longer old streak is remembered in longest', () => {
  const r = replayStreak([...range(1, 5), day(8), day(9)], day(9));
  assert.equal(r.longest, 5);
  assert.equal(r.streak, 2);
});

test('extra: a frozen day does not add to the streak', () => {
  const r = replayStreak([...range(1, 7), day(9), day(10)], day(10));
  assert.equal(r.statusByDay[day(8)], 'frozen');
  assert.equal(r.streak, 9);
});

test('extra: a freeze earned on day X can cover X+1', () => {
  const r = replayStreak(range(1, 7), day(8));
  // Day 8 is today and pending, so nothing is used yet.
  assert.equal(r.freezes, 1);
  assert.equal(r.statusByDay[day(8)], 'pending');
  const r2 = replayStreak(range(1, 7), day(9));
  assert.equal(r2.statusByDay[day(8)], 'frozen');
  assert.equal(r2.freezes, 0);
  assert.equal(r2.streak, 7);
});

test('extra: days before the first solve have no status', () => {
  const r = replayStreak([day(5)], day(5));
  assert.equal(r.statusByDay[day(4)], undefined);
  assert.equal(r.firstDay, day(5));
});

test('extra: bad input throws', () => {
  assert.throws(() => replayStreak(['2026-02-30'], '2026-03-01'), RangeError);
  assert.throws(() => replayStreak([], 'today'), RangeError);
});
