// Backup file: build it, check it, turn it back into app data, and the 14-day reminder rule.
// Pure code: no screen, no storage, no clock (callers pass the time in).
//
// The file is JSON text:
//   { app: 'dsa-streak', version: 1, exportedAt: '2026-06-10T09:30:00.000Z',
//     settings: { goalHistory, theme, currentTopic, lastBackupAt },
//     solves: [{ problemId, day, at }] }
import { PROBLEMS } from './problems.data.js';
import { TOPICS } from './catalog.js';
import { isValidDay, toDayString, eachDay } from './dates.js';

export const BACKUP_APP = 'dsa-streak';
export const BACKUP_VERSION = 1;
export const BACKUP_REMINDER_DAYS = 14;
const THEMES = ['system', 'light', 'dark'];
const ISO_START = /^\d{4}-\d{2}-\d{2}T/;

const DEFAULT_VALID_IDS = new Set(PROBLEMS.map((p) => p.id));
const TOPIC_NAMES = new Set(TOPICS.map((t) => t.name));

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isInteger = (value) => typeof value === 'number' && Number.isInteger(value);
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const show = (value) => {
  const text = typeof value === 'string' ? JSON.stringify(value) : String(JSON.stringify(value));
  return text.length > 40 ? `${text.slice(0, 37)}...` : text;
};

// 'dsa-streak-backup-2026-06-10.json' for a Date (the phone's local day).
export function backupFileName(date) {
  return `dsa-streak-backup-${toDayString(date)}.json`;
}

// Makes the backup object. `now` is a time in milliseconds.
// lastBackupAt inside the file is the export time itself, so a restored phone remembers it.
export function buildBackup({ solves, settings }, now) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    settings: {
      goalHistory: settings.goalHistory.map((e) => ({ from: e.from, goal: e.goal })),
      theme: settings.theme,
      currentTopic: settings.currentTopic ?? null,
      lastBackupAt: now,
    },
    solves: solves.map((s) => ({ problemId: s.problemId, day: s.day, at: s.at })),
  };
}

// Checks goalHistory. Pushes readable messages into `errors`.
function checkGoalHistory(history, errors) {
  if (!Array.isArray(history)) {
    errors.push('Settings: goalHistory must be a list.');
    return;
  }
  if (history.length === 0) {
    errors.push('Settings: goalHistory is empty (it needs at least one entry).');
    return;
  }
  let previous = null;
  history.forEach((entry, i) => {
    const name = `Settings: goalHistory entry ${i + 1}`;
    if (!isObject(entry)) {
      errors.push(`${name} is not an object.`);
      previous = null;
      return;
    }
    const dayOk = typeof entry.from === 'string' && isValidDay(entry.from);
    if (!dayOk) errors.push(`${name} has an invalid date ${show(entry.from)} (use YYYY-MM-DD).`);
    if (!isInteger(entry.goal) || entry.goal < 1 || entry.goal > 3) {
      errors.push(`${name} has goal ${show(entry.goal)}, but the goal must be 1, 2 or 3.`);
    }
    if (dayOk) {
      if (previous !== null && entry.from <= previous) {
        errors.push(`${name} (${entry.from}) is not after the entry before it: goalHistory must be sorted by date, oldest first.`);
      }
      previous = entry.from;
    }
  });
}

// Checks the settings object.
function checkSettings(settings, errors) {
  if (!isObject(settings)) {
    errors.push('Settings are missing or are not an object.');
    return;
  }
  if (!THEMES.includes(settings.theme)) {
    errors.push(`Settings: theme is ${show(settings.theme)}, but it must be "system", "light" or "dark".`);
  }
  const topic = settings.currentTopic;
  if (topic !== null && !(typeof topic === 'string' && TOPIC_NAMES.has(topic))) {
    errors.push(`Settings: currentTopic ${show(topic)} is not a topic of this list (use a topic name or null).`);
  }
  const last = settings.lastBackupAt;
  if (last !== undefined && last !== null && !isNumber(last)) {
    errors.push(`Settings: lastBackupAt is ${show(last)}, but it must be a number or null.`);
  }
  checkGoalHistory(settings.goalHistory, errors);
}

