// Backup tests: build, validate, restore, and the 14-day reminder rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBackup, validateBackup, parseBackup, backupToState, backupFileName, needsBackupReminder,
  BACKUP_APP, BACKUP_VERSION,
} from '../src/core/backup.js';
import { TOPICS } from '../src/core/catalog.js';
import { addDays } from '../src/core/dates.js';

const NOW = new Date(2026, 5, 10, 9, 30).getTime();
const settings = () => ({
  goalHistory: [{ from: '0000-01-01', goal: 1 }, { from: '2026-05-01', goal: 3 }],
  theme: 'dark',
  currentTopic: TOPICS[2].name,
  lastBackupAt: null,
});
const solves = () => [
  { problemId: 1, day: '2026-06-01', at: 1780000000000 },
  { problemId: 7, day: '2026-06-02', at: 1780086400000 },
];
const good = () => buildBackup({ solves: solves(), settings: settings() }, NOW);
const withChange = (change) => {
  const data = good();
  change(data);
  return data;
};
const failsWith = (data, pattern) => {
  const result = validateBackup(data);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => pattern.test(e)), `expected an error matching ${pattern}, got: ${result.errors.join(' | ')}`);
  return result;
};

test('buildBackup: file shape, export time and file name', () => {
  const data = good();
  assert.equal(data.app, BACKUP_APP);
  assert.equal(data.version, BACKUP_VERSION);
  assert.equal(data.exportedAt, new Date(NOW).toISOString());
  assert.equal(data.settings.lastBackupAt, NOW);
  assert.deepEqual(data.solves, solves());
  assert.equal(backupFileName(new Date(2026, 5, 10, 23, 59)), 'dsa-streak-backup-2026-06-10.json');
  assert.equal(backupFileName(new Date(2026, 0, 5)), 'dsa-streak-backup-2026-01-05.json');
});

test('buildBackup: does not change what it was given and drops extra fields', () => {
  const input = { solves: [{ problemId: 1, day: '2026-06-01', at: 5, extra: 'x' }], settings: { ...settings(), junk: 1 } };
  const copy = structuredClone(input);
  const data = buildBackup(input, NOW);
  assert.deepEqual(input, copy);
  assert.deepEqual(Object.keys(data.solves[0]), ['problemId', 'day', 'at']);
  assert.equal('junk' in data.settings, false);
});

test('validateBackup: a good file passes, even with no solves or a null topic', () => {
  assert.deepEqual(validateBackup(good()), { ok: true, errors: [] });
  assert.equal(validateBackup(buildBackup({ solves: [], settings: { ...settings(), currentTopic: null } }, NOW)).ok, true);
});

test('validateBackup: lastBackupAt may be missing or null in the file', () => {
  assert.equal(validateBackup(withChange((d) => { delete d.settings.lastBackupAt; })).ok, true);
  assert.equal(validateBackup(withChange((d) => { d.settings.lastBackupAt = null; })).ok, true);
});

test('validateBackup: not an object', () => {
  for (const value of [null, undefined, 5, 'text', true, [], [good()]]) {
    const result = validateBackup(value);
    assert.equal(result.ok, false);
    assert.equal(result.errors.length, 1);
  }
});

test('validateBackup: wrong app or version', () => {
  failsWith(withChange((d) => { d.app = 'other-app'; }), /not a DSA Streak backup/);
  failsWith(withChange((d) => { delete d.app; }), /not a DSA Streak backup/);
  failsWith(withChange((d) => { d.version = 2; }), /version/);
  failsWith(withChange((d) => { d.version = '1'; }), /version/);
  failsWith(withChange((d) => { delete d.version; }), /version/);
});

test('validateBackup: bad exportedAt', () => {
  for (const bad of [undefined, null, 12345, 'yesterday', '2026-13-45T00:00:00Z', '2026-06-10', {}]) {
    failsWith(withChange((d) => { d.exportedAt = bad; }), /exportedAt/);
  }
});

