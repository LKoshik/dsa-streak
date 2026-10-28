// XP, levels and the daily goal (Brief D4 to D6).
// Pure code: no screen, no storage, never reads the clock (the caller passes `today`).
// A "solve" here is { problemId, day, at }. Only `day` is used in this file.

const SOLVE_XP = 10;
const GOAL_BONUS_XP = 5;
const DEFAULT_GOAL = 1;

// The goal for one day: the last entry whose `from` is on or before that day.
// goalHistory looks like [{ from: '0000-01-01', goal: 1 }, { from: '2026-02-03', goal: 2 }].
// An empty history gives the default goal of 1.
export function goalForDay(goalHistory, day) {
  let goal = DEFAULT_GOAL;
  let bestFrom = null;
  for (const entry of goalHistory) {
    // Text days sort the same as dates. `>=` lets a later entry win when two have the same `from`.
    if (entry.from <= day && (bestFrom === null || entry.from >= bestFrom)) {
      bestFrom = entry.from;
      goal = entry.goal;
    }
  }
  return goal;
}

// Returns a new goalHistory after the goal is changed today (Brief D4).
// Past days keep their old goal. If today already has an entry, it is replaced.
// The input list is not changed.
export function withGoalChange(goalHistory, today, goal) {
  const kept = goalHistory.filter((entry) => entry.from !== today);
  const next = [...kept, { from: today, goal }];
  next.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  return next;
}

// How many solves each day has: { 'YYYY-MM-DD': count }.
export function solvesPerDay(solves) {
  const counts = {};
  for (const solve of solves) {
    counts[solve.day] = (counts[solve.day] || 0) + 1;
  }
  return counts;
}

// Total XP = 10 per solve + 5 once for each day where that day's solves reached that day's goal.
// Returns { total, solveXp, bonusXp, bonusDays } (bonusDays is a number of days).
export function computeXp(solves, goalHistory) {
  const counts = solvesPerDay(solves);
  let bonusDays = 0;
  for (const [day, count] of Object.entries(counts)) {
    if (count >= goalForDay(goalHistory, day)) bonusDays += 1;
  }
  const solveXp = SOLVE_XP * solves.length;
  const bonusXp = GOAL_BONUS_XP * bonusDays;
  return { total: solveXp + bonusXp, solveXp, bonusXp, bonusDays };
}

// Total XP needed to reach level L: 50 * (L - 1) * L. (L1 = 0, L2 = 100, L3 = 300, L4 = 600...)
function xpToReach(level) {
  return 50 * (level - 1) * level;
}

// Level for a total XP. Returns { level, xpIntoLevel, xpForNext, fraction }.
// xpForNext is the size of the current level (100 * L); fraction is 0 to just under 1.
export function levelFromXp(xp) {
  const safeXp = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  // Start from a formula, then correct by one step either way in case of rounding.
  let level = Math.max(1, Math.floor((50 + Math.sqrt(2500 + 200 * safeXp)) / 100));
  while (xpToReach(level) > safeXp) level -= 1;
  while (xpToReach(level + 1) <= safeXp) level += 1;
  const xpIntoLevel = safeXp - xpToReach(level);
  const xpForNext = 100 * level;
  return { level, xpIntoLevel, xpForNext, fraction: xpIntoLevel / xpForNext };
}

// Today's progress towards the daily goal: { done, goal, met }.
export function dailyProgress(solves, goalHistory, today) {
  const done = solvesPerDay(solves)[today] || 0;
  const goal = goalForDay(goalHistory, today);
  return { done, goal, met: done >= goal };
}
