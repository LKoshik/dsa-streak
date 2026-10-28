// Runs the real Settings screen code against a pretend page (tests/helpers/fake-dom.js).
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, hasText, byClass } from './helpers/fake-dom.js';
import { fakeStorage } from './helpers/fake-storage.js';
import * as actions from '../src/state/actions.js';
import * as selectors from '../src/state/selectors.js';
import settings from '../src/features/settings/index.js';
import { features } from '../src/features/index.js';
import { buildBackup } from '../src/core/backup.js';

const NOON = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
const tick = () => new Promise((resolve) => setImmediate(resolve));
let dom;
let fake;
let downloads;

async function setup(solves = []) {
  mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOON(2026, 6, 10) });
  dom = installFakeDom();
  fake = fakeStorage();
  fake.solves = solves;
  actions.useStorage(fake);
  await actions.init();
  downloads = [];
}

function mountSettings() {
  const root = document.createElement('main');
  dom.body.append(root);
  const download = (filename, text) => downloads.push({ filename, text });
  const unmount = settings.mount(root, { store: actions.store, actions, selectors, download });
  return { root, unmount };
}

const button = (root, text) => root.find((e) => e.tagName === 'button' && e.textContent.trim() === text);
const seg = (root, group, value) => root.find((e) => e.getAttribute('aria-label') === group)
  .find((e) => e.tagName === 'button' && e.dataset.value === String(value));
const isActive = (el) => el.getAttribute('aria-checked') === 'true';
const fileInput = (root) => root.find((e) => e.tagName === 'input');
const fakeFile = (text, size = text.length) => ({ size, text: async () => text });
const pickFile = async (root, file) => {
  const input = fileInput(root);
  input.files = [file];
  input.fire('change');
  await tick();
};
const goodBackupText = () => JSON.stringify(buildBackup({
  solves: [{ problemId: 3, day: '2026-05-01', at: NOON(2026, 5, 1) }, { problemId: 4, day: '2026-05-02', at: NOON(2026, 5, 2) }],
  settings: { goalHistory: [{ from: '0000-01-01', goal: 2 }], theme: 'dark', currentTopic: 'Arrays', lastBackupAt: null },
}, NOON(2026, 5, 3)));
const toastText = () => dom.body.textContent;

afterEach(() => {
  mock.timers.reset();
  if (dom) { dom.restore(); dom = null; }
});

test('settings is registered as the fourth screen', () => {
  assert.equal(settings.id, 'settings');
  assert.equal(features[3], settings);
});

test('settings: new user sees goal 1, theme System, last backup Never and the Habit tip', async () => {
  await setup();
  const { root } = mountSettings();
  assert.ok(hasText(root, 'Daily goal'));
  assert.ok(isActive(seg(root, 'Daily goal', 1)));
  assert.ok(!isActive(seg(root, 'Daily goal', 2)));
  assert.ok(!isActive(seg(root, 'Daily goal', 3)));
  assert.ok(isActive(seg(root, 'Theme', 'system')));
  assert.ok(hasText(root, 'Last backup: Never') || (hasText(root, 'Last backup:') && hasText(root, 'Never')));
  assert.ok(hasText(root, 'Habit tip'));
  assert.ok(hasText(root, 'One problem is enough.'));
  assert.equal(byClass(root, 'segmented').length, 3); // goal, theme, sound
  assert.ok(hasText(root, 'Sound'));
  assert.ok(isActive(seg(root, 'Sound', true)));
});

test('settings: tapping a goal uses setGoal and the control follows', async () => {
  await setup();
  const { root } = mountSettings();
  seg(root, 'Daily goal', 3).click();
  await tick();
  dom.flushFrames();
  assert.equal(fake.settings.goalHistory.at(-1).goal, 3);
  assert.equal(fake.settings.goalHistory.at(-1).from, '2026-06-10');
  assert.ok(isActive(seg(root, 'Daily goal', 3)));
  assert.ok(!isActive(seg(root, 'Daily goal', 1)));
});

