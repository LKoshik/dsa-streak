// Calendar helpers for the Stats screen. Pure code: no screen, never reads the clock.
// Months are numbered 1 to 12 (like the middle part of 'YYYY-MM-DD'). Weeks start on Monday.
import { isValidDay } from './dates.js';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function checkMonth(year, month) {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError(`Invalid year: ${year}`);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError(`Invalid month: ${month}`);
}

const pad = (n) => String(n).padStart(2, '0');

// How many days a month has (leap years included).
export function daysInMonth(year, month) {
  checkMonth(year, month);
  const d = new Date(0);
  d.setUTCFullYear(year, month, 0); // day 0 of the next month = last day of this month
  return d.getUTCDate();
}

// Position of the 1st of the month in a Monday-first week: 0 = Monday ... 6 = Sunday.
function mondayIndexOfFirst(year, month) {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, 1);
  return (d.getUTCDay() + 6) % 7; // getUTCDay: 0 = Sunday
}

// The month a day belongs to: '2028-02-29' -> { year: 2028, month: 2 }.
export function monthOfDay(day) {
  if (!isValidDay(day)) throw new RangeError(`Invalid day: ${day}`);
  return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) };
}

// Move by `delta` months (negative = back). Rolls over the year: (2026, 12, +1) -> 2027-01.
export function shiftMonth(year, month, delta) {
  checkMonth(year, month);
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12 + 12) % 12 + 1 };
}

// Compare two months: negative if a is before b, 0 if the same, positive if after.
export function compareMonths(a, b) {
  return (a.year - b.year) * 12 + (a.month - b.month);
}

// 'February 2028'
export function monthTitle(year, month) {
  checkMonth(year, month);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// The grid for one month: a list of weeks, each week has exactly 7 cells (Monday first).
//   year, month: which month (month is 1 to 12)
//   statusByDay: { 'YYYY-MM-DD': 'solved' | 'frozen' | 'missed' | 'pending' } (from replayStreak)
//   today: 'YYYY-MM-DD'
// A cell is null for padding (before the 1st and after the last day), otherwise
//   { day: 'YYYY-MM-DD', date: 1..31, status: 'solved' | 'frozen' | 'missed' | 'pending' | null, isToday }
// status is null for days with no entry in statusByDay (before the first solve, or in the future).
export function buildMonthGrid(year, month, statusByDay, today) {
  checkMonth(year, month);
  if (!isValidDay(today)) throw new RangeError(`Invalid today: ${today}`);
  const statuses = statusByDay || {};

  const cells = new Array(mondayIndexOfFirst(year, month)).fill(null);
  for (let date = 1; date <= daysInMonth(year, month); date++) {
    const day = `${String(year).padStart(4, '0')}-${pad(month)}-${pad(date)}`;
    cells.push({ day, date, status: statuses[day] ?? null, isToday: day === today });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
