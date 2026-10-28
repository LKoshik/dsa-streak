// Checks the manifest, the icon files and the links in index.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const PWA = new URL('../src/pwa/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.webmanifest', PWA), 'utf8'));
const indexHtml = fs.readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');

// Width and height written inside a PNG file.
function pngSize(file) {
  const bytes = fs.readFileSync(new URL(file, PWA));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', `${file} is not a PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test('manifest: the fields Chrome needs to offer Install', () => {
  assert.equal(manifest.name, 'DSA Streak');
  assert.ok(manifest.short_name && manifest.short_name.length <= 12);
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
});

test('manifest: every URL is relative (works under a GitHub Pages sub-path)', () => {
  const urls = [manifest.start_url, manifest.scope, manifest.id, ...manifest.icons.map((i) => i.src)];
  for (const url of urls) assert.ok(!/^(\/|[a-z]+:)/i.test(url), `${url} must be relative`);
});

test('manifest: 192 and 512 icons plus a maskable icon, and the files really have those sizes', () => {
  const find = (size, purpose) => manifest.icons.find((i) => i.sizes === size && i.purpose === purpose);
  for (const icon of [find('192x192', 'any'), find('512x512', 'any'), find('512x512', 'maskable')]) {
    assert.ok(icon, 'icon missing');
    assert.equal(icon.type, 'image/png');
    const [w, h] = icon.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(icon.src), [w, h]);
  }
});

test('apple touch icon is 180x180', () => {
  assert.deepEqual(pngSize('apple-touch-icon.png'), [180, 180]);
});

test('the SVG sources exist and are SVG', () => {
  for (const name of ['icon.svg', 'icon-maskable.svg']) {
    const text = fs.readFileSync(new URL(name, PWA), 'utf8');
    assert.match(text, /^<svg /);
    assert.match(text, /viewBox="0 0 512 512"/);
  }
});

test('index.html links the manifest and icons with relative URLs', () => {
  assert.match(indexHtml, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
  assert.match(indexHtml, /<link rel="apple-touch-icon" href="\.\/apple-touch-icon\.png">/);
  assert.match(indexHtml, /<link rel="icon" href="\.\/icon\.svg"/);
  assert.match(indexHtml, /<meta name="theme-color"/);
});

test('main.js registers the worker with a relative path and no absolute sw URL anywhere', () => {
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const client = fs.readFileSync(new URL('../src/ui/sw-client.js', import.meta.url), 'utf8');
  assert.match(main, /registerWorker/);
  assert.match(client, /scriptUrl = '\.\/sw\.js'/);
  assert.ok(!/['"`]\/sw\.js['"`]/.test(main + client));
});
