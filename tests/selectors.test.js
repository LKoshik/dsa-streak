// Selector tests with hand-made state. They use the real problem catalog.
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectHome, selectPath, selectStats } from '../src/state/selectors.js';
import { TOPICS } from '../src/core/catalog.js';
import { addDays } from '../src/core/dates.js';
import { defaultSettings } from '../src/data/db.js';

const day = (n) => addDays('2026-01-01', n);
const solve = (problemId, d) => ({ problemId, day: d, at: 1 });
const state = (solves, today, settings = {}) => ({
  ready: true, today, solves, settings: { ...defaultSettings(), ...settings },
});
const topicIds = (name) => TOPICS.find((t) => t.name === name).ids;
const ALL_IDS = TOPICS.flatMap((t) => t.ids);

// A local-noon timestamp for a given day number (used for lastBackupAt).
const noon = (n) => {
  const [y, m, d] = day(n).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
};

test('selectHome: new user', () => {
  const home = selectHome(state([], day(0)));
  assert.equal(home.streak, 0);
  assert.equal(home.longest, 0);
  assert.equal(home.freezes, 0);
  assert.equal(home.todayStatus, 'pending');
  assert.deepEqual(home.daily, { done: 0, goal: 1, met: false });
  assert.equal(home.next.problem.id, 1);
  assert.equal(home.next.problem.title, 'Linear Search');
  assert.equal(home.next.topic, 'Arrays');
  assert.deepEqual(home.xp, { total: 0, level: 1, xpIntoLevel: 0, xpForNext: 100, fraction: 0 });
  assert.equal(home.solvedCount, 0);
  assert.equal(home.total, 405);
  assert.equal(home.backupReminder, false);
});

test('selectHome: week has 7 items ending today, all empty for a new user', () => {
  const home = selectHome(state([], day(10)));
  assert.equal(home.week.length, 7);
  assert.deepEqual(home.week.map((w) => w.day), [4, 5, 6, 7, 8, 9, 10].map(day));
  assert.ok(home.week.every((w) => w.status === null));
  assert.deepEqual(home.week.map((w) => w.isToday), [false, false, false, false, false, false, true]);
});

test('selectHome: user mid-streak', () => {
  const solves = [solve(1, day(0)), solve(2, day(1)), solve(3, day(2))];
  const home = selectHome(state(solves, day(2)));
  assert.equal(home.streak, 3);
  assert.equal(home.todayStatus, 'solved');
  assert.deepEqual(home.daily, { done: 1, goal: 1, met: true });
  assert.equal(home.next.problem.id, 4);
  assert.equal(home.xp.total, 45); // 3 solves x 10 + 3 bonus days x 5
  assert.equal(home.solvedCount, 3);
  // Week: 4 days before the first solve have no status, then 3 solved days.
  assert.deepEqual(home.week.map((w) => w.status), [null, null, null, null, 'solved', 'solved', 'solved']);
});

test('selectHome: today pending, yesterday missed, frozen day shows in the week', () => {
  const solves = [...Array.from({ length: 7 }, (_, i) => solve(i + 1, day(i))), solve(8, day(8))];
  const home = selectHome(state(solves, day(9)));
  assert.equal(home.todayStatus, 'pending');
  assert.equal(home.streak, 8);
  assert.equal(home.week[6].status, 'pending');
  assert.equal(home.week[5].status, 'solved');
  assert.equal(home.week[4].status, 'frozen'); // day 7 was skipped and covered by the freeze
});

test('selectHome: a missed day shows as missed and the streak is 0', () => {
  const home = selectHome(state([solve(1, day(0))], day(3)));
  assert.equal(home.streak, 0);
  assert.equal(home.week[5].status, 'missed');
  assert.equal(home.week[6].status, 'pending');
});

test('selectHome: the daily goal comes from the goal history', () => {
  const settings = { goalHistory: [{ from: '0000-01-01', goal: 1 }, { from: day(2), goal: 3 }] };
  const solves = [solve(1, day(2)), solve(2, day(2))];
  const home = selectHome(state(solves, day(2), settings));
  assert.deepEqual(home.daily, { done: 2, goal: 3, met: false });
});

test('selectHome: finished topic moves next to the following topic', () => {
  const solves = topicIds('Hashing').map((id) => solve(id, day(0)));
  const home = selectHome(state(solves, day(0), { currentTopic: 'Hashing' }));
  assert.equal(home.next.topic, 'Binary Search');
  assert.equal(home.next.problem.id, topicIds('Binary Search')[0]);
});

test('selectHome: continue here picks the topic; out of order solves are respected', () => {
  const home = selectHome(state([solve(2, day(0))], day(0), { currentTopic: 'Recursion' }));
  assert.equal(home.next.topic, 'Recursion');
  const arrays = selectHome(state([solve(2, day(0))], day(0)));
  assert.equal(arrays.next.problem.id, 1);
});