test('validateBackup: settings missing or wrong types', () => {
  failsWith(withChange((d) => { delete d.settings; }), /Settings are missing/);
  failsWith(withChange((d) => { d.settings = null; }), /Settings are missing/);
  failsWith(withChange((d) => { d.settings = []; }), /Settings are missing/);
  failsWith(withChange((d) => { d.settings = 'dark'; }), /Settings are missing/);
  failsWith(withChange((d) => { delete d.settings.theme; }), /theme/);
  failsWith(withChange((d) => { delete d.settings.goalHistory; }), /goalHistory must be a list/);
  failsWith(withChange((d) => { d.settings.goalHistory = 'x'; }), /goalHistory must be a list/);
  failsWith(withChange((d) => { delete d.settings.currentTopic; }), /currentTopic/);
  failsWith(withChange((d) => { d.settings.lastBackupAt = 'today'; }), /lastBackupAt/);
  failsWith(withChange((d) => { d.settings.lastBackupAt = NaN; }), /lastBackupAt/);
});

test('validateBackup: theme must be system, light or dark', () => {
  for (const theme of ['system', 'light', 'dark']) {
    assert.equal(validateBackup(withChange((d) => { d.settings.theme = theme; })).ok, true);
  }
  for (const bad of ['blue', 'Dark', '', null, 1]) {
    failsWith(withChange((d) => { d.settings.theme = bad; }), /theme/);
  }
});

test('validateBackup: currentTopic must be a known topic name or null', () => {
  for (const topic of TOPICS) {
    assert.equal(validateBackup(withChange((d) => { d.settings.currentTopic = topic.name; })).ok, true);
  }
  assert.equal(validateBackup(withChange((d) => { d.settings.currentTopic = null; })).ok, true);
  for (const bad of ['Not a topic', '', 3, {}, 'arrays']) {
    failsWith(withChange((d) => { d.settings.currentTopic = bad; }), /currentTopic/);
  }
});

test('validateBackup: goalHistory is empty', () => {
  failsWith(withChange((d) => { d.settings.goalHistory = []; }), /goalHistory is empty/);
});

test('validateBackup: goalHistory is unsorted or has the same day twice', () => {
  failsWith(withChange((d) => {
    d.settings.goalHistory = [{ from: '2026-05-01', goal: 2 }, { from: '2026-01-01', goal: 1 }];
  }), /sorted/);
  failsWith(withChange((d) => {
    d.settings.goalHistory = [{ from: '2026-05-01', goal: 2 }, { from: '2026-05-01', goal: 3 }];
  }), /sorted/);
});

test('validateBackup: goalHistory has bad day strings', () => {
  for (const bad of ['2026-02-30', '2026-6-1', 'June 1', '', null, 20260601]) {
    failsWith(withChange((d) => { d.settings.goalHistory = [{ from: bad, goal: 1 }]; }), /invalid date/);
  }
});

test('validateBackup: goalHistory goals must be 1, 2 or 3', () => {
  for (const bad of [0, 4, -1, 1.5, '2', null, undefined, NaN]) {
    failsWith(withChange((d) => { d.settings.goalHistory = [{ from: '2026-01-01', goal: bad }]; }), /goal must be 1, 2 or 3/);
  }
  for (const ok of [1, 2, 3]) {
    assert.equal(validateBackup(withChange((d) => { d.settings.goalHistory = [{ from: '2026-01-01', goal: ok }]; })).ok, true);
  }
});

test('validateBackup: goalHistory entries that are not objects', () => {
  failsWith(withChange((d) => { d.settings.goalHistory = [null]; }), /not an object/);
  failsWith(withChange((d) => { d.settings.goalHistory = [5]; }), /not an object/);
});

test('validateBackup: solves is not an array', () => {
  for (const bad of [undefined, null, {}, 'x', 5]) {
    failsWith(withChange((d) => { d.solves = bad; }), /Solves are missing/);
  }
});

