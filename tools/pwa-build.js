// Build-time helpers for the service worker (used by tools/build.js, tested in tests/pwa-build.test.js).
//   finalizeDist(distDir, { dev })  -> after the files are in dist/, writes dist/sw.js with
//                                      the precache list and a version string (a hash of the build).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MARKERS = ['version', 'precache', 'dev'];

// Replaces the three "// @build:xxx" lines of sw.js. Fails loudly if one is missing.
export function injectBuildInfo(source, { version, urls, dev }) {
  const values = { version: JSON.stringify(version), precache: JSON.stringify(urls), dev: dev ? 'true' : 'false' };
  const lines = { version: 'VERSION', precache: 'PRECACHE_URLS', dev: 'DEV' };
  let out = source;
  for (const key of MARKERS) {
    const pattern = new RegExp(`^const ${lines[key]} = .*; // @build:${key}$`, 'm');
    if (!pattern.test(out)) throw new Error(`sw.js has no "@build:${key}" line to fill in`);
    out = out.replace(pattern, () => `const ${lines[key]} = ${values[key]}; // @build:${key}`);
  }
  return out;
}

// Every file in dist/ that the worker should save: relative URLs like './app.js'.
// Not the worker itself (the browser handles that one) and not source maps.
export function listPrecacheFiles(distDir) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else found.push(path.relative(distDir, full).split(path.sep).join('/'));
    }
  };
  walk(distDir);
  return found
    .filter((name) => name !== 'sw.js' && !name.endsWith('.map'))
    .sort()
    .map((name) => `./${name}`);
}

// A short hash of the names and contents of the files: any change gives a new version.
export function buildVersion(distDir, urls) {
  const hash = crypto.createHash('sha256');
  for (const url of urls) {
    hash.update(url);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(distDir, url)));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 12);
}

// dist/ must already hold the copied files and sw.js (still with its placeholder lines).
export function finalizeDist(distDir, { dev = false } = {}) {
  const swPath = path.join(distDir, 'sw.js');
  if (!fs.existsSync(swPath)) throw new Error('dist/sw.js is missing (expected src/pwa/sw.js)');
  const source = fs.readFileSync(swPath, 'utf8');
  if (dev) {
    // Dev server: the worker passes every request through, and its bytes never change,
    // so no update banner appears while you edit.
    fs.writeFileSync(swPath, injectBuildInfo(source, { version: 'dev', urls: [], dev: true }));
    return { version: 'dev', urls: [] };
  }
  // './' is the address people open; it is answered by index.html.
  const files = listPrecacheFiles(distDir);
  const version = buildVersion(distDir, files);
  const urls = ['./', ...files];
  fs.writeFileSync(swPath, injectBuildInfo(source, { version, urls, dev: false }));
  return { version, urls };
}
