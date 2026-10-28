// Registers the service worker (sw.js) and finds out when a NEW version is waiting.
//
//   const updates = registerWorker({ onUpdateReady });
//   updates.applyUpdate();   // the person tapped Reload
//
// A new version never takes over by itself. applyUpdate() sends SKIP_WAITING to the waiting
// worker; when the new worker takes control (controllerchange) the page reloads exactly once.
// The first-ever install also fires controllerchange, but nobody tapped Reload then, so no reload.

export function registerWorker({
  serviceWorker = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined,
  scriptUrl = './sw.js',
  onUpdateReady = () => {},
  reload = () => location.reload(),
  doc = typeof document !== 'undefined' ? document : null,
} = {}) {
  if (!serviceWorker) return null; // old browser, or not https / localhost

  let waiting = null;
  let updateRequested = false;
  let reloaded = false;

  function announce(worker) {
    if (!worker || waiting === worker) return;
    waiting = worker;
    onUpdateReady();
  }

  serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested || reloaded) return;
    reloaded = true;
    reload();
  });

  const registration = Promise.resolve()
    .then(() => serviceWorker.register(scriptUrl))
    .then((reg) => {
      // A version that finished installing in an earlier visit and is still waiting.
      if (reg.waiting) announce(reg.waiting);
      // A version found while the app is open.
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          // With no controller this is the very first install: nothing to update.
          if (installing.state === 'installed' && serviceWorker.controller) announce(reg.waiting || installing);
        });
      });
      // Coming back to the app after a while: look for a new version.
      if (doc) {
        doc.addEventListener('visibilitychange', () => {
          if (doc.visibilityState === 'visible') reg.update().catch(() => {});
        });
      }
      return reg;
    })
    .catch((error) => {
      console.error('Service worker could not start', error);
      return null;
    });

  return {
    registration,
    hasUpdate: () => waiting !== null,
    // Returns true when a waiting worker was told to take over.
    applyUpdate() {
      if (!waiting) return false;
      updateRequested = true;
      waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    },
  };
}