// Checks the solves list.
function checkSolves(solves, validIds, errors) {
  if (!Array.isArray(solves)) {
    errors.push('Solves are missing or are not a list.');
    return;
  }
  const seen = new Set();
  solves.forEach((solve, i) => {
    const name = `Solve ${i + 1}`;
    if (!isObject(solve)) {
      errors.push(`${name} is not an object.`);
      return;
    }
    if (!isInteger(solve.problemId) || !validIds.has(solve.problemId)) {
      errors.push(`${name}: problemId ${show(solve.problemId)} is not a problem number from this list.`);
    } else if (seen.has(solve.problemId)) {
      errors.push(`${name}: problem #${solve.problemId} appears more than once.`);
    } else {
      seen.add(solve.problemId);
    }
    if (typeof solve.day !== 'string' || !isValidDay(solve.day)) {
      errors.push(`${name}: day ${show(solve.day)} is not a valid date (use YYYY-MM-DD).`);
    }
    if (!isNumber(solve.at)) {
      errors.push(`${name}: at ${show(solve.at)} must be a number (a time in milliseconds).`);
    }
  });
}

// Checks a parsed backup. Returns { ok, errors } with EVERY problem found, as readable text.
// `validIds` is only for tests (a Set or list of allowed problem numbers).
export function validateBackup(data, validIds = DEFAULT_VALID_IDS) {
  const errors = [];
  const ids = validIds instanceof Set ? validIds : new Set(validIds);
  if (!isObject(data)) {
    return { ok: false, errors: ['This file is not a DSA Streak backup (the top level must be an object).'] };
  }
  if (data.app !== BACKUP_APP) {
    errors.push(`This is not a DSA Streak backup: app is ${show(data.app)}, expected "${BACKUP_APP}".`);
  }
  if (data.version !== BACKUP_VERSION) {
    errors.push(`Unsupported backup version ${show(data.version)}: this app reads version ${BACKUP_VERSION}.`);
  }
  if (typeof data.exportedAt !== 'string' || !ISO_START.test(data.exportedAt) || Number.isNaN(Date.parse(data.exportedAt))) {
    errors.push(`exportedAt ${show(data.exportedAt)} is not a valid date and time.`);
  }
  checkSettings(data.settings, errors);
  checkSolves(data.solves, ids, errors);
  return { ok: errors.length === 0, errors };
}

// Reads backup TEXT (what is inside the file). Returns { ok, errors, data }.
export function parseBackup(text, validIds) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['This file is not valid JSON, so it cannot be a DSA Streak backup.'], data: null };
  }
  const result = validateBackup(data, validIds);
  return { ...result, data: result.ok ? data : null };
}

// A VALID backup -> the data the app stores: { solves, settings }. Unknown fields are dropped.
export function backupToState(backup) {
  const s = backup.settings;
  return {
    solves: backup.solves.map((x) => ({ problemId: x.problemId, day: x.day, at: x.at })),
    settings: {
      goalHistory: s.goalHistory.map((e) => ({ from: e.from, goal: e.goal })),
      theme: s.theme,
      currentTopic: s.currentTopic,
      lastBackupAt: typeof s.lastBackupAt === 'number' ? s.lastBackupAt : null,
    },
  };
}

// Should Home nudge you to back up? (Brief D9)
// 14 or more days since the last backup. Never backed up: counted from the oldest solve.
// No solves and no backup: nothing to protect, so no reminder.
// `effectiveToday` is a day text; `lastBackupAt` is a time in milliseconds or null.
export function needsBackupReminder(solves, lastBackupAt, effectiveToday) {
  let reference = null;
  if (typeof lastBackupAt === 'number') {
    reference = toDayString(new Date(lastBackupAt));
  } else {
    for (const s of solves) if (reference === null || s.day < reference) reference = s.day;
  }
  if (reference === null || reference > effectiveToday) return false;
  return eachDay(reference, effectiveToday).length - 1 >= BACKUP_REMINDER_DAYS;
}
