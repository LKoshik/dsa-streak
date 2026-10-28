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
