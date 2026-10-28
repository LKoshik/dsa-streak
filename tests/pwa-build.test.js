import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { injectBuildInfo, listPrecacheFiles, buildVersion, finalizeDist } from '../tools/pwa-build.js';

const SW = fs.readFileSync(new URL('../src/pwa/sw.js', import.meta.url), 'utf8');

function makeDist(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsa-dist-'));
  for (const [name, content] of Object.entries({ 'sw.js': SW, ...files })) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}
const read = (dir) => fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
const BASE = { 'index.html': '<html>', 'app.js': 'a', 'app.css': 'c', 'manifest.webmanifest': '{}', 'icons/x.png': 'p' };

test('injectBuildInfo fills the three lines and the result still runs', () => {
  const out = injectBuildInfo(SW, { version: 'abc123', urls: ['./', './app.js'], dev: false });
  assert.match(out, /^const VERSION = "abc123"; \/\/ @build:version$/m);
  assert.match(out, /^const PRECACHE_URLS = \["\.\/","\.\/app\.js"\]; \/\/ @build:precache$/m);
  assert.match(out, /^const DEV = false; \/\/ @build:dev$/m);
  assert.doesNotThrow(() => new vm.Script(out));
  // Running it again (e.g. a second build over the same file) still works.
  assert.match(injectBuildInfo(out, { version: 'n', urls: [], dev: true }), /DEV = true/);
});

test('injectBuildInfo fails loudly when a marker line is missing', () => {
  for (const key of ['version', 'precache', 'dev']) {
    const broken = SW.replace(`// @build:${key}`, '// removed');
    assert.throws(() => injectBuildInfo(broken, { version: 'v', urls: [], dev: false }), new RegExp(`@build:${key}`));
  }
});

test('injectBuildInfo does not break on text like $& in a version', () => {
  const out = injectBuildInfo(SW, { version: "a$&b", urls: [], dev: false });
  assert.match(out, /VERSION = "a\$&b"/);
});

test('listPrecacheFiles: relative URLs, sorted, no sw.js and no source maps', () => {
  const dir = makeDist({ ...BASE, 'app.js.map': 'm', 'app.css.map': 'm' });
  assert.deepEqual(listPrecacheFiles(dir), ['./app.css', './app.js', './icons/x.png', './index.html', './manifest.webmanifest']);
});

test('buildVersion: stable, and changes when a file changes, is added or renamed', () => {
  const a = makeDist(BASE);
  const b = makeDist(BASE);
  const va = buildVersion(a, listPrecacheFiles(a));
  assert.match(va, /^[0-9a-f]{12}$/);
  assert.equal(buildVersion(b, listPrecacheFiles(b)), va);
  fs.writeFileSync(path.join(b, 'app.js'), 'a changed');
  const changed = buildVersion(b, listPrecacheFiles(b));
  assert.notEqual(changed, va);
  fs.writeFileSync(path.join(b, 'new.txt'), 'x');
  assert.notEqual(buildVersion(b, listPrecacheFiles(b)), changed);
  const { 'app.js': _removed, ...withoutApp } = BASE;
  const c = makeDist({ ...withoutApp, 'other.js': 'a' });
  assert.notEqual(buildVersion(c, listPrecacheFiles(c)), va);
});

test('finalizeDist: writes version and precache list (with ./) into dist/sw.js', () => {
  const dir = makeDist(BASE);
  const { version, urls } = finalizeDist(dir);
  assert.deepEqual(urls, ['./', './app.css', './app.js', './icons/x.png', './index.html', './manifest.webmanifest']);
  const out = read(dir);
  assert.ok(out.includes(`const VERSION = "${version}"`));
  assert.ok(out.includes('const DEV = false;'));
  assert.ok(!urls.includes('./sw.js'));
});

test('finalizeDist: the worker file changes only when the app changes', () => {
  const a = makeDist(BASE);
  const b = makeDist(BASE);
  finalizeDist(a);
  finalizeDist(b);
  assert.equal(read(a), read(b));
  fs.writeFileSync(path.join(b, 'app.js'), 'new code');
  fs.writeFileSync(path.join(b, 'sw.js'), SW);
  finalizeDist(b);
  assert.notEqual(read(a), read(b));
});

test('finalizeDist in dev mode: fixed version, nothing precached, never intercepts', () => {
  const dir = makeDist(BASE);
  const result = finalizeDist(dir, { dev: true });
  assert.deepEqual(result, { version: 'dev', urls: [] });
  const out = read(dir);
  assert.ok(out.includes('const DEV = true;'));
  assert.ok(out.includes('const PRECACHE_URLS = [];'));
  fs.writeFileSync(path.join(dir, 'app.js'), 'changed');
  fs.writeFileSync(path.join(dir, 'sw.js'), SW);
  finalizeDist(dir, { dev: true });
  assert.equal(read(dir), out);
});

test('finalizeDist: a missing sw.js is an error', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsa-dist-'));
  assert.throws(() => finalizeDist(dir), /sw\.js is missing/);
});
