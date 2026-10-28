// A very small hash router: #/home, #/path, #/stats, #/settings.
// The app ALWAYS starts at #/home, whatever the address said before.
// startRouter({ root, features, ctx, nav }) shows the right screen and keeps it in sync.

export function startRouter({ root, features, ctx, nav }) {
  const ids = features.map((f) => f.id);
  let unmount = null;

  // Which screen does the address ask for? Returns null when it is unknown.
  function idFromHash() {
    const match = /^#\/([a-z]+)/.exec(location.hash);
    return match && ids.includes(match[1]) ? match[1] : null;
  }

  function show() {
    const id = idFromHash();
    if (id === null) {
      history.replaceState(null, '', '#/home');
      show();
      return;
    }
    if (unmount) {
      try { unmount(); } catch (error) { console.error(error); }
      unmount = null;
    }
    const feature = features.find((f) => f.id === id);
    root.replaceChildren();
    root.className = 'view';
    root.scrollTop = 0;
    nav.setActive(id);
    document.title = id === 'home' ? 'DSA Streak' : `${feature.label} · DSA Streak`;
    try {
      unmount = feature.mount(root, ctx);
    } catch (error) {
      console.error(error);
      root.textContent = 'Something went wrong on this screen. Try another tab.';
    }
  }

  // Always start at home.
  history.replaceState(null, '', '#/home');
  window.addEventListener('hashchange', show);
  show();
}
