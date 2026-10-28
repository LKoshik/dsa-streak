import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthGrid, daysInMonth, shiftMonth, compareMonths, monthTitle, monthOfDay, MONTH_NAMES,
} from '../src/core/calendar.js';
import { replayStreak } from '../src/core/streak.js';

const dates = (week) => week.map((cell) => (cell ? cell.date : null));
const padCount = (week) => week.filter((cell) => cell === null).length;

test('every week has exactly 7 cells and every date appears once, in order', () => {
  for (const [year, month] of [[2026, 1], [2026, 2], [2026, 3], [2026, 6], [2027, 2], [2028, 2], [2026, 12]]) {
    const weeks = buildMonthGrid(year, month, {}, '2026-06-10');
    for (const week of weeks) assert.equal(week.length, 7);
    const all = weeks.flat().filter((cell) => cell !== null).map((cell) => cell.date);
    assert.deepEqual(all, Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1));
  }
});

test('weeks start on Monday: January 2026 (the 1st is a Thursday) has 3 padding cells first', () => {
  const weeks = buildMonthGrid(2026, 1, {}, '2026-06-10');
  assert.deepEqual(dates(weeks[0]), [null, null, null, 1, 2, 3, 4]);
  assert.equal(weeks[0][3].day, '2026-01-01');
  assert.equal(weeks.length, 5);
  assert.deepEqual(dates(weeks[4]), [26, 27, 28, 29, 30, 31, null]);
});

test('a month that starts on Sunday has 6 padding cells first (March 2026)', () => {
  const weeks = buildMonthGrid(2026, 3, {}, '2026-06-10');
  assert.deepEqual(dates(weeks[0]), [null, null, null, null, null, null, 1]);
  assert.equal(weeks.length, 6);
  assert.deepEqual(dates(weeks[5]), [30, 31, null, null, null, null, null]);
});

test('a month that starts on Monday has no padding first (June 2026)', () => {
  const weeks = buildMonthGrid(2026, 6, {}, '2026-06-10');
  assert.deepEqual(dates(weeks[0]), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(weeks.length, 5);
  assert.deepEqual(dates(weeks[4]), [29, 30, null, null, null, null, null]);
});

test('a 28-day month that starts on Monday fits exactly 4 weeks with no padding (February 2027)', () => {
  const weeks = buildMonthGrid(2027, 2, {}, '2027-02-10');
  assert.equal(weeks.length, 4);
  assert.equal(weeks.flat().filter((cell) => cell === null).length, 0);
  assert.deepEqual(dates(weeks[0]), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(dates(weeks[3]), [22, 23, 24, 25, 26, 27, 28]);
});

test('February 2028 (leap year): 29 days, starts on Tuesday, last day is a Tuesday', () => {
  const weeks = buildMonthGrid(2028, 2, {}, '2028-02-10');
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(weeks.length, 5);
  assert.deepEqual(dates(weeks[0]), [null, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(dates(weeks[4]), [28, 29, null, null, null, null, null]);
  assert.equal(weeks[4][1].day, '2028-02-29');
  assert.equal(padCount(weeks[0]) + padCount(weeks[4]), 6);
});

test('leap year rules: 2028 and 2000 are leap, 2100 and 2027 are not', () => {
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2000, 2), 29);
  assert.equal(daysInMonth(2100, 2), 28);
  assert.equal(daysInMonth(2027, 2), 28);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 12), 31);
});

test('today is marked on exactly one cell, and on none in other months', () => {
  const june = buildMonthGrid(2026, 6, {}, '2026-06-10').flat().filter(Boolean);
  const marked = june.filter((cell) => cell.isToday);
  assert.equal(marked.length, 1);
  assert.equal(marked[0].day, '2026-06-10');
  const may = buildMonthGrid(2026, 5, {}, '2026-06-10').flat().filter(Boolean);
  assert.equal(may.filter((cell) => cell.isToday).length, 0);
});

test('today at the end of a month and at the start of the next one', () => {
  const lastDay = buildMonthGrid(2026, 1, {}, '2026-01-31').flat().filter(Boolean);
  assert.equal(lastDay.find((cell) => cell.isToday).date, 31);
  const firstDay = buildMonthGrid(2026, 2, {}, '2026-02-01').flat().filter(Boolean);
  assert.equal(firstDay.find((cell) => cell.isToday).date, 1);
});

test('statuses are applied to the right days; days without an entry get null', () => {
  const statusByDay = { '2026-06-02': 'solved', '2026-06-03': 'frozen', '2026-06-04': 'missed', '2026-06-10': 'pending' };
  const cells = buildMonthGrid(2026, 6, statusByDay, '2026-06-10').flat().filter(Boolean);
  const byDate = Object.fromEntries(cells.map((cell) => [cell.date, cell.status]));
  assert.equal(byDate[1], null);
  assert.equal(byDate[2], 'solved');
  assert.equal(byDate[3], 'frozen');
  assert.equal(byDate[4], 'missed');
  assert.equal(byDate[5], null);
  assert.equal(byDate[10], 'pending');
  assert.equal(byDate[11], null);
});

