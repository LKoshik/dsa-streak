// Guards against "the screen calls an action that main.js never handed over".
// (That bug made the Sound Off switch fail on a real phone while every screen test still passed,
// because the screen tests use the whole actions file and main.js used to pick names by hand.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as actions from '../src/state/actions.js';

function jsFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...jsFiles(path));
    else if (name.endsWith('.js')) found.push(path);
  }
  return found;
}

test('main.js gives every screen the whole actions file (no hand-picked list)', () => {
  const source = readFileSync('src/main.js', 'utf8');
  assert.match(source, /import \* as actions from '\.\/state\/actions\.js'/);
  assert.doesNotMatch(source, /const actions = \{/);
});

test('every actions.something() a screen calls really exists in actions.js', () => {
  const used = new Map(); // action name -> file that calls it
  for (const file of jsFiles('src/features')) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bactions\.([A-Za-z_$][\w$]*)/g)) used.set(match[1], file);
  }
  assert.ok(used.size > 0, 'expected the screens to call some actions');
  for (const [name, file] of used) {
    assert.equal(typeof actions[name], 'function', `${file} calls actions.${name}, but actions.js has no such function`);
  }
  assert.ok(used.has('setSound'), 'the Settings screen should be calling setSound');
});