test('validateBackup: problemId must be an integer in the valid id list', () => {
  for (const bad of [0, 406, -3, 1.5, '1', null, undefined, NaN, {}]) {
    failsWith(withChange((d) => { d.solves[0].problemId = bad; }), /problemId/);
  }
  assert.equal(validateBackup(withChange((d) => { d.solves[0].problemId = 405; })).ok, true);
});

test('validateBackup: a custom valid id list is respected (tests only)', () => {
  assert.equal(validateBackup(good(), [1, 7]).ok, true);
  assert.equal(validateBackup(good(), new Set([1])).ok, false);
});

test('validateBackup: duplicate problemId', () => {
  failsWith(withChange((d) => { d.solves[1].problemId = 1; }), /#1 appears more than once/);
});

test('validateBackup: invalid solve day', () => {
  for (const bad of ['2026-02-30', '2026-6-1', '', null, undefined, 20260601, 'yesterday']) {
    failsWith(withChange((d) => { d.solves[0].day = bad; }), /day .* not a valid date/);
  }
});

test('validateBackup: solve "at" must be a number', () => {
  for (const bad of ['123', null, undefined, NaN, Infinity, {}]) {
    failsWith(withChange((d) => { d.solves[0].at = bad; }), /at .* must be a number/);
  }
});

test('validateBackup: solves that are not objects', () => {
  failsWith(withChange((d) => { d.solves = [null, 5]; }), /Solve 1 is not an object/);
});

test('validateBackup: returns EVERY error found, as readable text', () => {
  const data = {
    app: 'nope', version: 9, exportedAt: 'never',
    settings: { goalHistory: [], theme: 'pink', currentTopic: 'Nowhere' },
    solves: [{ problemId: 0, day: 'x', at: 'y' }, { problemId: 1, day: '2026-06-01', at: 1 }, { problemId: 1, day: '2026-06-01', at: 1 }],
  };
  const { ok, errors } = validateBackup(data);
  assert.equal(ok, false);
  // app, version, exportedAt, theme, currentTopic, goalHistory, problemId, day, at, duplicate
  assert.equal(errors.length, 10);
  for (const message of errors) assert.equal(typeof message, 'string');
  assert.ok(errors.every((e) => e.length > 10));
});

test('parseBackup: text that is not JSON is rejected with a readable error', () => {
  const result = parseBackup('{ not json');
  assert.equal(result.ok, false);
  assert.equal(result.data, null);
  assert.match(result.errors[0], /not valid JSON/);
  assert.equal(parseBackup('').ok, false);
});

test('parseBackup: valid text returns the data, bad content returns the errors', () => {
  const text = JSON.stringify(good());
  const result = parseBackup(text);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, good());
  const bad = parseBackup(JSON.stringify({ ...good(), version: 2 }));
  assert.equal(bad.ok, false);
  assert.equal(bad.data, null);
});

test('round trip: build, to text, parse, validate, restore gives the same state', () => {
  const state = { solves: solves(), settings: settings() };
  const text = JSON.stringify(buildBackup(state, NOW), null, 2);
  const parsed = parseBackup(text);
  assert.equal(parsed.ok, true);
  const restored = backupToState(parsed.data);
  assert.deepEqual(restored.solves, state.solves);
  assert.deepEqual(restored.settings, { ...state.settings, currentProblemId: null, skippedIds: [], lastBackupAt: NOW });
});

test('round trip: an empty state and a file with a missing lastBackupAt', () => {
  const empty = { solves: [], settings: { ...settings(), currentTopic: null } };
  const parsed = parseBackup(JSON.stringify(buildBackup(empty, NOW)));
  assert.equal(parsed.ok, true);
  assert.deepEqual(backupToState(parsed.data).solves, []);
  const data = good();
  delete data.settings.lastBackupAt;
  assert.equal(backupToState(data).settings.lastBackupAt, null);
});

