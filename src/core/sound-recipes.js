// The sounds of DSA Streak, written as plain data (no audio code here).
// Each sound is a list of little "events". The player in src/ui/sound.js turns them into audio.
//
// Event kinds:
//   bell   { at, note, dur, gain }          glassy "ding" (a note plus bright overtones)
//   pop    { at, from, to, dur, gain }      quick bouncy "bloop" that slides from one pitch (Hz) to another
//   tone   { at, note, dur, gain }          soft sustained note (for the body of a chord)
//   whoosh { at, from, to, dur, gain }      airy sweep, like a flame or a fanfare entrance
// `at` and `dur` are in seconds. Notes are names like 'C5' or 'F#4'.

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// 'A4' -> 440 (Hz). Throws on a bad name, so a typo in a recipe fails the tests.
export function noteHz(name) {
  const match = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!match) throw new RangeError(`Bad note name: ${name}`);
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  const midi = 12 * (Number(match[3]) + 1) + SEMITONES[match[1]] + accidental;
  return 440 * 2 ** ((midi - 69) / 12);
}

// A run of bells, one after another: bells(0, 0.07, ['C5','E5','G5'], 0.4, 0.35)
const bells = (start, step, notes, gain, dur) =>
  notes.map((note, i) => ({ kind: 'bell', at: start + i * step, note, dur, gain }));

// Several bells at the same moment (a chord).
const chord = (at, notes, gain, dur) => notes.map((note) => ({ kind: 'bell', at, note, dur, gain }));

// How loud each sound is in the "which one wins" rule. Higher wins when several happen at once.
export const SOUND_PRIORITY = {
  solve: 1,
  goalMet: 2,
  section: 2,
  streakStart: 2,
  freeze: 3,
  milestone: 3,
  levelUp: 3,
  topicDone: 4,
};

export const RECIPES = {
  // Every solve: a bouncy "pop" and a quick two-note ding-ding going up.
  solve: [
    { kind: 'pop', at: 0, from: 380, to: 820, dur: 0.1, gain: 0.45 },
    ...bells(0.06, 0.075, ['G5', 'D6'], 0.5, 0.45),
  ],

  // Daily goal reached: a sparkly rising arpeggio with glitter on top.
  goalMet: [
    { kind: 'pop', at: 0, from: 300, to: 700, dur: 0.09, gain: 0.35 },
    ...bells(0.04, 0.07, ['C5', 'E5', 'G5', 'C6'], 0.42, 0.4),
    ...chord(0.34, ['E6', 'G6'], 0.4, 0.7),
    ...bells(0.46, 0.07, ['C7', 'E7'], 0.2, 0.35),
  ],

  // A section (subsection) finished: a happy little "tada" in a brighter key.
  section: [
    { kind: 'pop', at: 0, from: 340, to: 900, dur: 0.1, gain: 0.35 },
    ...bells(0.05, 0.08, ['G5', 'B5', 'D6'], 0.42, 0.4),
    ...chord(0.31, ['G6', 'B6'], 0.4, 0.65),
    ...bells(0.45, 0.07, ['D7'], 0.2, 0.3),
  ],

  // The very first streak day: a flame whoosh, then a warm ding.
  streakStart: [
    { kind: 'whoosh', at: 0, from: 300, to: 2600, dur: 0.38, gain: 0.3 },
    ...chord(0.3, ['A5', 'E6'], 0.45, 0.7),
    { kind: 'pop', at: 0.3, from: 500, to: 1000, dur: 0.08, gain: 0.3 },
  ],

  // Streak freeze earned: icy glass notes falling, then a shimmering chord.
  freeze: [
    { kind: 'whoosh', at: 0, from: 5000, to: 9000, dur: 0.3, gain: 0.12 },
    ...bells(0.02, 0.07, ['E7', 'B6', 'G#6', 'E6'], 0.32, 0.4),
    ...chord(0.36, ['E6', 'B6', 'G#6'], 0.36, 0.9),
    ...bells(0.42, 0.09, ['E7', 'B7'], 0.16, 0.5),
  ],

  // 7-day style streak milestone: whoosh, three punchy steps, then a big chord.
  milestone: [
    { kind: 'whoosh', at: 0, from: 250, to: 2200, dur: 0.4, gain: 0.3 },
    ...bells(0.3, 0.08, ['C5', 'E5', 'G5'], 0.45, 0.35),
    ...chord(0.56, ['C6', 'E6', 'G6', 'C7'], 0.38, 1.0),
    { kind: 'tone', at: 0.56, note: 'C4', dur: 0.8, gain: 0.3 },
    ...bells(0.7, 0.07, ['G7', 'E7'], 0.16, 0.4),
  ],

  // New level: a fast run up the scale, then a big bright chord.
  levelUp: [
    { kind: 'pop', at: 0, from: 260, to: 620, dur: 0.1, gain: 0.35 },
    ...bells(0.04, 0.06, ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'], 0.38, 0.35),
    ...chord(0.58, ['G6', 'C7', 'E7'], 0.38, 1.1),
    { kind: 'tone', at: 0.58, note: 'C5', dur: 0.9, gain: 0.25 },
    ...bells(0.72, 0.07, ['G7', 'C8'], 0.14, 0.4),
  ],

  // A whole topic finished: the biggest one. Fanfare, huge chord, glitter falling down.
  topicDone: [
    { kind: 'whoosh', at: 0, from: 220, to: 2800, dur: 0.45, gain: 0.3 },
    ...bells(0.28, 0.07, ['G4', 'C5', 'E5', 'G5'], 0.42, 0.3),
    ...bells(0.62, 0.07, ['G4', 'C5', 'E5', 'G5'], 0.42, 0.3),
    ...chord(0.96, ['C6', 'E6', 'G6', 'C7', 'E7'], 0.34, 1.4),
    { kind: 'tone', at: 0.96, note: 'C4', dur: 1.2, gain: 0.32 },
    { kind: 'tone', at: 0.96, note: 'G4', dur: 1.0, gain: 0.2 },
    ...bells(1.1, 0.09, ['C8', 'G7', 'E7', 'C7', 'G7', 'E7'], 0.16, 0.45),
  ],
};

// Where a sound ends, in seconds (handy for tests and for keeping sounds short).
export function recipeLength(recipe) {
  return Math.max(...recipe.map((e) => e.at + e.dur));
}