test('settings: tapping a theme saves it and the control follows', async () => {
  await setup();
  const { root } = mountSettings();
  seg(root, 'Theme', 'dark').click();
  await tick();
  dom.flushFrames();
  assert.equal(actions.store.get().settings.theme, 'dark');
  assert.equal(fake.settings.theme, 'dark');
  assert.ok(isActive(seg(root, 'Theme', 'dark')));
  seg(root, 'Theme', 'light').click();
  await tick();
  assert.equal(actions.store.get().settings.theme, 'light');
});

test('settings: sound switch saves On/Off and the control follows', async () => {
  await setup();
  const { root } = mountSettings();
  seg(root, 'Sound', false).click();
  await tick();
  dom.flushFrames();
  assert.equal(actions.store.get().settings.soundOn, false);
  assert.equal(fake.settings.soundOn, false);
  assert.ok(isActive(seg(root, 'Sound', false)));
  assert.ok(!isActive(seg(root, 'Sound', true)));
  seg(root, 'Sound', true).click();
  await tick();
  assert.equal(fake.settings.soundOn, true);
});

test('import: a restore keeps this phone\'s sound switch', async () => {
  await setup();
  await actions.setSound(false);
  const { root } = mountSettings();
  await pickFile(root, fakeFile(goodBackupText()));
  button(root, 'Replace').click();
  await tick();
  dom.flushFrames();
  assert.equal(actions.store.get().settings.theme, 'dark'); // the backup was applied
  assert.equal(actions.store.get().settings.soundOn, false); // the sound switch was not touched
  assert.equal(fake.settings.soundOn, false);
});

test('settings: a failed save shows a message instead of crashing', async () => {
  await setup();
  const { root } = mountSettings();
  const errors = mock.method(console, 'error', () => {});
  fake.failWrites = true;
  seg(root, 'Daily goal', 2).click();
  await tick();
  errors.mock.restore();
  assert.ok(hasText(dom.body, 'Could not save the goal'));
  assert.equal(actions.store.get().settings.goalHistory.length, 1);
});

test('export: downloads the named file with a valid backup and shows the last backup date', async () => {
  await setup([{ problemId: 1, day: '2026-06-09', at: NOON(2026, 6, 9) }]);
  const { root } = mountSettings();
  button(root, 'Export backup').click();
  await tick();
  dom.flushFrames();
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, 'dsa-streak-backup-2026-06-10.json');
  const data = JSON.parse(downloads[0].text);
  assert.equal(data.app, 'dsa-streak');
  assert.equal(data.solves.length, 1);
  assert.equal(actions.store.get().settings.lastBackupAt, NOON(2026, 6, 10));
  assert.ok(hasText(root, '10 Jun 2026'));
  assert.ok(toastText().includes('Backup saved'));
  assert.equal(button(root, 'Export backup').getAttribute('disabled'), null);
});

test('export: if making the backup fails, nothing is downloaded and a message shows', async () => {
  await setup();
  const { root } = mountSettings();
  const errors = mock.method(console, 'error', () => {});
  fake.failWrites = true;
  button(root, 'Export backup').click();
  await tick();
  errors.mock.restore();
  assert.equal(downloads.length, 0);
  assert.ok(toastText().includes('Could not make the backup'));
  assert.ok(hasText(root, 'Never'));
});

test('import: the Import button opens the file picker', async () => {
  await setup();
  const { root } = mountSettings();
  let opened = 0;
  fileInput(root).addEventListener('click', () => { opened += 1; });
  button(root, 'Import backup').click();
  assert.equal(opened, 1);
  assert.equal(fileInput(root).getAttribute('accept'), '.json,application/json');
});

test('import: a good file asks first, and only replaces data after Replace', async () => {
  await setup([{ problemId: 1, day: '2026-06-09', at: NOON(2026, 6, 9) }]);
  const { root } = mountSettings();
  await pickFile(root, fakeFile(goodBackupText()));
  assert.ok(hasText(root, 'This replaces all data on this phone, continue?'));
  assert.ok(hasText(root, '2 solved problems'));
  assert.ok(hasText(root, '3 May 2026'));
  assert.deepEqual(actions.store.get().solves.map((s) => s.problemId), [1]);

  button(root, 'Replace').click();
  await tick();
  dom.flushFrames();
  assert.deepEqual(actions.store.get().solves.map((s) => s.problemId), [3, 4]);
  assert.equal(actions.store.get().settings.theme, 'dark');
  assert.ok(!hasText(root, 'continue?'));
  assert.ok(toastText().includes('Backup restored: 2 solved problems'));
  assert.ok(isActive(seg(root, 'Daily goal', 2)));
  assert.ok(isActive(seg(root, 'Theme', 'dark')));
});

