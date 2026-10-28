// Runs the real src/pwa/sw.js (after the build step filled it in) inside a pretend worker.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { injectBuildInfo } from '../tools/pwa-build.js';

const SOURCE = fs.readFileSync(new URL('../src/pwa/sw.js', import.meta.url), 'utf8');
const SCOPE = 'https://me.github.io/dsa-streak/';
const URLS = ['./', './index.html', './app.js', './app.css'];

const response = (body, { ok = true, status = 200, type = 'basic' } = {}) => ({
  body, ok, status, type, clone() { return { ...this }; },
});

// A pretend worker. Returns helpers to fire events and look at what happened.
function loadWorker({ dev = false, version = 'v1', urls = URLS, caches: initial = {}, network = {} } = {}) {
  const store = new Map(Object.entries(initial).map(([name, files]) => [name, new Map(Object.entries(files))]));
  const key = (input) => (typeof input === 'string' ? input : input.url);
  const caches = {
    async open(name) {
      if (!store.has(name)) store.set(name, new Map());
      const files = store.get(name);
      return {
        async put(input, res) { files.set(key(input), res); },
        async match(input) { return files.get(key(input)); },
      };
    },
    async keys() { return [...store.keys()]; },
    async delete(name) { return store.delete(name); },
  };
  const fetches = [];
  const fetchFn = async (input) => {
    const target = key(input);
    fetches.push(input);
    if (!(target in network)) throw new TypeError('offline');
    const value = network[target];
    return typeof value === 'function' ? value() : value;
  };
  class Request {
    constructor(url, init = {}) { this.url = url; this.method = 'GET'; this.mode = 'cors'; Object.assign(this, init); }
  }
  const handlers = {};
  const calls = { skipWaiting: 0, claim: 0 };
  const self = {
    registration: { scope: SCOPE },
    location: new URL(SCOPE),
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: () => { calls.skipWaiting += 1; },
    clients: { claim: async () => { calls.claim += 1; } },
  };
  const code = injectBuildInfo(SOURCE, { version, urls, dev });
  vm.runInNewContext(code, { self, caches, fetch: fetchFn, Request, URL, Promise, Error, TypeError });

  const dispatch = (type, extra = {}) => {
    const event = { waited: [], responded: null, ...extra,
      waitUntil(p) { this.waited.push(p); }, respondWith(p) { this.responded = p; } };
    handlers[type](event);
    return event;
  };
  const request = (url, init = {}) => new Request(url, init);
  return { store, fetches, calls, handlers, dispatch, request, Request };
}

const allOk = () => Object.fromEntries(URLS.map((u) => [new URL(u, SCOPE).href, response(`file ${u}`)]));

test('install: saves every file in a cache named after the build, and does NOT skip waiting', async () => {
  const w = loadWorker({ network: allOk() });
  const event = w.dispatch('install');
  await Promise.all(event.waited);
  assert.equal(w.calls.skipWaiting, 0);
  const files = w.store.get('dsa-streak-v1');
  assert.deepEqual([...files.keys()].sort(), URLS.map((u) => new URL(u, SCOPE).href).sort());
  assert.equal(files.get(SCOPE).body, 'file ./');
  // Files are fetched fresh, not from the browser's own cache.
  assert.ok(w.fetches.every((r) => r.cache === 'reload'));
});

test('install: if one file cannot be saved, the install fails (the old version keeps running)', async () => {
  const network = allOk();
  delete network[new URL('./app.js', SCOPE).href];
  const w = loadWorker({ network });
  const event = w.dispatch('install');
  await assert.rejects(Promise.all(event.waited), /offline/);
  assert.equal(w.calls.skipWaiting, 0);

  const bad = allOk();
  bad[new URL('./app.css', SCOPE).href] = response('nope', { ok: false, status: 404 });
  const w2 = loadWorker({ network: bad });
  await assert.rejects(Promise.all(w2.dispatch('install').waited), /app\.css \(404\)/);
});

test('message: SKIP_WAITING calls skipWaiting; other messages do nothing', () => {
  const w = loadWorker({ network: allOk() });
  w.dispatch('message', { data: { type: 'OTHER' } });
  w.dispatch('message', { data: null });
  w.dispatch('message', { data: 'SKIP_WAITING' });
  assert.equal(w.calls.skipWaiting, 0);
  w.dispatch('message', { data: { type: 'SKIP_WAITING' } });
  assert.equal(w.calls.skipWaiting, 1);
});

