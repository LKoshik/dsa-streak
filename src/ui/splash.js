// The loading screen (the markup lives in index.html so it shows before any script runs).
//   splashRemaining(elapsedMs, minMs) -> how many more ms the screen should stay up (never negative)
//   waitForSplash(el, options)        -> promise that resolves when the screen has been up long enough (or was tapped)
//   hideSplash(el, options)           -> fades the screen out and removes it (call this AFTER the app is on screen underneath)
// Rules: it stays at least SPLASH_MIN_MS counted from the start of the page load, a tap skips the wait,
// and with "reduce motion" on there is no waiting and no fade. Timers can be handed in so tests do not wait.
export const SPLASH_MIN_MS = 700;
export const SPLASH_FADE_MS = 300; // keep equal to the opacity transition of .splash in main.css

export function splashRemaining(elapsedMs, minMs = SPLASH_MIN_MS) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : minMs;
  return Math.max(0, Math.round(minMs - elapsed));
}

export function waitForSplash(el, options = {}) {
  const {
    elapsed = 0,
    reducedMotion = false,
    minMs = SPLASH_MIN_MS,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
  } = options;
  if (!el || reducedMotion) return Promise.resolve();
  return new Promise((resolve) => {
    let timer = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimer(timer);
      el.removeEventListener('pointerdown', finish);
      resolve();
    };
    el.addEventListener('pointerdown', finish);
    timer = setTimer(finish, splashRemaining(elapsed, minMs));
  });
}

export function hideSplash(el, options = {}) {
  const { reducedMotion = false, fadeMs = SPLASH_FADE_MS, setTimer = setTimeout } = options;
  if (!el) return;
  if (reducedMotion) {
    el.remove();
    return;
  }
  el.classList.add('splash--out');
  setTimer(() => el.remove(), fadeMs);
}
