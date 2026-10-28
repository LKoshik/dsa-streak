// Date helpers. A "day" is a text like '2026-03-08' (year-month-day).
// All math uses year, month and day numbers (through UTC), never "milliseconds / 86400000",
// so daylight saving can never cause an off-by-one mistake.
// This file never reads the clock: callers pass the date in.

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Make a UTC Date for a year, month (1-12) and day. Also works for years 0 to 99.
function utcDate(year, month, day) {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return d;
}

// Turn a UTC Date back into 'YYYY-MM-DD'.
function formatUtc(d) {
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Split a valid day text into numbers. Throws if the text is not a real date.
function parseDay(day) {
  if (!isValidDay(day)) throw new RangeError(`Invalid day: ${day}`);
  const [, y, m, d] = DAY_PATTERN.exec(day);
  return [Number(y), Number(m), Number(d)];
}

// The phone's local calendar date for a Date object, as 'YYYY-MM-DD'.
export function toDayString(date) {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Move a day forward (n > 0) or backward (n < 0) by n calendar days.
export function addDays(day, n) {
  const [y, m, d] = parseDay(day);
  return formatUtc(utcDate(y, m, d + n));
}

// True only for real dates in the exact form YYYY-MM-DD (so 2026-02-30 is false).
export function isValidDay(str) {
  if (typeof str !== 'string') return false;
  const match = DAY_PATTERN.exec(str);
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1) return false;
  // Build the date and check it did not roll over into the next month.
  return formatUtc(utcDate(y, m, d)) === str;
}

// Every day from `from` to `to`, both included. Empty list if `from` is after `to`.
export function eachDay(from, to) {
  parseDay(from);
  parseDay(to);
  const days = [];
  // Text in this format sorts the same as the dates do, so < and > are safe here.
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

// Milliseconds from `date` until the next local midnight (00:00 on the next calendar day).
// Uses the phone's local time, so it also copes with 23 and 25 hour days.
export function msUntilNextMidnight(date) {
  const nextMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
  return nextMidnight.getTime() - date.getTime();
}
