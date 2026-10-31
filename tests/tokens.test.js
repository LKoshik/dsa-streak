// Checks the design tokens in src/styles/main.css: the two dark blocks stay identical, the topic colours
// are the chosen five, every banner colour passes text contrast, and the font ships with the app.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(ROOT, 'src/styles/main.css'), 'utf8');

// The text between { and } that follows `selector {`, as a name -> value map.
function declarations(block) {
  const out = {};
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[match[1]] = match[2].trim();
  return out;
}
function blockAfter(marker) {
  const start = css.indexOf(marker);
  assert.ok(start >= 0, `missing: ${marker}`);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
}
const light = declarations(blockAfter(':root {'));
const dark = declarations(blockAfter(':root[data-theme="dark"] {'));
const system = declarations(blockAfter(':root[data-theme="system"] {'));

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('tokens: the two dark blocks (dark, and system + phone in dark mode) match exactly', () => {
  assert.ok(Object.keys(dark).length >= 10);
  assert.deepEqual(system, dark);
});

test('tokens: the flame and node tokens exist in light and in both dark blocks', () => {
  for (const name of ['--flame-dim', '--node-upcoming', '--node-upcoming-star']) {
    assert.ok(light[name], `light ${name}`);
    assert.ok(dark[name], `dark ${name}`);
    assert.ok(system[name], `system ${name}`);
    assert.notEqual(light[name], dark[name], `${name} differs between light and dark`);
  }
});

test('tokens: the five topic colours are the chosen ones', () => {
  assert.equal(light['--hue-green'], '#57cc02');
  assert.equal(light['--hue-purple'], '#ce82ff');
  assert.equal(light['--hue-teal'], '#00cd9c');
  assert.equal(light['--hue-pink'], '#ff87d1');
  assert.equal(light['--hue-blue'], '#84d7ff');
  assert.equal(light['--hue-blue-edge'], '#4db4e6');
});

test('tokens: banner text on every topic colour passes 4.5:1 contrast', () => {
  const ink = light['--ink'];
  for (const hue of ['green', 'purple', 'teal', 'pink', 'blue', 'orange']) {
    const fill = light[`--hue-${hue}`];
    assert.match(fill, /^#[0-9a-f]{6}$/);
    assert.equal(light[`--hue-${hue}-fg`], 'var(--ink)');
    assert.ok(contrast(ink, fill) >= 4.5, `${hue}: ${contrast(ink, fill).toFixed(2)}`);
  }
});

test('tokens: every topic colour class exists for the section and for its sheet', () => {
  for (const hue of ['purple', 'teal', 'pink', 'blue']) {
    assert.ok(css.includes(`.topic--${hue}`), `.topic--${hue}`);
    assert.ok(css.includes(`.sheet--${hue}`), `.sheet--${hue}`);
  }
});

test('font: Nunito ships with the app, with a relative url (works under a GitHub Pages sub-path)', () => {
  assert.match(css, /@font-face\s*{[^}]*font-family:\s*"Nunito"/);
  const url = /url\("([^"]+\.woff2)"\)/.exec(css)[1];
  assert.ok(!url.startsWith('/') && !url.startsWith('http'), url);
  assert.ok(fs.existsSync(path.resolve(ROOT, 'src/styles', url)), `font file for ${url}`);
  assert.ok(fs.existsSync(path.join(ROOT, 'src/fonts/OFL.txt')), 'font licence');
});