test('activate: deletes old dsa-streak caches, keeps the current one and other apps\' caches', async () => {
  const w = loadWorker({ caches: {
    'dsa-streak-v0': { a: 1 }, 'dsa-streak-old': { a: 1 }, 'dsa-streak-v1': { a: 1 },
    'money-manager-v5': { a: 1 }, 'workbox-precache': { a: 1 },
  } });
  const event = w.dispatch('activate');
  await Promise.all(event.waited);
  assert.deepEqual([...w.store.keys()].sort(), ['dsa-streak-v1', 'money-manager-v5', 'workbox-precache']);
  assert.equal(w.calls.claim, 1);
});

test('fetch: ignores requests that are not same-origin GET', () => {
  const w = loadWorker({ network: allOk() });
  assert.equal(w.dispatch('fetch', { request: w.request(`${SCOPE}app.js`, { method: 'POST' }) }).responded, null);
  assert.equal(w.dispatch('fetch', { request: w.request('https://other.example/x.js') }).responded, null);
  assert.equal(w.dispatch('fetch', { request: w.request('https://me.github.io.evil.com/dsa-streak/app.js') }).responded, null);
});

test('fetch: cache first, the network is not asked when the file is saved', async () => {
  const w = loadWorker({ caches: { 'dsa-streak-v1': { [`${SCOPE}app.js`]: response('cached js') } } });
  const event = w.dispatch('fetch', { request: w.request(`${SCOPE}app.js`) });
  assert.equal((await event.responded).body, 'cached js');
  assert.equal(w.fetches.length, 0);
});

test('fetch: a file that is not saved comes from the network and is saved for next time', async () => {
  const url = `${SCOPE}extra.json`;
  const w = loadWorker({ network: { [url]: response('net') } });
  const first = w.dispatch('fetch', { request: w.request(url) });
  assert.equal((await first.responded).body, 'net');
  assert.equal(w.store.get('dsa-streak-v1').get(url).body, 'net');
  // Offline now: still answered.
  const w2 = loadWorker({ caches: { 'dsa-streak-v1': { [url]: response('net') } } });
  const second = w2.dispatch('fetch', { request: w2.request(url) });
  assert.equal((await second.responded).body, 'net');
});

test('fetch: bad answers (404, other types) are not saved', async () => {
  const missing = `${SCOPE}missing.js`;
  const w = loadWorker({ network: { [missing]: response('x', { ok: false, status: 404 }) } });
  const event = w.dispatch('fetch', { request: w.request(missing) });
  assert.equal((await event.responded).status, 404);
  assert.equal(w.store.get('dsa-streak-v1').has(missing), false);
  const opaque = `${SCOPE}odd.js`;
  const w2 = loadWorker({ network: { [opaque]: response('x', { type: 'opaque' }) } });
  await w2.dispatch('fetch', { request: w2.request(opaque) }).responded;
  assert.equal(w2.store.get('dsa-streak-v1').has(opaque), false);
});

test('fetch: offline, opening any page address shows the app (index.html)', async () => {
  const w = loadWorker({ caches: { 'dsa-streak-v1': { [`${SCOPE}index.html`]: response('the app') } } });
  const event = w.dispatch('fetch', { request: w.request(`${SCOPE}?source=pwa`, { mode: 'navigate' }) });
  assert.equal((await event.responded).body, 'the app');
});

test('fetch: offline and not saved: a normal file fails, and so does a page when nothing is saved', async () => {
  const w = loadWorker({});
  await assert.rejects(w.dispatch('fetch', { request: w.request(`${SCOPE}nope.js`) }).responded, /offline/);
  await assert.rejects(w.dispatch('fetch', { request: w.request(SCOPE, { mode: 'navigate' }) }).responded, /offline/);
});

test('only the current build\'s cache answers (an old cache is never used)', async () => {
  const w = loadWorker({ version: 'v2', caches: { 'dsa-streak-v1': { [`${SCOPE}app.js`]: response('OLD') } },
    network: { [`${SCOPE}app.js`]: response('NEW') } });
  const event = w.dispatch('fetch', { request: w.request(`${SCOPE}app.js`) });
  assert.equal((await event.responded).body, 'NEW');
});

test('dev build: no precache, no interception', async () => {
  const w = loadWorker({ dev: true, version: 'dev', urls: [] });
  const install = w.dispatch('install');
  await Promise.all(install.waited);
  assert.equal(w.fetches.length, 0);
  assert.equal(w.dispatch('fetch', { request: w.request(`${SCOPE}app.js`) }).responded, null);
  assert.equal(w.calls.skipWaiting, 0);
});

test('the source file has no skipWaiting call outside the message handler', () => {
  const calls = SOURCE.match(/skipWaiting\(\)/g) || [];
  assert.equal(calls.length, 1);
  assert.match(SOURCE, /type === 'SKIP_WAITING'\) self\.skipWaiting\(\)/);
});