test('statuses of other months are ignored', () => {
  const cells = buildMonthGrid(2026, 6, { '2026-05-31': 'solved', '2026-07-01': 'solved' }, '2026-06-10').flat().filter(Boolean);
  assert.equal(cells.filter((cell) => cell.status !== null).length, 0);
});

test('works with the real replayed streak: solved, frozen and missed days show correctly', () => {
  // Solve 1 to 7 June (7 in a row earns a freeze), skip 8 (frozen) and 9 (missed), today is the 10th.
  const solvedDays = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07'];
  const replay = replayStreak(solvedDays, '2026-06-10');
  const cells = buildMonthGrid(2026, 6, replay.statusByDay, '2026-06-10').flat().filter(Boolean);
  const status = (date) => cells.find((cell) => cell.date === date).status;
  for (let date = 1; date <= 7; date++) assert.equal(status(date), 'solved');
  assert.equal(status(8), 'frozen');
  assert.equal(status(9), 'missed');
  assert.equal(status(10), 'pending');
  assert.equal(status(11), null);
  assert.equal(cells.find((cell) => cell.date === 10).isToday, true);
});

test('a month that crosses the first solve: days before it are null', () => {
  const replay = replayStreak(['2026-06-08'], '2026-06-10');
  const cells = buildMonthGrid(2026, 6, replay.statusByDay, '2026-06-10').flat().filter(Boolean);
  assert.equal(cells.find((cell) => cell.date === 7).status, null);
  assert.equal(cells.find((cell) => cell.date === 8).status, 'solved');
  assert.equal(cells.find((cell) => cell.date === 9).status, 'missed');
});

test('no solves at all: an empty statusByDay (or none) gives plain cells', () => {
  for (const statuses of [{}, undefined, null]) {
    const cells = buildMonthGrid(2026, 6, statuses, '2026-06-10').flat().filter(Boolean);
    assert.equal(cells.length, 30);
    assert.equal(cells.filter((cell) => cell.status !== null).length, 0);
  }
});

test('buildMonthGrid does not change statusByDay', () => {
  const statusByDay = { '2026-06-02': 'solved' };
  const copy = JSON.parse(JSON.stringify(statusByDay));
  buildMonthGrid(2026, 6, statusByDay, '2026-06-10');
  assert.deepEqual(statusByDay, copy);
});

test('buildMonthGrid rejects bad input', () => {
  assert.throws(() => buildMonthGrid(2026, 0, {}, '2026-06-10'), RangeError);
  assert.throws(() => buildMonthGrid(2026, 13, {}, '2026-06-10'), RangeError);
  assert.throws(() => buildMonthGrid(2026, 1.5, {}, '2026-06-10'), RangeError);
  assert.throws(() => buildMonthGrid('2026', 6, {}, '2026-06-10'), RangeError);
  assert.throws(() => buildMonthGrid(2026, 6, {}, '2026-02-30'), RangeError);
  assert.throws(() => buildMonthGrid(2026, 6, {}, undefined), RangeError);
});

test('shiftMonth goes forward and back, across year borders', () => {
  assert.deepEqual(shiftMonth(2026, 6, 1), { year: 2026, month: 7 });
  assert.deepEqual(shiftMonth(2026, 6, -1), { year: 2026, month: 5 });
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.deepEqual(shiftMonth(2026, 3, 12), { year: 2027, month: 3 });
  assert.deepEqual(shiftMonth(2026, 3, -15), { year: 2024, month: 12 });
  assert.deepEqual(shiftMonth(2026, 3, 0), { year: 2026, month: 3 });
});

test('compareMonths orders months', () => {
  assert.ok(compareMonths({ year: 2026, month: 5 }, { year: 2026, month: 6 }) < 0);
  assert.ok(compareMonths({ year: 2027, month: 1 }, { year: 2026, month: 12 }) > 0);
  assert.equal(compareMonths({ year: 2026, month: 6 }, { year: 2026, month: 6 }), 0);
});

test('monthTitle and monthOfDay', () => {
  assert.equal(monthTitle(2028, 2), 'February 2028');
  assert.equal(monthTitle(2026, 12), 'December 2026');
  assert.equal(MONTH_NAMES.length, 12);
  assert.deepEqual(monthOfDay('2028-02-29'), { year: 2028, month: 2 });
  assert.deepEqual(monthOfDay('2026-12-01'), { year: 2026, month: 12 });
  assert.throws(() => monthOfDay('2026-02-30'), RangeError);
});
