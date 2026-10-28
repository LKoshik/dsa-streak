// Small pure helpers for the Stats screen (no screen code here, so they are easy to test).
import { compareMonths, monthOfDay } from '../../core/calendar.js';

// "Today" as the Stats screen should see it. selectStats does not return it, so we work it out
// the same way the selectors do: the later of state.today and the newest day in statusByDay
// (a solve dated after today moves "today" forward, Brief D1).
export function statsToday(stateToday, statusByDay) {
  let latest = stateToday;
  for (const day of Object.keys(statusByDay || {})) if (day > latest) latest = day;
  return latest;
}

// A fraction (0 to 1) as a whole percent, never below 0 or above 100.
export function percent(fraction) {
  if (!Number.isFinite(fraction)) return 0;
  return Math.round(Math.max(0, Math.min(1, fraction)) * 100);
}

// How far back and forward the calendar may go:
// back to the month of the first solve (or this month when there are no solves), forward to this month.
export function monthLimits(firstDay, today) {
  const last = monthOfDay(today);
  return { first: firstDay ? monthOfDay(firstDay) : last, last };
}

// Clamp a month into the allowed range.
export function clampMonth(month, limits) {
  if (compareMonths(month, limits.first) < 0) return limits.first;
  if (compareMonths(month, limits.last) > 0) return limits.last;
  return month;
}
