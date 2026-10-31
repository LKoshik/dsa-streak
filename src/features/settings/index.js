// Settings screen: daily goal, theme, sound, backup (export / import) and the Habit tip.
// Goal and theme use the setGoal and setTheme actions; backup uses exportBackup and importBackup.
import { h } from '../../ui/dom.js';
import { showToast } from '../../ui/toast.js';
import { downloadText } from '../../ui/download.js';
import { unlockAudio, playSound } from '../../ui/sound.js';
import { parseBackup } from '../../core/backup.js';
import { GOAL_OPTIONS, THEME_OPTIONS, MAX_BACKUP_BYTES, formatBackupDate, limitErrors, solvedWords } from './model.js';

function mount(root, ctx) {
  const { store, actions, selectors } = ctx;
  const download = ctx.download || downloadText;

  const container = h('div', { class: 'settings' });
  // The file picker lives outside the redrawn part, so it is never thrown away mid-choice.
  const fileInput = h('input', {
    type: 'file', class: 'sr-only', accept: '.json,application/json', tabindex: '-1', 'aria-hidden': 'true',
    onchange: () => { onFileChosen(); },
  });
  root.append(container, fileInput);

  let frame = null;
  let alive = true;
  let busy = false;
  let pending = null;       // a checked file waiting for "Replace everything": { text, count, exportedAt }
  let importErrors = null;  // the reasons a file was rejected

  // ---------- small pieces ----------

  function segmented(label, options, value, onPick) {
    return h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label },
      options.map((option) => {
        const active = option.value === value;
        return h('button', {
          type: 'button', role: 'radio', class: `seg${active ? ' is-active' : ''}`,
          'aria-checked': String(active), dataset: { value: String(option.value) },
          onclick: () => onPick(option.value),
        }, option.label);
      }));
  }

  async function run(task, failMessage) {
    try {
      await task();
    } catch (error) {
      console.error(error);
      showToast({ message: failMessage });
    }
  }

  // ---------- goal and theme ----------

  function goalCard(state) {
    const goal = selectors.selectHome(state).daily.goal;
    return h('section', { class: 'card setting' },
      h('div', { class: 'label' }, 'Daily goal'),
      h('p', { class: 'setting__hint' }, 'Problems to solve each day. Past days keep their old goal.'),
      segmented('Daily goal', GOAL_OPTIONS.map((n) => ({ value: n, label: String(n) })), goal,
        (n) => run(() => actions.setGoal(n), 'Could not save the goal. Try again.')));
  }

  function themeCard(state) {
    return h('section', { class: 'card setting' },
      h('div', { class: 'label' }, 'Theme'),
      segmented('Theme', THEME_OPTIONS, state.settings.theme,
        (theme) => run(() => actions.setTheme(theme), 'Could not save the theme. Try again.')));
  }

  // ---------- sound ----------

  function soundCard(state) {
    return h('section', { class: 'card setting' },
      h('div', { class: 'label' }, 'Sound'),
      h('p', { class: 'setting__hint' }, 'Short cheerful sounds when you solve, reach your goal or level up.'),
      segmented('Sound', [{ value: true, label: 'On' }, { value: false, label: 'Off' }], state.settings.soundOn !== false,
        (on) => {
          if (on) unlockAudio(); // sound may only start from a tap, so unlock before saving
          run(async () => {
            await actions.setSound(on);
            if (on) playSound('goalMet', true); // a little preview
          }, 'Could not save the sound setting. Try again.');
        }));
  }

  // ---------- backup ----------

  async function onExport() {
    if (busy) return;
    busy = true;
    render();
    try {
      const { filename, text } = await actions.exportBackup();
      download(filename, text);
      showToast({ message: 'Backup saved to your downloads.', variant: 'reward' });
    } catch (error) {
      console.error(error);
      showToast({ message: 'Could not make the backup. Try again.' });
    }
    busy = false;
    render();
  }

  async function onFileChosen() {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    pending = null;
    importErrors = null;
    if (file.size > MAX_BACKUP_BYTES) {
      importErrors = ['This file is too big to be a DSA Streak backup.'];
    } else {
      let text = null;
      try {
        text = await file.text();
      } catch {
        importErrors = ['Could not read that file.'];
      }
      if (text !== null) {
        const parsed = parseBackup(text);
        if (parsed.ok) pending = { text, count: parsed.data.solves.length, exportedAt: parsed.data.exportedAt };
        else importErrors = parsed.errors;
      }
    }
    if (alive) render();
  }

  async function onReplace() {
    if (busy || pending === null) return;
    busy = true;
    render();
    const result = await actions.importBackup(pending.text);
    busy = false;
    if (result.ok) {
      pending = null;
      importErrors = null;
      showToast({ message: `Backup restored: ${solvedWords(result.solveCount)}.`, variant: 'reward' });
    } else {
      pending = null;
      importErrors = result.errors;
    }
    if (alive) render();
  }

  function cancelImport() {
    pending = null;
    importErrors = null;
    render();
  }

  function errorList() {
    const { shown, hidden } = limitErrors(importErrors);
    return h('div', { class: 'import-box import-box--error', role: 'alert' },
      h('p', { class: 'import-box__title' }, 'This file was not imported. Nothing on this phone changed.'),
      h('ul', { class: 'error-list' },
        shown.map((message) => h('li', null, message)),
        hidden > 0 ? h('li', null, `…and ${hidden} more problems.`) : null),
      h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: cancelImport }, 'Close'));
  }

  function confirmBox() {
    return h('div', { class: 'import-box', role: 'alertdialog', 'aria-label': 'Confirm import' },
      h('p', { class: 'import-box__title' }, 'This replaces all data on this phone, continue?'),
      h('p', { class: 'setting__hint' },
        `The file has ${solvedWords(pending.count)}, saved on ${formatBackupDate(Date.parse(pending.exportedAt))}.`),
      h('div', { class: 'import-box__buttons' },
        h('button', { type: 'button', class: 'btn btn--ghost', disabled: busy, onclick: cancelImport }, 'Cancel'),
        h('button', { type: 'button', class: 'btn btn--red', disabled: busy, onclick: onReplace }, 'Replace')));
  }

  function backupCard(state) {
    return h('section', { class: 'card setting setting--backup' },
      h('div', { class: 'label' }, 'Backup'),
      h('p', { class: 'setting__hint' }, 'Your progress lives only on this phone. Save a backup file now and then.'),
      h('p', { class: 'last-backup' }, 'Last backup: ', h('strong', null, formatBackupDate(state.settings.lastBackupAt))),
      h('div', { class: 'setting__buttons' },
        h('button', { type: 'button', class: 'btn btn--green btn--block export-btn', disabled: busy, onclick: onExport }, 'Export backup'),
        h('button', { type: 'button', class: 'btn btn--ghost btn--block import-btn', disabled: busy, onclick: () => fileInput.click() }, 'Import backup')),
      pending ? confirmBox() : null,
      importErrors ? errorList() : null);
  }

  function habitTip() {
    return h('section', { class: 'card habit-tip' },
      h('div', { class: 'label' }, 'Habit tip'),
      h('p', null, 'Install the app to your home screen and set a daily phone alarm at a fixed time. One problem is enough.'));
  }

  // ---------- drawing ----------

  function render() {
    frame = null;
    if (!alive) return;
    const state = store.get();
    container.replaceChildren(
      h('h1', { class: 'settings__title' }, 'Settings'),
      goalCard(state),
      themeCard(state),
      soundCard(state),
      backupCard(state),
      habitTip());
  }

  function scheduleRender() {
    if (frame === null) frame = requestAnimationFrame(render);
  }

  const unsubscribe = store.subscribe(scheduleRender);
  render();

  return function unmount() {
    alive = false;
    unsubscribe();
  };
}

export default { id: 'settings', label: 'Settings', icon: 'settings', mount };
