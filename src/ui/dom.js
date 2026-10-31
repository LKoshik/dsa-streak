// h(tag, props, ...children): a small helper that builds DOM elements.
//   h('button', { class: 'btn', onclick: fn }, 'Save')
// - props starting with "on" are event listeners (onclick, onchange...)
// - "style" can be an object, "dataset" an object of data-* values
// - children can be text, numbers, elements, arrays; null/false/undefined are skipped
// SVG tags (svg, path, circle...) are created in the SVG namespace automatically.

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polygon', 'polyline',
  'defs', 'linearGradient', 'radialGradient', 'stop', 'text', 'title',
  'clipPath', 'use', 'symbol',
]);

function addChildren(parent, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false || child === true) continue;
    if (Array.isArray(child)) addChildren(parent, child);
    else if (typeof child === 'object') parent.append(child);
    else parent.append(document.createTextNode(String(child)));
  }
}

export function h(tag, props, ...children) {
  const isSvg = SVG_TAGS.has(tag);
  const el = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'className') {
      el.setAttribute('class', value);
    } else if (key === 'style' && typeof value === 'object') {
      for (const [name, v] of Object.entries(value)) {
        if (name.startsWith('--')) el.style.setProperty(name, v);
        else el.style[name] = v;
      }
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(el.dataset, value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  addChildren(el, children);
  return el;
}

// svgFromString(markup): turns a piece of SVG TEXT (one root <svg>) into a real element.
// Used for the big drawings (flames, Ember, path node art) that are stored as text.
// A tiny reader on purpose: tags, double-quoted attributes, text, self-closing tags. No entities, no comments.
const TOKEN = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
const ATTRIBUTE = /([\w:-]+)="([^"]*)"/g;

export function svgFromString(markup) {
  const stack = [];
  let root = null;
  TOKEN.lastIndex = 0;
  for (let match = TOKEN.exec(markup); match !== null; match = TOKEN.exec(markup)) {
    const [, closing, tag, attributes, selfClosing, text] = match;
    if (text !== undefined) {
      if (stack.length > 0 && text.trim() !== '') stack[stack.length - 1].append(document.createTextNode(text));
      continue;
    }
    if (closing) {
      stack.pop();
      continue;
    }
    const el = document.createElementNS(SVG_NS, tag);
    ATTRIBUTE.lastIndex = 0;
    for (let a = ATTRIBUTE.exec(attributes); a !== null; a = ATTRIBUTE.exec(attributes)) el.setAttribute(a[1], a[2]);
    if (stack.length > 0) stack[stack.length - 1].append(el);
    else root = el;
    if (!selfClosing) stack.push(el);
  }
  if (root === null || stack.length !== 0) throw new Error('svgFromString: the markup is not one complete element');
  return root;
}
