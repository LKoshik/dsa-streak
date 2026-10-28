// A tiny pretend browser page, just enough to run the UI code in Node tests.
// Not a full DOM: only what src/ui and src/features use.

class FakeText {
  constructor(text) { this.nodeType = 3; this.text = String(text); this.parent = null; }
  get textContent() { return this.text; }
}

class FakeElement {
  constructor(tag) {
    this.nodeType = 1;
    this.tagName = tag;
    this.parent = null;
    this.children = [];
    this.attrs = {};
    this.listeners = {};
    this.dataset = {};
    this.scrollTop = 0;
    const style = { setProperty: (name, value) => { style[name] = value; } };
    this.style = style;
    const el = this;
    this.classList = {
      list() { return (el.attrs.class || '').split(/\s+/).filter(Boolean); },
      add(...names) { el.attrs.class = [...new Set([...this.list(), ...names])].join(' '); },
      remove(...names) { el.attrs.class = this.list().filter((c) => !names.includes(c)).join(' '); },
      contains(name) { return this.list().includes(name); },
    };
  }
  set className(value) { this.attrs.class = value; }
  get className() { return this.attrs.class || ''; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; }
  removeAttribute(name) { delete this.attrs[name]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  _adopt(node) {
    const child = typeof node === 'string' ? new FakeText(node) : node;
    if (child.parent) child.parent.children = child.parent.children.filter((c) => c !== child);
    child.parent = this;
    return child;
  }
  append(...nodes) { for (const n of nodes) this.children.push(this._adopt(n)); }
  appendChild(node) { this.append(node); return node; }
  replaceChildren(...nodes) {
    for (const c of this.children) c.parent = null;
    this.children = [];
    this.append(...nodes);
  }
  get isConnected() {
    let node = this;
    while (node.parent) node = node.parent;
    return node === globalThis.document.body;
  }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
  get textContent() { return this.children.map((c) => c.textContent).join(' '); }
  set textContent(value) { this.replaceChildren(new FakeText(value)); }
  // Test helpers
  findAll(predicate, found = []) {
    for (const c of this.children) {
      if (c.nodeType === 1) { if (predicate(c)) found.push(c); c.findAll(predicate, found); }
    }
    return found;
  }
  find(predicate) { return this.findAll(predicate)[0] || null; }
  click() { for (const fn of this.listeners.click || []) fn({ type: 'click' }); }
  fire(type, event = {}) { for (const fn of this.listeners[type] || []) fn({ type, ...event }); }
  focus() { globalThis.document.activeElement = this; }
}

// Puts a fake `document` and a manual requestAnimationFrame on globalThis.
// Returns { body, flushFrames, restore }.
export function installFakeDom() {
  const body = new FakeElement('body');
  const html = new FakeElement('html');
  const saved = {
    document: globalThis.document,
    requestAnimationFrame: globalThis.requestAnimationFrame,
  };
  let queue = [];
  let nextId = 1;
  const docListeners = {};
  globalThis.document = {
    activeElement: null,
    addEventListener: (type, fn) => { (docListeners[type] ||= new Set()).add(fn); },
    removeEventListener: (type, fn) => { docListeners[type]?.delete(fn); },
    createElement: (tag) => new FakeElement(tag),
    createElementNS: (ns, tag) => new FakeElement(tag),
    createTextNode: (text) => new FakeText(text),
    querySelector: () => null,
    body,
    documentElement: html,
  };
  globalThis.requestAnimationFrame = (fn) => { queue.push(fn); return nextId++; };
  return {
    body,
    // Sends a key press to listeners on the document.
    pressKey(key) { for (const fn of [...(docListeners.keydown || [])]) fn({ type: 'keydown', key }); },
    // Runs queued animation frames until none are left.
    flushFrames() {
      let guard = 0;
      while (queue.length && guard++ < 20) {
        const batch = queue; queue = [];
        for (const fn of batch) fn(0);
      }
    },
    restore() {
      globalThis.document = saved.document;
      globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    },
  };
}

// Handy checks for tests.
export const hasText = (el, text) => el.textContent.includes(text);
export const byClass = (el, name) => el.findAll((e) => e.classList.contains(name));