test('backupToState: drops unknown fields', () => {
  const data = good();
  data.extra = 1;
  data.settings.junk = 2;
  data.solves[0].note = 'x';
  const state = backupToState(data);
  assert.deepEqual(Object.keys(state), ['solves', 'settings']);
  assert.deepEqual(Object.keys(state.solves[0]), ['problemId', 'day', 'at']);
  assert.deepEqual(Object.keys(state.settings).sort(), ['currentProblemId', 'currentTopic', 'goalHistory', 'lastBackupAt', 'skippedIds', 'theme']);
});

test('backup keeps the Next up pointer and the skipped list, and old backups without them still load', () => {
  const state = { solves: solves(), settings: { ...settings(), currentProblemId: 7, skippedIds: [3, 5] } };
  const parsed = parseBackup(JSON.stringify(buildBackup(state, NOW)));
  assert.equal(parsed.ok, true);
  const restored = backupToState(parsed.data);
  assert.equal(restored.settings.currentProblemId, 7);
  assert.deepEqual(restored.settings.skippedIds, [3, 5]);
  // An old file has neither field.
  const old = good();
  delete old.settings.currentProblemId;
  delete old.settings.skippedIds;
  assert.equal(validateBackup(old).ok, true);
  assert.equal(backupToState(old).settings.currentProblemId, null);
  assert.deepEqual(backupToState(old).settings.skippedIds, []);
});

test('validateBackup: bad currentProblemId or skippedIds', () => {
  failsWith(withChange((d) => { d.settings.currentProblemId = 99999; }), /currentProblemId/);
  failsWith(withChange((d) => { d.settings.currentProblemId = 'x'; }), /currentProblemId/);
  failsWith(withChange((d) => { d.settings.skippedIds = 'x'; }), /skippedIds must be a list/);
  failsWith(withChange((d) => { d.settings.skippedIds = [1, 99999]; }), /skippedIds has 99999/);
  failsWith(withChange((d) => { d.settings.skippedIds = [2, 2]; }), /more than once/);
  assert.equal(validateBackup(withChange((d) => { d.settings.skippedIds = []; d.settings.currentProblemId = null; })).ok, true);
});

// ---------- needsBackupReminder ----------

const day = (n) => addDays('2026-01-01', n);
const noon = (n) => {
  const [y, m, d] = day(n).split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
};
const oneSolve = [{ problemId: 1, day: day(0), at: 1 }];

test('needsBackupReminder: never backed up counts from the oldest solve (14 days on, 13 days off)', () => {
  assert.equal(needsBackupReminder(oneSolve, null, day(14)), true);
  assert.equal(needsBackupReminder(oneSolve, null, day(13)), false);
  assert.equal(needsBackupReminder(oneSolve, null, day(15)), true);
  assert.equal(needsBackupReminder(oneSolve, null, day(0)), false);
});

test('needsBackupReminder: never backed up uses the OLDEST of several solves', () => {
  const many = [{ problemId: 2, day: day(10), at: 1 }, { problemId: 1, day: day(0), at: 1 }];
  assert.equal(needsBackupReminder(many, null, day(14)), true);
});

test('needsBackupReminder: counts from the last backup when there is one', () => {
  assert.equal(needsBackupReminder(oneSolve, noon(20), day(33)), false);
  assert.equal(needsBackupReminder(oneSolve, noon(20), day(34)), true);
  // an old solve does not matter once a recent backup exists
  assert.equal(needsBackupReminder(oneSolve, noon(100), day(110)), false);
});

test('needsBackupReminder: no solves and never backed up means no reminder', () => {
  assert.equal(needsBackupReminder([], null, day(100)), false);
});

test('needsBackupReminder: a backup or solve dated after today does not trigger it', () => {
  assert.equal(needsBackupReminder(oneSolve, noon(50), day(10)), false);
  assert.equal(needsBackupReminder([{ problemId: 1, day: day(30), at: 1 }], null, day(10)), false);
});
