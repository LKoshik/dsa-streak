import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, SOUND_PRIORITY, noteHz, recipeLength } from '../src/core/sound-recipes.js';
import { createSoundEngine } from '../src/ui/sound.js';

// ---------- the recipes ----------

test('noteHz: known pitches and bad names', () => {
  assert.equal(Math.round(noteHz('A4')), 440);
  assert.equal(Math.round(noteHz('C5')), 523);
  assert.equal(Math.round(noteHz('A5')), 880);
  assert.ok(noteHz('F#4') > noteHz('F4'));
  assert.ok(noteHz('Bb4') < noteHz('B4'));
  assert.throws(() => noteHz('H4'), RangeError);
});

test('every priority has a recipe and every recipe has a priority', () => {
  assert.deepEqual(Object.keys(RECIPES).sort(), Object.keys(SOUND_PRIORITY).sort());
});

test('every recipe is well formed and short enough', () => {
  for (const [name, recipe] of Object.entries(RECIPES)) {
    assert.ok(recipe.length > 0, name);
    for (const e of recipe) {
      assert.ok(['bell', 'pop', 'tone', 'whoosh'].includes(e.kind), `${name}: kind ${e.kind}`);
      assert.ok(e.at >= 0 && e.dur > 0 && e.gain > 0 && e.gain <= 0.6, `${name}: timing or gain`);
      if (e.kind === 'bell' || e.kind === 'tone') assert.ok(noteHz(e.note) > 0, `${name}: note`);
      else assert.ok(e.from > 0 && e.to > 0, `${name}: from/to`);
    }
    assert.ok(recipeLength(recipe) <= 2.6, `${name} is too long`);
  }
});

test('bigger moments get longer sounds than a normal solve', () => {
  assert.ok(recipeLength(RECIPES.solve) < recipeLength(RECIPES.goalMet));
  assert.ok(recipeLength(RECIPES.goalMet) < recipeLength(RECIPES.topicDone));
  assert.ok(recipeLength(RECIPES.solve) <= 0.7);
});

// ---------- the player, with a pretend audio system ----------

function pretendAudio() {
  const log = { created: 0, oscillators: 0, noises: 0, resumed: 0, started: [] };
  const param = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 });
  const node = (extra = {}) => ({ connect() {}, start(t) { log.started.push(t); }, stop() {}, ...extra });
  class FakeContext {
    constructor() {
      log.created += 1;
      this.state = 'suspended';
      this.currentTime = 10;
      this.sampleRate = 8000;
      this.destination = {};
    }
    resume() { log.resumed += 1; this.state = 'running'; return Promise.resolve(); }
    createGain() { return node({ gain: param() }); }
    createDynamicsCompressor() { return node(); }
    createOscillator() { log.oscillators += 1; return node({ frequency: param(), type: '' }); }
    createBiquadFilter() { return node({ frequency: param(), Q: param(), type: '' }); }
    createBufferSource() { log.noises += 1; return node({ buffer: null, loop: false }); }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  }
  return { FakeContext, log };
}

test('player: plays a sound, using the audio system lazily', () => {
  const { FakeContext, log } = pretendAudio();
  const engine = createSoundEngine({ getContextClass: () => FakeContext, nowMs: () => 1000 });
  assert.equal(log.created, 0); // nothing is created until needed
  assert.equal(engine.play('solve'), true);
  assert.equal(log.created, 1);
  assert.ok(log.oscillators > 0);
  assert.ok(log.resumed >= 1); // a suspended context is woken up
  assert.ok(log.started.every((t) => t >= 10)); // scheduled from "now" on
});

test('player: whoosh sounds use noise, bell sounds do not', () => {
  const { FakeContext, log } = pretendAudio();
  const engine = createSoundEngine({ getContextClass: () => FakeContext, nowMs: () => 1000 });
  engine.play('solve');
  assert.equal(log.noises, 0);
  engine.play('milestone');
  assert.equal(log.noises, 1);
});

test('player: disabled, unknown name, or no audio support stay silent', () => {
  const { FakeContext, log } = pretendAudio();
  const engine = createSoundEngine({ getContextClass: () => FakeContext, nowMs: () => 1000 });
  assert.equal(engine.play('solve', false), false);
  assert.equal(engine.play('nope'), false);
  assert.equal(log.created, 0); // switched off means the audio system is never even created
  const none = createSoundEngine({ getContextClass: () => undefined });
  assert.equal(none.play('solve'), false);
  none.unlock(); // must not throw
});

test('player: the same sound twice in a row is ignored, later it plays again', () => {
  const { FakeContext } = pretendAudio();
  let now = 1000;
  const engine = createSoundEngine({ getContextClass: () => FakeContext, nowMs: () => now });
  assert.equal(engine.play('solve'), true);
  now += 20;
  assert.equal(engine.play('solve'), false);
  assert.equal(engine.play('goalMet'), true); // a different sound is fine
  now += 500;
  assert.equal(engine.play('solve'), true);
});

test('player: unlock wakes the audio system without playing anything', () => {
  const { FakeContext, log } = pretendAudio();
  const engine = createSoundEngine({ getContextClass: () => FakeContext });
  engine.unlock();
  assert.equal(log.created, 1);
  assert.equal(log.resumed, 1);
  assert.equal(log.oscillators, 0);
});

test('player: a crash inside the audio system is swallowed', () => {
  const engine = createSoundEngine({ getContextClass: () => class { constructor() { throw new Error('no audio'); } } });
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(engine.play('solve'), false);
    assert.equal(engine.play('solve'), false);
  } finally {
    console.error = original;
  }
});
