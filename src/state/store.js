// A tiny store: holds the app state and tells listeners when it changes.
//   const store = createStore({ count: 0 });
//   const stop = store.subscribe((state) => ...);   // stop() unsubscribes
//   store.set({ count: 1 });                        // merges the patch into the state

export function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();

  return {
    // The current state. Treat it as read-only.
    get() {
      return state;
    },
    // Merge a patch into the state (a new object each time) and tell listeners.
    set(patch) {
      state = { ...state, ...patch };
      for (const listener of [...listeners]) listener(state);
    },
    // Listen for changes. Returns a function that stops listening.
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
