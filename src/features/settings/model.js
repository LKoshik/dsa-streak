// Small pure helpers for the Settings screen.
import { toDayString } from '../../core/dates.js';
import { MONTH_NAMES } from '../../core/calendar.js';

export const GOAL_OPTIONS = [1, 2, 3];
export const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_ERRORS_SHOWN = 8;

// '10 Jun 2026' for a time in milliseconds (the phone's local day), or 'Never'.
export function formatBackupDate(at) {
  if (typeof at !== 'number' || !Number.isFinite(at)) return 'Never';
  const [y, m, d] = toDayString(new Date(at)).split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}

// A long error list is cut to the first few, plus a count of the rest.
export function limitErrors(errors, max = MAX_ERRORS_SHOWN) {
  if (errors.length <= max) return { shown: errors, hidden: 0 };
  return { shown: errors.slice(0, max), hidden: errors.length - max };
}

// '12 solved problems' / '1 solved problem'
export function solvedWords(count) {
  return `${count} solved ${count === 1 ? 'problem' : 'problems'}`;
}
