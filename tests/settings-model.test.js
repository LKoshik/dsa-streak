import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBackupDate, limitErrors, solvedWords, GOAL_OPTIONS, THEME_OPTIONS } from '../src/features/settings/model.js';

test('formatBackupDate: never, or day month year in the phone\'s local day', () => {
  assert.equal(formatBackupDate(null), 'Never');
  assert.equal(formatBackupDate(undefined), 'Never');
  assert.equal(formatBackupDate(NaN), 'Never');
  assert.equal(formatBackupDate('x'), 'Never');
  assert.equal(formatBackupDate(new Date(2026, 5, 10, 12).getTime()), '10 Jun 2026');
  assert.equal(formatBackupDate(new Date(2026, 0, 1, 0, 5).getTime()), '1 Jan 2026');
  assert.equal(formatBackupDate(new Date(2026, 11, 31, 23, 55).getTime()), '31 Dec 2026');
});

test('limitErrors: short lists stay whole, long lists are cut with a count', () => {
  assert.deepEqual(limitErrors(['a', 'b']), { shown: ['a', 'b'], hidden: 0 });
  const many = Array.from({ length: 20 }, (_, i) => `e${i}`);
  const cut = limitErrors(many);
  assert.equal(cut.shown.length, 8);
  assert.equal(cut.hidden, 12);
  assert.deepEqual(limitErrors(many, 20), { shown: many, hidden: 0 });
  assert.deepEqual(limitErrors([]), { shown: [], hidden: 0 });
});

test('solvedWords and the option lists', () => {
  assert.equal(solvedWords(0), '0 solved problems');
  assert.equal(solvedWords(1), '1 solved problem');
  assert.equal(solvedWords(405), '405 solved problems');
  assert.deepEqual(GOAL_OPTIONS, [1, 2, 3]);
  assert.deepEqual(THEME_OPTIONS.map((o) => o.value), ['system', 'light', 'dark']);
});
