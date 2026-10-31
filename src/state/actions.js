// Everything the app can DO. Each action writes to the database FIRST,
// and only then updates the in-memory store (so screen and database never disagree).
import * as realDb from '../data/db.js';
import { createStore } from './store.js';
import { toDayString } from '../core/dates.js';
import { withGoalChange } from '../core/xp.js';
import { TOPICS, getProblem } from '../core/catalog.js';
import { buildBackup, parseBackup, backupToState, backupFileName } from '../core/backup.js';

// The one shared store. State: { ready, today, solves, settings }.
export const store = createStore({ ready: false, today: '', solves: [], settings: null });

// The storage in use. Tests can swap in a fake one with useStorage().
let db = realDb;
export function useStorage(storage) {
  db = storage;
}

const THEMES = ['system', 'light', 'dark'];

// Today's date from the phone's clock.
function currentDay() {
  return toDayString(new Date());
}

// Save new settings (merged with the old ones), then update the store.
async function updateSettings(patch) {
  const settings = { ...store.get().settings, ...patch };
  await db.saveSettings(settings);
  store.set({ settings });
}

// Opens the database, loads everything, and marks the app ready.
export async function init() {
  await db.openDb();
  const { solves, settings } = await db.loadAll();
  db.requestPersistence(); // fire and forget
  store.set({ ready: true, today: currentDay(), solves, settings });
}

// "Solved" button. Unknown ids and already solved problems are ignored.
// Returns the new solve event, or null if nothing happened.
export async function markSolved(problemId) {
  if (!getProblem(problemId)) return null;
  if (store.get().solves.some((s) => s.problemId === problemId)) return null;
  const day = currentDay();
  const solve = { problemId, day, at: Date.now() };
  await db.putSolve(solve);
  // Read the state again: it may have changed while we were saving.
  const others = store.get().solves.filter((s) => s.problemId !== problemId);
  store.set({ solves: [...others, solve], today: day });
  // Solving a skipped problem takes it off the skipped list.
  const skipped = store.get().settings.skippedIds ?? [];
  if (skipped.includes(problemId)) await updateSettings({ skippedIds: skipped.filter((id) => id !== problemId) });
  return solve;
}

// Undo, or unchecking a problem. Does nothing if it was not solved.
export async function unmarkSolved(problemId) {
  if (!store.get().solves.some((s) => s.problemId === problemId)) return false;
  await db.deleteSolve(problemId);
  store.set({ solves: store.get().solves.filter((s) => s.problemId !== problemId) });
  return true;
}

// Daily goal: 1, 2 or 3. Past days keep their old goal (Brief D4).
export async function setGoal(goal) {
  if (![1, 2, 3].includes(goal)) return;
  const today = currentDay();
  const goalHistory = withGoalChange(store.get().settings.goalHistory, today, goal);
  await updateSettings({ goalHistory });
  store.set({ today });
}

// Theme: 'system', 'light' or 'dark'.
export async function setTheme(theme) {
  if (!THEMES.includes(theme)) return;
  await updateSettings({ theme });
}

// Sound effects on or off (true / false). Not part of the backup file: it is a phone setting.
export async function setSound(on) {
  if (typeof on !== 'boolean') return;
  await updateSettings({ soundOn: on });
}

// "Continue here": a topic name, or null. Unknown names are ignored.
export async function setCurrentTopic(name) {
  if (name !== null && !TOPICS.some((t) => t.name === name)) return;
  await updateSettings({ currentTopic: name });
}

// "Continue here" on a problem: Next up starts from this problem. If it was skipped, it is not skipped any more
// (going back to it by hand is the one way to bring a skipped problem back). Unknown ids are ignored.
// A problem that is already solved just means "carry on after it". Returns true if something was saved.
export async function continueFrom(problemId) {
  const problem = getProblem(problemId);
  if (!problem) return false;
  const skipped = store.get().settings.skippedIds ?? [];
  await updateSettings({
    currentProblemId: problemId,
    currentTopic: problem.topic,
    skippedIds: skipped.filter((id) => id !== problemId),
  });
  return true;
}

// "Skip": the problem stays unsolved (no XP, no streak) but Next up moves on past it, and it stays skipped
// until the user goes back to it. Unknown or already solved problems are ignored. Returns true if saved.
export async function skipProblem(problemId) {
  if (!getProblem(problemId)) return false;
  if (store.get().solves.some((s) => s.problemId === problemId)) return false;
  const skipped = store.get().settings.skippedIds ?? [];
  await updateSettings({
    currentProblemId: problemId,
    skippedIds: skipped.includes(problemId) ? skipped : [...skipped, problemId],
  });
  return true;
}

// Takes a problem off the skipped list (the Undo of Skip). Returns true if it was skipped.
export async function unskipProblem(problemId) {
  const skipped = store.get().settings.skippedIds ?? [];
  if (!skipped.includes(problemId)) return false;
  await updateSettings({ skippedIds: skipped.filter((id) => id !== problemId) });
  return true;
}

// Reads the phone's clock again (app came back, window focused, midnight passed).
export function refreshToday() {
  const today = currentDay();
  if (today !== store.get().today) store.set({ today });
}

// Backup. Builds the backup file from the current data and remembers when it was made.
// Returns { filename, text }; the Settings screen turns that into a download.
export async function exportBackup() {
  const now = Date.now();
  const { solves, settings } = store.get();
  const text = JSON.stringify(buildBackup({ solves, settings }, now), null, 2);
  await updateSettings({ lastBackupAt: now });
  return { filename: backupFileName(new Date(now)), text };
}

// Restore from backup TEXT. Checks the whole file first, then replaces ALL data in one
// transaction, then reloads the state from storage. On any failure nothing changes.
// Returns { ok: true, solveCount } or { ok: false, errors: [...] }.
export async function importBackup(jsonText) {
  const parsed = parseBackup(jsonText);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const data = backupToState(parsed.data);
  // The sound switch belongs to this phone, so a restore keeps whatever it is now.
  data.settings.soundOn = store.get().settings.soundOn !== false;
  try {
    await db.replaceAll(data);
    const { solves, settings } = await db.loadAll();
    store.set({ solves, settings, today: currentDay() });
  } catch (error) {
    console.error(error);
    return { ok: false, errors: ['Could not save the backup on this phone. Nothing was changed.'] };
  }
  return { ok: true, solveCount: data.solves.length };
}
