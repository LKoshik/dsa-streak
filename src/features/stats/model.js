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

// The next round number to aim at for the Solved bar (every 10 on a small sheet, every 25 on a big one),
// capped at the total. Returns null when everything is solved or there is nothing to solve.
export function nextMilestone(solved, total) {
  if (!(total > 0) || solved >= total) return null;
  const step = total >= 200 ? 25 : 10;
  const target = Math.min((Math.floor(Math.max(0, solved) / step) + 1) * step, total);
  return { target, remaining: target - solved, isFinish: target === total };
}
