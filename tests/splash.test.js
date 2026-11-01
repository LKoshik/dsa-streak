// The loading screen: how long it stays, tap to skip, reduce motion, the fade-out, and that its CSS exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { splashRemaining, waitForSplash, hideSplash, SPLASH_MIN_MS, SPLASH_FADE_MS } from '../src/ui/splash.js';

const css = fs.readFileSync(new URL('../src/styles/main.css', import.meta.url), 'utf8');

// A tiny stand-in for the screen element and for setTimeout.
function fakes() {
  const listeners = new Map();
  const classes = new Set();
  let removed = false;
  const el = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
    classList: { add: (c) => classes.add(c), contains: (c) => classes.has(c) },
    remove: () => { removed = true; },
  };
  const timers = [];
  const setTimer = (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length - 1; };
  const clearTimer = (id) => { if (timers[id]) timers[id].cleared = true; };
  const fire = (id) => { if (!timers[id].cleared) timers[id].fn(); };
  return { el, listeners, classes, timers, setTimer, clearTimer, fire, wasRemoved: () => removed };
}

test('splashRemaining: counts down from the minimum and never goes below 0', () => {
  assert.equal(SPLASH_MIN_MS, 700);
  assert.equal(splashRemaining(0), 700);
  assert.equal(splashRemaining(300), 400);
  assert.equal(splashRemaining(700), 0);
  assert.equal(splashRemaining(5000), 0);
  assert.equal(splashRemaining(-50), 700);
  assert.equal(splashRemaining(Number.NaN), 0);
});

test('waitForSplash: waits for the rest of the minimum, and does NOT fade (the app is built next)', async () => {
  const f = fakes();
  let done = false;
  const promise = waitForSplash(f.el, { elapsed: 300, setTimer: f.setTimer, clearTimer: f.clearTimer }).then(() => { done = true; });
  assert.equal(f.timers[0].ms, 400);
  await Promise.resolve();
  assert.equal(done, false);
  f.fire(0);
  await promise;
  assert.equal(done, true);
  assert.equal(f.el.classList.contains('splash--out'), false);
  assert.equal(f.wasRemoved(), false);
});

test('waitForSplash: a tap skips the wait, and a second tap does nothing', async () => {
  const f = fakes();
  const promise = waitForSplash(f.el, { elapsed: 100, setTimer: f.setTimer, clearTimer: f.clearTimer });
  f.listeners.get('pointerdown')();
  await promise;
  assert.equal(f.timers[0].cleared, true);
  assert.equal(f.listeners.has('pointerdown'), false);
  assert.equal(f.timers.length, 1);
});

test('waitForSplash: already past the minimum -> no wait', async () => {
  const f = fakes();
  const promise = waitForSplash(f.el, { elapsed: 3000, setTimer: f.setTimer, clearTimer: f.clearTimer });
  assert.equal(f.timers[0].ms, 0);
  f.fire(0);
  await promise;
});

test('waitForSplash: reduce motion or no splash element -> no waiting at all', async () => {
  const f = fakes();
  await waitForSplash(f.el, { elapsed: 0, reducedMotion: true, setTimer: f.setTimer, clearTimer: f.clearTimer });
  assert.equal(f.timers.length, 0);
  await waitForSplash(null, { elapsed: 0, setTimer: f.setTimer, clearTimer: f.clearTimer });
  assert.equal(f.timers.length, 0);
});

test('hideSplash: fades out first, then removes the element', () => {
  const f = fakes();
  hideSplash(f.el, { setTimer: f.setTimer });
  assert.equal(f.el.classList.contains('splash--out'), true);
  assert.equal(f.timers[0].ms, SPLASH_FADE_MS);
  assert.equal(f.wasRemoved(), false);
  f.fire(0);
  assert.equal(f.wasRemoved(), true);
});

test('hideSplash: reduce motion removes it at once, and a missing element is fine', () => {
  const f = fakes();
  hideSplash(f.el, { reducedMotion: true, setTimer: f.setTimer });
  assert.equal(f.wasRemoved(), true);
  assert.equal(f.timers.length, 0);
  assert.doesNotThrow(() => hideSplash(null));
});

test('splash CSS: its animations have keyframes, the fade-out class exists, and the fade time matches the code', () => {
  for (const name of ['splash-breathe', 'splash-name-in']) {
    assert.ok(css.includes(`@keyframes ${name}`), `@keyframes ${name}`);
    assert.ok(css.includes(`${name} `), `${name} is used`);
  }
  assert.ok(css.includes('.splash--out'));
  assert.ok(css.includes(`transition: opacity ${SPLASH_FADE_MS}ms`), 'CSS fade time must equal SPLASH_FADE_MS');
});
