// Selectors: pure functions that turn the state into exactly what a screen needs.
// They never change the state and never read the clock (they use state.today).
// Streak, freezes, XP, level and progress are all worked out here from the solves.
import { TOPICS, getProblem } from '../core/catalog.js';
import { PROBLEMS } from '../core/problems.data.js';
import { addDays } from '../core/dates.js';
import { replayStreak } from '../core/streak.js';
import { computeXp, levelFromXp, dailyProgress } from '../core/xp.js';
import { findNext, topicProgress } from '../core/next.js';
import { needsBackupReminder } from '../core/backup.js';

const TOTAL = PROBLEMS.length;

// Numbers every selector needs.
function derive(state) {
  const { solves, today } = state;
  const solvedIds = new Set(solves.map((s) => s.problemId));
  // If the phone clock moved back, a solve can be dated after today (Brief D1).
  let effectiveToday = today;
  for (const s of solves) if (s.day > effectiveToday) effectiveToday = s.day;
  const streakInfo = replayStreak(solves.map((s) => s.day), today);
  return { solvedIds, effectiveToday, streakInfo };
}

// Solved problems that exist in the catalog.
function countSolved(solvedIds) {
  let count = 0;
  for (const id of solvedIds) if (getProblem(id)) count += 1;
  return count;
}

// XP in the shape the screens use.
function xpSummary(state) {
  const { total } = computeXp(state.solves, state.settings.goalHistory);
  return { total, ...levelFromXp(total) };
}

// The last 7 days ending today: [{ day, status, isToday }].
// status is 'solved' | 'frozen' | 'missed' | 'pending', or null before the first solve.
function lastSevenDays(effectiveToday, statusByDay) {
  const week = [];
  for (let back = 6; back >= 0; back--) {
    const day = addDays(effectiveToday, -back);
    week.push({ day, status: statusByDay[day] ?? null, isToday: day === effectiveToday });
  }
  return week;
}

// Everything the Home screen shows.
export function selectHome(state) {
  const { solvedIds, effectiveToday, streakInfo } = derive(state);
  const found = findNext(TOPICS, solvedIds, state.settings.currentTopic);
  return {
    streak: streakInfo.streak,
    longest: streakInfo.longest,
    freezes: streakInfo.freezes,
    todayStatus: streakInfo.todayStatus,
    daily: dailyProgress(state.solves, state.settings.goalHistory, effectiveToday),
    next: found ? { problem: getProblem(found.problemId), topic: found.topic } : null,
    xp: xpSummary(state),
    solvedCount: countSolved(solvedIds),
    total: TOTAL,
    backupReminder: needsBackupReminder(state.solves, state.settings.lastBackupAt, effectiveToday),
    week: lastSevenDays(effectiveToday, streakInfo.statusByDay),
  };
}

// Everything the Path screen shows: topics, their subsections and every problem.
export function selectPath(state) {
  const { solvedIds } = derive(state);
  const found = findNext(TOPICS, solvedIds, state.settings.currentTopic);
  const progress = topicProgress(TOPICS, solvedIds);
  return TOPICS.map((topic, index) => ({
    topic: topic.name,
    solved: progress[index].solved,
    total: progress[index].total,
    done: progress[index].done,
    isCurrent: found !== null && found.topic === topic.name,
    subsections: topic.subsections.map((sub) => ({
      name: sub.name,
      solved: sub.ids.filter((id) => solvedIds.has(id)).length,
      total: sub.ids.length,
      problems: sub.ids.map((id) => {
        const p = getProblem(id);
        return { id, title: p.title, difficulty: p.difficulty, solved: solvedIds.has(id) };
      }),
    })),
  }));
}

// Everything the Stats screen shows.
export function selectStats(state) {
  const { solvedIds, streakInfo } = derive(state);
  return {
    streak: streakInfo.streak,
    longest: streakInfo.longest,
    freezes: streakInfo.freezes,
    statusByDay: streakInfo.statusByDay,
    firstDay: streakInfo.firstDay,
    daysPracticed: new Set(state.solves.map((s) => s.day)).size,
    solvedCount: countSolved(solvedIds),
    total: TOTAL,
    xp: xpSummary(state),
  };
}
