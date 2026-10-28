import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/state/store.js';

test('get returns the initial state', () => {
  assert.deepEqual(createStore({ a: 1 }).get(), { a: 1 });
});

test('set merges a patch and makes a new state object', () => {
  const store = createStore({ a: 1, b: 2 });
  const before = store.get();
  store.set({ b: 3 });
  assert.deepEqual(store.get(), { a: 1, b: 3 });
  assert.notEqual(store.get(), before);
  assert.deepEqual(before, { a: 1, b: 2 });
});

test('subscribe is called on every set, and unsubscribe stops it', () => {
  const store = createStore({ n: 0 });
  const seen = [];
  const stop = store.subscribe((state) => seen.push(state.n));
  store.set({ n: 1 });
  store.set({ n: 2 });
  stop();
  store.set({ n: 3 });
  assert.deepEqual(seen, [1, 2]);
});

test('a listener can unsubscribe itself while being called', () => {
  const store = createStore({ n: 0 });
  let calls = 0;
  const stop = store.subscribe(() => { calls++; stop(); });
  store.set({ n: 1 });
  store.set({ n: 2 });
  assert.equal(calls, 1);
});

test('the initial object is not changed by set', () => {
  const initial = { a: 1 };
  const store = createStore(initial);
  store.set({ a: 2 });
  assert.deepEqual(initial, { a: 1 });
});
