// Ember rig behaviour: wave, calm moods, celebration (one-shots end on animationend, or on a safety timer).
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './helpers/fake-dom.js';
import { createEmber, setEmberMood, cheerEmber, waveEmber } from '../src/ui/ember.js';

let dom;
function setup({ reducedMotion = false } = {}) {
  mock.timers.enable({ apis: ['setTimeout'] });
  dom = installFakeDom();
  globalThis.matchMedia = () => ({ matches: reducedMotion });
}
function teardown() {
  delete globalThis.matchMedia;
  dom.restore();
  mock.timers.reset();
}
const act = (svg) => svg.find((e) => e.classList.contains('ember-rig__act'));

test('ember wave: adds is-wave, removes it when the wave animation ends', () => {
  setup();
  const svg = createEmber();
  waveEmber(svg);
  assert.ok(svg.classList.contains('is-wave'));
  act(svg).fire('animationend', { target: act(svg), animationName: 'ember-cheer-act' }); // some other animation: ignored
  assert.ok(svg.classList.contains('is-wave'));
  act(svg).fire('animationend', { target: act(svg), animationName: 'ember-wave-act' });
  assert.ok(!svg.classList.contains('is-wave'));
  teardown();
});

test('ember wave: a safety timer removes it even if animationend never comes', () => {
  setup();
  const svg = createEmber();
  waveEmber(svg);
  mock.timers.tick(4300);
  assert.ok(!svg.classList.contains('is-wave'));
  teardown();
});

test('ember wave: skipped when the phone asks for less motion', () => {
  setup({ reducedMotion: true });
  const svg = createEmber();
  waveEmber(svg);
  assert.ok(!svg.classList.contains('is-wave'));
  teardown();
});

test('ember cheer: celebrates, then settles into the calm happy face', () => {
  setup();
  const svg = createEmber();
  setEmberMood(svg, 'wait');
  cheerEmber(svg);
  assert.ok(svg.classList.contains('is-cheer'));
  assert.ok(!svg.classList.contains('is-mood-wait'), 'the old mood is cleared first');
  act(svg).fire('animationend', { target: act(svg), animationName: 'ember-cheer-act' });
  assert.ok(!svg.classList.contains('is-cheer'));
  assert.ok(svg.classList.contains('is-mood-happy'));
  teardown();
});

test('ember cheer: a second cheer while one is playing does nothing; the safety timer ends it', () => {
  setup();
  const svg = createEmber();
  cheerEmber(svg);
  cheerEmber(svg);
  assert.ok(svg.classList.contains('is-cheer'));
  mock.timers.tick(4700);
  assert.ok(!svg.classList.contains('is-cheer'));
  assert.ok(svg.classList.contains('is-mood-happy'));
  teardown();
});

test('ember cheer: with less motion it goes straight to the calm happy face', () => {
  setup({ reducedMotion: true });
  const svg = createEmber();
  cheerEmber(svg);
  assert.ok(!svg.classList.contains('is-cheer'));
  assert.ok(svg.classList.contains('is-mood-happy'));
  teardown();
});
