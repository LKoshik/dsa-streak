// The burning-flame loading screen (the markup lives in index.html so it shows before any script runs).
//   splashRemaining(elapsedMs, minMs) -> how many more ms the screen should stay up (never negative)
//   waitForSplash(el, options)        -> promise that resolves when the splash has faded out and the app may appear
// Rules: it stays at least SPLASH_MIN_MS counted from the start of the page load, a tap skips it,
// and with "reduce motion" on there is no waiting at all. Timers can be handed in so tests do not wait.
export const SPLASH_MIN_MS = 1200;
export const SPLASH_FADE_MS = 220;

export function splashRemaining(elapsedMs, minMs = SPLASH_MIN_MS) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : minMs;
  return Math.max(0, Math.round(minMs - elapsed));
}

export function waitForSplash(el, options = {}) {
  const {
    elapsed = 0,
    reducedMotion = false,
    minMs = SPLASH_MIN_MS,
    fadeMs = SPLASH_FADE_MS,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
  } = options;
  if (!el || reducedMotion) return Promise.resolve();
  return new Promise((resolve) => {
    let timer = null;
    let leaving = false;
    const leave = () => {
      if (leaving) return;
      leaving = true;
      clearTimer(timer);
      el.removeEventListener('pointerdown', leave);
      el.classList.add('splash--out');
      setTimer(resolve, fadeMs);
    };
    el.addEventListener('pointerdown', leave);
    timer = setTimer(leave, splashRemaining(elapsed, minMs));
  });
}