test('selectHome: everything solved', () => {
  const solves = ALL_IDS.map((id) => solve(id, day(0)));
  const home = selectHome(state(solves, day(0)));
  assert.equal(home.next, null);
  assert.equal(home.solvedCount, 405);
  assert.equal(home.total, 405);
});

test('selectHome: solve dated after today (clock moved back) counts as today', () => {
  const home = selectHome(state([solve(1, day(5))], day(4)));
  assert.equal(home.todayStatus, 'solved');
  assert.equal(home.streak, 1);
  assert.equal(home.week[6].day, day(5));
  assert.equal(home.week[6].isToday, true);
});

test('selectHome: backup reminder on and off', () => {
  const old = [solve(1, day(0))];
  // Never backed up: counts from the oldest solve. 14 days -> on, 13 days -> off.
  assert.equal(selectHome(state(old, day(14))).backupReminder, true);
  assert.equal(selectHome(state(old, day(13))).backupReminder, false);
  // Backed up on day 20: day 33 is 13 days later -> off, day 34 is 14 days later -> on.
  const settings = { lastBackupAt: noon(20) };
  assert.equal(selectHome(state(old, day(33), settings)).backupReminder, false);
  assert.equal(selectHome(state(old, day(34), settings)).backupReminder, true);
  // No solves and never backed up: nothing to back up.
  assert.equal(selectHome(state([], day(100))).backupReminder, false);
});

test('selectPath: 18 topics with the right shape and totals', () => {
  const path = selectPath(state([solve(1, day(0)), solve(2, day(0))], day(0)));
  assert.equal(path.length, 18);
  assert.equal(path.reduce((n, t) => n + t.subsections.length, 0), 71);
  assert.equal(path.reduce((n, t) => n + t.total, 0), 405);
  const arrays = path[0];
  assert.equal(arrays.topic, 'Arrays');
  assert.equal(arrays.solved, 2);
  assert.equal(arrays.total, 32);
  assert.equal(arrays.done, false);
  assert.equal(arrays.isCurrent, true);
  assert.equal(arrays.subsections[0].name, 'Fundamentals');
  assert.equal(arrays.subsections[0].solved, 2);
  assert.equal(arrays.subsections[0].total, 6);
  assert.deepEqual(arrays.subsections[0].problems[0], { id: 1, title: 'Linear Search', difficulty: 'Basic', solved: true });
  assert.equal(arrays.subsections[0].problems[2].solved, false);
  assert.equal(path.filter((t) => t.isCurrent).length, 1);
});

test('selectPath: finished topic is done and the current marker moves on', () => {
  const solves = topicIds('Hashing').map((id) => solve(id, day(0)));
  const path = selectPath(state(solves, day(0), { currentTopic: 'Hashing' }));
  const hashing = path.find((t) => t.topic === 'Hashing');
  assert.equal(hashing.done, true);
  assert.equal(hashing.isCurrent, false);
  assert.equal(path.find((t) => t.isCurrent).topic, 'Binary Search');
});

test('selectPath: everything solved has no current topic', () => {
  const solves = ALL_IDS.map((id) => solve(id, day(0)));
  const path = selectPath(state(solves, day(0)));
  assert.ok(path.every((t) => t.done));
  assert.ok(path.every((t) => !t.isCurrent));
});

test('selectPath: blank difficulty stays null', () => {
  const path = selectPath(state([], day(0)));
  const all = path.flatMap((t) => t.subsections.flatMap((s) => s.problems));
  assert.equal(all.filter((p) => p.difficulty === null).length, 8);
});

test('selectStats: new user', () => {
  assert.deepEqual(selectStats(state([], day(0))), {
    streak: 0, longest: 0, freezes: 0, statusByDay: {}, firstDay: null,
    daysPracticed: 0, solvedCount: 0, total: 405,
    xp: { total: 0, level: 1, xpIntoLevel: 0, xpForNext: 100, fraction: 0 },
  });
});

test('selectStats: mid-streak', () => {
  const solves = [solve(1, day(0)), solve(2, day(0)), solve(3, day(1))];
  const stats = selectStats(state(solves, day(1)));
  assert.equal(stats.streak, 2);
  assert.equal(stats.daysPracticed, 2);
  assert.equal(stats.solvedCount, 3);
  assert.equal(stats.firstDay, day(0));
  assert.deepEqual(stats.statusByDay, { [day(0)]: 'solved', [day(1)]: 'solved' });
  assert.equal(stats.xp.total, 40);
});

test('selectors do not change the state', () => {
  const s = state([solve(1, day(0))], day(1));
  const before = JSON.stringify(s);
  selectHome(s); selectPath(s); selectStats(s);
  assert.equal(JSON.stringify(s), before);
});
