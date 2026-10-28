// Streak replay (Brief D3). Walks every day from the first solved day to "today"
// and works out streak, freezes and the status of each day.
// Pure code: no screen, no storage, never reads the clock (the caller passes `today`).
import { eachDay, isValidDay } from './dates.js';

const MAX_FREEZES = 2;

// solvedDays: any list of day texts (unsorted, repeats are fine, not changed).
// today: 'YYYY-MM-DD'.
// Returns { streak, longest, freezes, statusByDay, todayStatus, firstDay }.
//   statusByDay: { 'YYYY-MM-DD': 'solved' | 'frozen' | 'missed' | 'pending' }
//   todayStatus: 'solved' or 'pending'
export function replayStreak(solvedDays, today) {
  if (!isValidDay(today)) throw new RangeError(`Invalid today: ${today}`);
  for (const day of solvedDays) {
    if (!isValidDay(day)) throw new RangeError(`Invalid solved day: ${day}`);
  }

  // Distinct days, sorted. A new array, so the input is never changed.
  const solved = new Set(solvedDays);
  const sorted = [...solved].sort();

  // No solves yet: nothing to replay.
  if (sorted.length === 0) {
    return { streak: 0, longest: 0, freezes: 0, statusByDay: {}, todayStatus: 'pending', firstDay: null };
  }

  const firstDay = sorted[0];
  const latest = sorted[sorted.length - 1];
  // If the phone clock moved back, a solve can be dated after "today".
  const effectiveToday = latest > today ? latest : today;

  let streak = 0;
  let freezes = 0;
  let longest = 0;
  const statusByDay = {};

  for (const day of eachDay(firstDay, effectiveToday)) {
    if (solved.has(day)) {
      streak += 1;
      statusByDay[day] = 'solved';
      // Every 7th day in a row earns a freeze (a freeze earned while holding 2 is lost).
      if (streak % 7 === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
      if (streak > longest) longest = streak;
    } else if (day === effectiveToday) {
      // Today is not over yet, so nothing is lost.
      statusByDay[day] = 'pending';
    } else if (freezes > 0) {
      // A past day with no solve: a freeze covers it, streak stays.
      freezes -= 1;
      statusByDay[day] = 'frozen';
    } else {
      streak = 0;
      statusByDay[day] = 'missed';
    }
  }

  return {
    streak,
    longest,
    freezes,
    statusByDay,
    todayStatus: statusByDay[effectiveToday],
    firstDay,
  };
}
