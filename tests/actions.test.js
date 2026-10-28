// Action tests with a fake in-memory storage (the real database only runs in a browser).
import test, { beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { store, useStorage, init, markSolved, unmarkSolved, setGoal, setTheme,
  setCurrentTopic, refreshToday, exportBackup, importBackup } from '../src/state/actions.js';
import { fakeStorage } from './helpers/fake-storage.js';

const at = (y, m, d, h = 10) => new Date(y, m - 1, d, h).getTime();
let fake;

beforeEach(async () => {
  mock.timers.enable({ apis: ['Date'], now: at(2026, 6, 1) });
  fake = fakeStorage();
  useStorage(fake);
  await init();
});
afterEach(() => mock.timers.reset());

test('init loads data, sets today and marks the app ready', () => {
  const s = store.get();
  assert.equal(s.ready, true);
  assert.equal(s.today, '2026-06-01');
  assert.deepEqual(s.solves, []);
  assert.equal(s.settings.theme, 'system');
  assert.deepEqual(s.settings.goalHistory, [{ from: '0000-01-01', goal: 1 }]);
});

test('markSolved saves to storage and the store, with today and the time', async () => {
  const solve = await markSolved(1);
  assert.deepEqual(solve, { problemId: 1, day: '2026-06-01', at: at(2026, 6, 1) });
  assert.deepEqual(fake.solves, [solve]);
  assert.deepEqual(store.get().solves, [solve]);
});

test('markSolved ignores unknown ids, bad values and already solved problems', async () => {
  assert.equal(await markSolved(999), null);
  assert.equal(await markSolved(0), null);
  assert.equal(await markSolved('1'), null);
  assert.equal(await markSolved(undefined), null);
  await markSolved(1);
  assert.equal(await markSolved(1), null);
  assert.equal(store.get().solves.length, 1);
  assert.equal(fake.solves.length, 1);
});

test('two fast taps on the same problem save it only once', async () => {
  await Promise.all([markSolved(5), markSolved(5)]);
  assert.equal(store.get().solves.length, 1);
});

test('if saving fails, the store is NOT changed', async () => {
  fake.failWrites = true;
  await assert.rejects(markSolved(1), /disk full/);
  assert.deepEqual(store.get().solves, []);
});

test('unmarkSolved removes the solve; solving again uses that moment\'s day', async () => {
  await markSolved(1);
  assert.equal(await unmarkSolved(1), true);
  assert.deepEqual(store.get().solves, []);
  assert.deepEqual(fake.solves, []);
  assert.equal(await unmarkSolved(1), false);
  mock.timers.setTime(at(2026, 6, 3));
  const again = await markSolved(1);
  assert.equal(again.day, '2026-06-03');
  assert.equal(store.get().today, '2026-06-03');
});

test('setGoal adds an entry for today; a second change today replaces it', async () => {
  await setGoal(2);
  assert.deepEqual(store.get().settings.goalHistory, [
    { from: '0000-01-01', goal: 1 }, { from: '2026-06-01', goal: 2 },
  ]);
  await setGoal(3);
  assert.deepEqual(store.get().settings.goalHistory, [
    { from: '0000-01-01', goal: 1 }, { from: '2026-06-01', goal: 3 },
  ]);
  assert.deepEqual(fake.settings.goalHistory, store.get().settings.goalHistory);
});

test('setGoal on a later day keeps the earlier goal for past days', async () => {
  await setGoal(2);
  mock.timers.setTime(at(2026, 6, 5));
  await setGoal(3);
  assert.deepEqual(store.get().settings.goalHistory.map((e) => [e.from, e.goal]), [
    ['0000-01-01', 1], ['2026-06-01', 2], ['2026-06-05', 3],
  ]);
});

test('setGoal ignores values other than 1, 2 and 3', async () => {
  for (const bad of [0, 4, 1.5, '2', null, undefined]) await setGoal(bad);
  assert.deepEqual(store.get().settings.goalHistory, [{ from: '0000-01-01', goal: 1 }]);
});

test('setTheme accepts the three themes and ignores others', async () => {
  await setTheme('dark');
  assert.equal(store.get().settings.theme, 'dark');
  assert.equal(fake.settings.theme, 'dark');
  await setTheme('purple');
  assert.equal(store.get().settings.theme, 'dark');
  await setTheme('light');
  await setTheme('system');
  assert.equal(store.get().settings.theme, 'system');
});

test('setCurrentTopic accepts a known topic or null, ignores unknown names', async () => {
  await setCurrentTopic('Graphs');
  assert.equal(store.get().settings.currentTopic, 'Graphs');
  assert.equal(fake.settings.currentTopic, 'Graphs');
  await setCurrentTopic('Nope');
  assert.equal(store.get().settings.currentTopic, 'Graphs');
  await setCurrentTopic(null);
  assert.equal(store.get().settings.currentTopic, null);
});

test('changing settings keeps the other settings', async () => {
  await setTheme('dark');
  await setCurrentTopic('Heaps');
  await setGoal(2);
  const s = store.get().settings;
  assert.equal(s.theme, 'dark');
  assert.equal(s.currentTopic, 'Heaps');
  assert.equal(s.lastBackupAt, null);
});

test('refreshToday reads the clock again and only notifies when the day changed', () => {
  let calls = 0;
  const stop = store.subscribe(() => { calls++; });
  refreshToday();
  assert.equal(calls, 0);
  mock.timers.setTime(at(2026, 6, 2, 0));
  refreshToday();
  assert.equal(store.get().today, '2026-06-02');
  assert.equal(calls, 1);
  stop();
});

// ---------- backup (Phase 8) ----------

const goodFile = (extra = {}) => JSON.stringify({
  app: 'dsa-streak', version: 1, exportedAt: '2026-05-01T10:00:00.000Z',
  settings: { goalHistory: [{ from: '0000-01-01', goal: 2 }], theme: 'dark', currentTopic: 'Arrays', lastBackupAt: 1777629600000 },
  solves: [{ problemId: 3, day: '2026-04-30', at: 1777543200000 }, { problemId: 4, day: '2026-05-01', at: 1777629600000 }],
  ...extra,
});

test('exportBackup returns the file name and text, and sets lastBackupAt', async () => {
  await markSolved(1);
  mock.timers.setTime(at(2026, 6, 3, 8));
  const { filename, text } = await exportBackup();
  assert.equal(filename, 'dsa-streak-backup-2026-06-03.json');
  const data = JSON.parse(text);
  assert.equal(data.app, 'dsa-streak');
  assert.deepEqual(data.solves.map((x) => x.problemId), [1]);
  assert.equal(store.get().settings.lastBackupAt, at(2026, 6, 3, 8));
  assert.equal(fake.settings.lastBackupAt, at(2026, 6, 3, 8));
  assert.equal(data.settings.lastBackupAt, at(2026, 6, 3, 8));
});

test('exportBackup fails (and does not set lastBackupAt) if saving fails', async () => {
  await markSolved(1);
  fake.failWrites = true;
  await assert.rejects(exportBackup(), /disk full/);
  assert.equal(store.get().settings.lastBackupAt, null);
});

test('export then import on a fresh phone restores everything', async () => {
  await markSolved(1);
  await markSolved(2);
  await setGoal(3);
  await setTheme('light');
  await setCurrentTopic('Arrays');
  const { text } = await exportBackup();
  const before = structuredClone({ solves: store.get().solves, settings: store.get().settings });

  fake = fakeStorage(); // site data cleared
  useStorage(fake);
  await init();
  assert.deepEqual(store.get().solves, []);

  const result = await importBackup(text);
  assert.deepEqual(result, { ok: true, solveCount: 2 });
  assert.deepEqual(store.get().solves, before.solves);
  assert.deepEqual(store.get().settings, before.settings);
  assert.deepEqual(fake.solves, before.solves);
  assert.deepEqual(fake.settings, before.settings);
  assert.equal(store.get().ready, true);
});

test('importBackup replaces what was there (solves and settings)', async () => {
  await markSolved(1);
  await setTheme('light');
  const result = await importBackup(goodFile());
  assert.equal(result.ok, true);
  assert.deepEqual(store.get().solves.map((x) => x.problemId), [3, 4]);
  assert.equal(store.get().settings.theme, 'dark');
  assert.deepEqual(store.get().settings.goalHistory, [{ from: '0000-01-01', goal: 2 }]);
  assert.equal(store.get().settings.currentTopic, 'Arrays');
  assert.equal(store.get().today, '2026-06-01');
});

test('importBackup: a bad file changes nothing and lists every error', async () => {
  await markSolved(1);
  const solvesBefore = structuredClone(store.get().solves);
  const settingsBefore = structuredClone(store.get().settings);
  const bad = goodFile({ version: 5, solves: [{ problemId: 999, day: 'x', at: 'y' }] });
  const result = await importBackup(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 4);
  assert.deepEqual(store.get().solves, solvesBefore);
  assert.deepEqual(store.get().settings, settingsBefore);
  assert.deepEqual(fake.solves, solvesBefore);
});

test('importBackup: text that is not JSON is rejected and nothing changes', async () => {
  await markSolved(1);
  const result = await importBackup('hello');
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /JSON/);
  assert.equal(store.get().solves.length, 1);
});

test('importBackup: if saving fails, nothing changes and the user is told', async () => {
  await markSolved(1);
  const errors = mock.method(console, 'error', () => {});
  fake.failWrites = true;
  const result = await importBackup(goodFile());
  errors.mock.restore();
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /Nothing was changed/);
  assert.deepEqual(store.get().solves.map((x) => x.problemId), [1]);
  assert.equal(store.get().settings.theme, 'system');
});

test('importBackup: validates before touching storage', async () => {
  let called = false;
  fake.replaceAll = async () => { called = true; };
  await importBackup('{"app":"x"}');
  assert.equal(called, false);
});
