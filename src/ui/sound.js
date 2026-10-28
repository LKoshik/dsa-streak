// The sound player. Makes every sound live with the Web Audio API: no audio files.
//   unlockAudio()            call at the start of a tap (browsers only allow sound after a tap)
//   playSound(name, enabled) plays a sound from src/core/sound-recipes.js; returns true if it started
// If the browser has no Web Audio, or anything fails, it stays silent and nothing breaks.
import { RECIPES, noteHz } from '../core/sound-recipes.js';

const FLOOR = 0.0001;  // "silence" for exponential ramps (they cannot reach exactly 0)
const MASTER_GAIN = 0.7;
const MIN_GAP_MS = 80; // the same sound twice within this time is ignored

// Overtones of a glassy bell: [frequency ratio, loudness, how long it lasts compared to the note]
const BELL_PARTIALS = [[1, 1, 1], [2.76, 0.32, 0.55], [5.4, 0.12, 0.3]];

// One short burst of an oscillator with a quick attack and a smooth fade.
function voice(ctx, out, { type, freq, glideTo = null, glideTime = 0, at, dur, gain, attack = 0.005 }) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (glideTo !== null) osc.frequency.exponentialRampToValueAtTime(glideTo, at + glideTime);
  env.gain.setValueAtTime(FLOOR, at);
  env.gain.linearRampToValueAtTime(gain, at + attack);
  env.gain.exponentialRampToValueAtTime(FLOOR, at + dur);
  osc.connect(env);
  env.connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function playBell(ctx, out, e, t) {
  const base = noteHz(e.note);
  for (const [ratio, loudness, length] of BELL_PARTIALS) {
    const freq = base * ratio;
    if (freq > 14000) continue; // too high to matter, and can alias on some phones
    voice(ctx, out, { type: 'sine', freq, at: t, dur: e.dur * length, gain: e.gain * loudness });
  }
}

function playPop(ctx, out, e, t) {
  voice(ctx, out, { type: 'sine', freq: e.from, glideTo: e.to, glideTime: e.dur * 0.8, at: t, dur: e.dur, gain: e.gain });
}

function playTone(ctx, out, e, t) {
  voice(ctx, out, { type: 'triangle', freq: noteHz(e.note), at: t, dur: e.dur, gain: e.gain, attack: 0.012 });
}

// Airy sweep: noise through a filter whose pitch slides from e.from to e.to.
function playWhoosh(ctx, out, e, t, noise) {
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const env = ctx.createGain();
  source.buffer = noise;
  source.loop = true;
  filter.type = 'bandpass';
  filter.Q.setValueAtTime(1.2, t);
  filter.frequency.setValueAtTime(e.from, t);
  filter.frequency.exponentialRampToValueAtTime(e.to, t + e.dur);
  env.gain.setValueAtTime(FLOOR, t);
  env.gain.linearRampToValueAtTime(e.gain, t + e.dur * 0.45);
  env.gain.exponentialRampToValueAtTime(FLOOR, t + e.dur);
  source.connect(filter);
  filter.connect(env);
  env.connect(out);
  source.start(t);
  source.stop(t + e.dur + 0.05);
}

// Makes a player. The options exist so tests can plug in a pretend audio system.
export function createSoundEngine({
  getContextClass = () => globalThis.AudioContext || globalThis.webkitAudioContext,
  recipes = RECIPES,
  nowMs = () => Date.now(),
} = {}) {
  let ctx = null;
  let out = null;
  let noise = null;
  let failed = false;
  const lastPlayed = new Map(); // sound name -> time it last started

  function getContext() {
    if (ctx) return ctx;
    if (failed) return null;
    try {
      const ContextClass = getContextClass();
      if (!ContextClass) { failed = true; return null; }
      ctx = new ContextClass();
      const master = ctx.createGain();
      master.gain.setValueAtTime(MASTER_GAIN, 0);
      const limiter = ctx.createDynamicsCompressor(); // keeps big chords from crackling
      master.connect(limiter);
      limiter.connect(ctx.destination);
      out = master;
    } catch (error) {
      console.error(error);
      ctx = null;
      failed = true;
    }
    return ctx;
  }

  function noiseBuffer() {
    if (noise) return noise;
    const length = Math.floor(ctx.sampleRate || 44100);
    noise = ctx.createBuffer(1, length, ctx.sampleRate || 44100);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return noise;
  }

  // Call this at the START of a tap (before any await): phones only let audio start from a tap.
  function unlock() {
    const c = getContext();
    if (c && c.state === 'suspended' && typeof c.resume === 'function') {
      c.resume().catch(() => {});
    }
  }

  function play(name, enabled = true) {
    if (!enabled) return false;
    const recipe = recipes[name];
    if (!recipe) return false;
    const now = nowMs();
    const last = lastPlayed.get(name);
    if (last !== undefined && now - last < MIN_GAP_MS) return false;
    const c = getContext();
    if (!c) return false;
    try {
      if (c.state === 'suspended' && typeof c.resume === 'function') c.resume().catch(() => {});
      const start = c.currentTime + 0.02;
      for (const e of recipe) {
        const t = start + e.at;
        if (e.kind === 'bell') playBell(c, out, e, t);
        else if (e.kind === 'pop') playPop(c, out, e, t);
        else if (e.kind === 'tone') playTone(c, out, e, t);
        else if (e.kind === 'whoosh') playWhoosh(c, out, e, t, noiseBuffer());
      }
      lastPlayed.set(name, now);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  return { play, unlock };
}

// The one player the app uses.
const engine = createSoundEngine();
export const unlockAudio = () => engine.unlock();
export const playSound = (name, enabled = true) => engine.play(name, enabled);
