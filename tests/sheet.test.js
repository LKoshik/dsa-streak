// The bottom sheet helper, against the pretend page.
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, hasText, byClass } from './helpers/fake-dom.js';
import { h } from '../src/ui/dom.js';
import { openSheet } from '../src/ui/sheet.js';

let dom;
function setup() {
  mock.timers.enable({ apis: ['setTimeout'] });
  dom = installFakeDom();
}
afterEach(() => { mock.timers.reset(); dom?.restore(); });

test('sheet: opens with title, body and footer, and marks the page', () => {
  setup();
  const sheet = openSheet({ label: 'TOPIC 1', title: 'Fundamentals', subtitle: '2 of 6 solved', progress: 0.5,
    body: h('p', null, 'hello body'), footer: h('button', { type: 'button' }, 'Go') });
  assert.equal(sheet.isOpen(), true);
  assert.ok(dom.body.children.includes(sheet.el));
  assert.ok(hasText(sheet.el, 'Fundamentals'));
  assert.ok(hasText(sheet.el, 'TOPIC 1'));
  assert.ok(hasText(sheet.el, '2 of 6 solved'));
  assert.ok(hasText(sheet.el, 'hello body'));
  assert.ok(hasText(sheet.el, 'Go'));
  assert.ok(dom.body.classList.contains('has-sheet'));
  const dialog = sheet.el.find((e) => e.getAttribute('role') === 'dialog');
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  assert.equal(byClass(sheet.el, 'sheet__bar-fill')[0].style.width, '50%');
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Close');
});

test('sheet: update changes parts, hides the footer and the bar when asked', () => {
  setup();
  const sheet = openSheet({ title: 'A', body: h('p', null, 'one'), footer: h('p', null, 'foot'), progress: 0.2 });
  sheet.update({ title: 'B', body: h('p', null, 'two'), footer: null, progress: null });
  assert.ok(hasText(sheet.el, 'B') && hasText(sheet.el, 'two'));
  assert.ok(!hasText(sheet.el, 'one'));
  assert.ok(byClass(sheet.el, 'sheet__footer')[0].classList.contains('is-hidden'));
  assert.ok(byClass(sheet.el, 'sheet__bar')[0].classList.contains('is-hidden'));
  sheet.update({ footer: h('p', null, 'again'), progress: 2 });
  assert.ok(!byClass(sheet.el, 'sheet__footer')[0].classList.contains('is-hidden'));
  assert.equal(byClass(sheet.el, 'sheet__bar-fill')[0].style.width, '100%');
});

test('sheet: the body keeps its scroll position when updated', () => {
  setup();
  const sheet = openSheet({ title: 'A', body: h('p', null, 'x') });
  const body = byClass(sheet.el, 'sheet__body')[0];
  body.scrollTop = 120;
  sheet.update({ body: h('p', null, 'y') });
  assert.equal(body.scrollTop, 120);
});

test('sheet: the X button closes it once, calls onClose once and removes it after the animation', () => {
  setup();
  let closed = 0;
  const sheet = openSheet({ title: 'A', onClose: () => { closed += 1; } });
  byClass(sheet.el, 'sheet__close')[0].click();
  sheet.close(); // second close does nothing
  assert.equal(sheet.isOpen(), false);
  assert.equal(closed, 1);
  assert.ok(sheet.el.classList.contains('is-leaving'));
  assert.ok(!dom.body.classList.contains('has-sheet'));
  assert.ok(dom.body.children.includes(sheet.el));
  mock.timers.tick(300);
  assert.ok(!dom.body.children.includes(sheet.el));
});

test('sheet: a tap on the dark background closes it, a tap inside does not', () => {
  setup();
  const sheet = openSheet({ title: 'A', body: h('p', null, 'x') });
  byClass(sheet.el, 'sheet')[0].fire('click');
  assert.equal(sheet.isOpen(), true);
  byClass(sheet.el, 'sheet-backdrop')[0].click();
  assert.equal(sheet.isOpen(), false);
});

test('sheet: Escape closes it, other keys do not, and the listener is removed', () => {
  setup();
  const sheet = openSheet({ title: 'A' });
  dom.pressKey('Enter');
  assert.equal(sheet.isOpen(), true);
  dom.pressKey('Escape');
  assert.equal(sheet.isOpen(), false);
  const second = openSheet({ title: 'B' });
  second.close();
  dom.pressKey('Escape'); // nothing is listening any more, no error
});

test('sheet: swiping down far enough closes it, a short swipe springs back', () => {
  setup();
  const sheet = openSheet({ title: 'A' });
  const grab = byClass(sheet.el, 'sheet__grab')[0];
  const panel = byClass(sheet.el, 'sheet')[0];
  grab.fire('pointerdown', { clientY: 100, pointerId: 1 });
  grab.fire('pointermove', { clientY: 130, pointerId: 1 });
  assert.equal(panel.style.transform, 'translateY(30px)');
  grab.fire('pointerup', { pointerId: 1 });
  assert.equal(sheet.isOpen(), true);
  assert.equal(panel.style.transform, '');
  grab.fire('pointerdown', { clientY: 100, pointerId: 1 });
  grab.fire('pointermove', { clientY: 260, pointerId: 1 });
  grab.fire('pointerup', { pointerId: 1 });
  assert.equal(sheet.isOpen(), false);
});

test('sheet: only one sheet is open at a time', () => {
  setup();
  const first = openSheet({ title: 'A' });
  const second = openSheet({ title: 'B' });
  assert.equal(first.isOpen(), false);
  assert.equal(second.isOpen(), true);
  assert.ok(dom.body.classList.contains('has-sheet'));
});
