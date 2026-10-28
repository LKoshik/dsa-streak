import test from 'node:test';
import assert from 'node:assert/strict';
import { registerWorker } from '../src/ui/sw-client.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));

class FakeWorker extends EventTarget {
  constructor(state = 'installing') { super(); this.state = state; this.messages = []; }
  postMessage(message) { this.messages.push(message); }
  setState(state) { this.state = state; this.dispatchEvent(new Event('statechange')); }
}
class FakeRegistration extends EventTarget {
  constructor() { super(); this.waiting = null; this.installing = null; this.updates = 0; }
  update() { this.updates += 1; return Promise.resolve(); }
  foundUpdate(worker) { this.installing = worker; this.dispatchEvent(new Event('updatefound')); }
}
class FakeContainer extends EventTarget {
  constructor({ controller = {}, registration = new FakeRegistration(), failRegister = false } = {}) {
    super();
    this.controller = controller;
    this.registration = registration;
    this.failRegister = failRegister;
    this.registered = [];
  }
  async register(url) {
    this.registered.push(url);
    if (this.failRegister) throw new Error('blocked');
    return this.registration;
  }
}
class FakeDoc extends EventTarget {
  constructor() { super(); this.visibilityState = 'hidden'; }
  show() { this.visibilityState = 'visible'; this.dispatchEvent(new Event('visibilitychange')); }
}

function setup(options = {}, extra = {}) {
  const container = new FakeContainer(options);
  const calls = { ready: 0, reload: 0 };
  const doc = new FakeDoc();
  const client = registerWorker({
    serviceWorker: container, doc,
    onUpdateReady: () => { calls.ready += 1; },
    reload: () => { calls.reload += 1; },
    ...extra,
  });
  return { container, calls, client, doc, reg: container.registration };
}

test('no service worker support: nothing happens', () => {
  assert.equal(registerWorker({ serviceWorker: undefined }), null);
});

test('registers with a relative path', async () => {
  const { container, client } = setup();
  await client.registration;
  assert.deepEqual(container.registered, ['./sw.js']);
});

test('a worker already waiting at load shows the banner once', async () => {
  const reg = new FakeRegistration();
  reg.waiting = new FakeWorker('installed');
  const { calls, client } = setup({ registration: reg });
  await client.registration;
  assert.equal(calls.ready, 1);
  assert.equal(client.hasUpdate(), true);
});

test('nothing waiting at load: no banner', async () => {
  const { calls, client } = setup();
  await client.registration;
  assert.equal(calls.ready, 0);
  assert.equal(client.hasUpdate(), false);
});

test('updatefound then installed (with a controller) shows the banner', async () => {
  const { calls, client, reg } = setup();
  await client.registration;
  const worker = new FakeWorker();
  reg.foundUpdate(worker);
  worker.setState('installing');
  assert.equal(calls.ready, 0);
  reg.waiting = worker;
  worker.setState('installed');
  assert.equal(calls.ready, 1);
  worker.setState('activated');
  assert.equal(calls.ready, 1);
});

test('the very first install (no controller) shows no banner', async () => {
  const { calls, client, reg } = setup({ controller: null });
  await client.registration;
  const worker = new FakeWorker();
  reg.foundUpdate(worker);
  worker.setState('installed');
  assert.equal(calls.ready, 0);
});

test('the same waiting worker is announced only once', async () => {
  const reg = new FakeRegistration();
  const worker = new FakeWorker('installed');
  reg.waiting = worker;
  const { calls, client } = setup({ registration: reg });
  await client.registration;
  reg.foundUpdate(worker);
  reg.waiting = worker;
  worker.setState('installed');
  assert.equal(calls.ready, 1);
});

test('applyUpdate sends SKIP_WAITING to the waiting worker; controllerchange reloads exactly once', async () => {
  const reg = new FakeRegistration();
  const worker = new FakeWorker('installed');
  reg.waiting = worker;
  const { container, calls, client } = setup({ registration: reg });
  await client.registration;
  assert.equal(calls.reload, 0);
  assert.equal(client.applyUpdate(), true);
  assert.deepEqual(worker.messages, [{ type: 'SKIP_WAITING' }]);
  assert.equal(calls.reload, 0); // waits for the new worker to take control
  container.dispatchEvent(new Event('controllerchange'));
  container.dispatchEvent(new Event('controllerchange'));
  assert.equal(calls.reload, 1);
});

test('controllerchange without a tap on Reload does not reload (e.g. the first install)', async () => {
  const { container, calls, client } = setup({ controller: null });
  await client.registration;
  container.dispatchEvent(new Event('controllerchange'));
  assert.equal(calls.reload, 0);
});

test('applyUpdate with nothing waiting does nothing', async () => {
  const { container, calls, client } = setup();
  await client.registration;
  assert.equal(client.applyUpdate(), false);
  container.dispatchEvent(new Event('controllerchange'));
  assert.equal(calls.reload, 0);
});

test('a waiting worker found after updatefound is the one that gets the message', async () => {
  const { client, reg } = setup();
  await client.registration;
  const installing = new FakeWorker();
  const waiting = new FakeWorker('installed');
  reg.foundUpdate(installing);
  reg.waiting = waiting;
  installing.setState('installed');
  client.applyUpdate();
  assert.deepEqual(waiting.messages, [{ type: 'SKIP_WAITING' }]);
  assert.deepEqual(installing.messages, []);
});

test('if registering fails the app keeps working (error is logged, no banner)', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const { calls, client } = setup({ failRegister: true });
  assert.equal(await client.registration, null);
  assert.equal(calls.ready, 0);
  assert.equal(log.mock.callCount(), 1);
  assert.equal(client.applyUpdate(), false);
});

test('coming back to the app checks for a new version', async () => {
  const { client, doc, reg } = setup();
  await client.registration;
  doc.dispatchEvent(new Event('visibilitychange')); // hidden: nothing
  assert.equal(reg.updates, 0);
  doc.show();
  assert.equal(reg.updates, 1);
});