test('import: Cancel leaves everything as it was', async () => {
  await setup([{ problemId: 1, day: '2026-06-09', at: NOON(2026, 6, 9) }]);
  const { root } = mountSettings();
  await pickFile(root, fakeFile(goodBackupText()));
  button(root, 'Cancel').click();
  assert.ok(!hasText(root, 'continue?'));
  assert.deepEqual(actions.store.get().solves.map((s) => s.problemId), [1]);
  assert.deepEqual(fake.solves.map((s) => s.problemId), [1]);
});

test('import: a bad file shows the error list and changes nothing', async () => {
  await setup([{ problemId: 1, day: '2026-06-09', at: NOON(2026, 6, 9) }]);
  const { root } = mountSettings();
  const bad = JSON.stringify({ ...JSON.parse(goodBackupText()), version: 7, solves: [{ problemId: 999, day: 'x', at: 'y' }] });
  await pickFile(root, fakeFile(bad));
  assert.ok(hasText(root, 'This file was not imported. Nothing on this phone changed.'));
  const items = byClass(root, 'error-list')[0].findAll((e) => e.tagName === 'li');
  assert.equal(items.length, 4);
  assert.ok(!hasText(root, 'continue?'));
  assert.equal(button(root, 'Replace'), null);
  assert.deepEqual(actions.store.get().solves.map((s) => s.problemId), [1]);
  button(root, 'Close').click();
  assert.equal(byClass(root, 'error-list').length, 0);
});

test('import: text that is not JSON, and a file that is too big', async () => {
  await setup();
  const { root } = mountSettings();
  await pickFile(root, fakeFile('not json at all'));
  assert.ok(hasText(root, 'not valid JSON'));
  await pickFile(root, fakeFile('{}', 6 * 1024 * 1024));
  assert.ok(hasText(root, 'too big'));
  assert.ok(!hasText(root, 'not valid JSON'));
});

test('import: a file that cannot be read shows an error', async () => {
  await setup();
  const { root } = mountSettings();
  await pickFile(root, { size: 10, text: async () => { throw new Error('nope'); } });
  assert.ok(hasText(root, 'Could not read that file'));
});

test('import: a long error list is cut to eight with a count', async () => {
  await setup();
  const { root } = mountSettings();
  const data = JSON.parse(goodBackupText());
  data.solves = Array.from({ length: 12 }, () => ({ problemId: 0, day: '2026-06-01', at: 1 }));
  await pickFile(root, fakeFile(JSON.stringify(data)));
  const items = byClass(root, 'error-list')[0].findAll((e) => e.tagName === 'li');
  assert.equal(items.length, 9);
  assert.ok(hasText(root, 'and 4 more problems'));
});

test('import: a save failure after Replace shows the error and keeps the old data', async () => {
  await setup([{ problemId: 1, day: '2026-06-09', at: NOON(2026, 6, 9) }]);
  const { root } = mountSettings();
  await pickFile(root, fakeFile(goodBackupText()));
  const errors = mock.method(console, 'error', () => {});
  fake.failWrites = true;
  button(root, 'Replace').click();
  await tick();
  errors.mock.restore();
  assert.ok(hasText(root, 'Nothing was changed'));
  assert.deepEqual(actions.store.get().solves.map((s) => s.problemId), [1]);
});

test('settings: choosing no file does nothing', async () => {
  await setup();
  const { root } = mountSettings();
  const input = fileInput(root);
  input.files = [];
  input.fire('change');
  await tick();
  assert.ok(!hasText(root, 'continue?'));
  assert.equal(byClass(root, 'error-list').length, 0);
});

test('settings: unmount stops listening to the store', async () => {
  await setup();
  const { unmount } = mountSettings();
  dom.flushFrames();
  unmount();
  actions.store.set({ today: '2026-06-11' });
  assert.equal(dom.flushFrames(), undefined);
});
