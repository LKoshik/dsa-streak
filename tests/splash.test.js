// The flame loading screen: how long it stays, tap to skip, reduce motion, and that its CSS exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { splashRemaining, waitForSplash, SPLASH_MIN_MS, SPLASH_FADE_MS } from '../src/ui/splash.js';

const css = fs.readFileSync(new URL('../src/styles/main.css', import.meta.url), 'utf8');

// A tiny stand-in for the screen element and for setTimeout.
function fakes() {
  const listeners = new Map();
  const classes = new Set();
  const el = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
    classList: { add: (c) => classes.add(c), contains: (c) => classes.has(c) },
  };
  const timers = [];
  const setTimer = (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length - 1; };
  const clearTimer = (id) => { if (timers[id]) timers[id].cleared = true; };
  const fire = (id) => { if (!timers[id].cleared) timers[id].fn(); };
  return { el, listeners, classes, timers, setTimer, clearTimer, fire };
}

test('splashRemaining: counts down from the minimum and never goes below 0', () => {
  assert.equal(SPLASH_MIN_MS, 1200);
  assert.equal(splashRemaining(0), 1200);
  assert.equal(splashRemaining(500), 700);
  assert.equal(splashRemaining(1200), 0);
  assert.equal(splashRemaining(5000), 0);
  assert.equal(splashRemaining(-50), 1200);
  assert.equal(splashRemaining(Number.NaN), 0);
});

test('waitForSplash: waits for the rest of the minimum, fades, then lets the app appear', async () => {
  const f = fakes();
  let done = false;
  const promise = waitForSplash(f.el, { elapsed: 500, setTimer: f.setTimer, clearTimer: f.clearTimer }).then(() => { done = true; });
  assert.equal(f.timers[0].ms, 700);
  assert.equal(f.el.classList.contains('splash--out'), false);
  f.fire(0);
  assert.equal(f.el.classList.contains('splash--out'), true);
  assert.equal(f.timers[1].ms, SPLASH_FADE_MS);
  await Promise.resolve();
  assert.equal(done, false);
  f.fire(1);
  await promise;
  assert.equal(done, true);
});

test('waitForSplash: a tap skips the wait, and a second tap does nothing', async () => {
  const f = fakes();
  const promise = waitForSplash(f.el, { elapsed: 100, setTimer: f.setTimer, clearTimer: f.clearTimer });
  f.listeners.get('pointerdown')();
  assert.equal(f.el.classList.contains('splash--out'), true);
  assert.equal(f.timers[0].cleared, true);
  assert.equal(f.listeners.has('pointerdown'), false);
  assert.equal(f.timers.length, 2); // the wait timer and one fade timer, no more
  f.fire(1);
  await promise;
});

test('waitForSplash: already past the minimum -> fades right away', async () => {
  const f = fakes();
  const promise = waitForSplash(f.el, { elapsed: 3000, setTimer: f.setTimer, clearTimer: f.clearTimer });
  assert.equal(f.timers[0].ms, 0);
  f.fire(0);
  f.fire(1);
  await promise;
});

test('waitForSplash: reduce motion or no splash element -> no waiting at all', async () => {
  const f = fakes();
  await waitForSplash(f.el, { elapsed: 0, reducedMotion: true, setTimer: f.setTimer, clearTimer: f.clearTimer });
  assert.equal(f.timers.length, 0);
  assert.equal(f.el.classList.contains('splash--out'), false);
  await waitForSplash(null, { elapsed: 0, setTimer: f.setTimer, clearTimer: f.clearTimer });
  assert.equal(f.timers.length, 0);
});

test('splash CSS: every animation it uses has keyframes, and the fade-out class exists', () => {
  for (const name of ['splash-pop', 'splash-float', 'splash-ignite', 'splash-flicker', 'splash-glow', 'splash-heat', 'splash-spark']) {
    assert.ok(css.includes(`@keyframes ${name}`), `@keyframes ${name}`);
    assert.ok(css.includes(`${name} `), `${name} is used`);
  }
  assert.ok(css.includes('.splash--out'));
});
