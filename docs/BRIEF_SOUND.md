# DSA Streak: Sound Brief (Phase 10)

Put this file in `docs/BRIEF_SOUND.md` of the project. It adds to the main Brief and the V2 amendments. If it disagrees with them, this file wins only for sound.

Written against the code as of `dsa-streak-phase9.zip` (Home, Path, Stats, Settings, backup, PWA done; 326 tests green).

---

## 1. Goal

Make the app feel alive and rewarding, like Duolingo does: every important tap answers back with a short, pleasant sound, and bigger achievements get bigger sounds. The sounds must make the habit more fun, never annoying.

Rules that decide every later choice:

1. **Original sounds only.** Duolingo's real sounds are copyrighted. We make our own in the same spirit (bright, short, rising for good things, soft and low for problems).
2. **Sound is a bonus, never the only signal.** Everything that has a sound already has a visual (toast, ring, Ember, XP float). Sound never carries information alone.
3. **Short and quiet.** Most sounds are under 300 ms, the biggest under 1.5 s. Default volume is moderate. No loops, no music.
4. **Never surprise the person.** No sound on app open, no sound for things that happen by themselves (midnight, background updates), no sound when the page is hidden.
5. **Easy to turn off.** One switch in Settings, saved and included in the backup file.
6. **No new dependencies, works offline.** Synthesize the sounds with the browser's Web Audio API (no audio files, no libraries). Nothing extra to download, nothing extra to cache, no licensing.

---

## 2. Decisions to agree on BEFORE any code (my recommendation first)

The owner's rule: discuss and agree before code is written. Ask these as one short list, then build.

| # | Question | Recommended | Alternative |
|---|----------|-------------|-------------|
| D1 | How are sounds made? | **Synthesized with Web Audio** (oscillators and short noise bursts, tuned by ear in a Sound Lab page) | Recorded files (.mp3/.ogg) you make or license yourself; needs files in `src/pwa/sounds/`, they are precached automatically |
| D2 | Several rewards at once (for example goal reached + level up + topic finished) | **One solve pop, then ONE reward sound, the highest priority** (section 5). All toasts still show. | Queue up to two reward sounds one after the other (longer, can feel noisy) |
| D3 | Settings | **"Sound effects" On/Off + "Volume" Low/Medium/High**, default On, Medium | Only On/Off |
| D4 | Vibration | **Add a "Vibration" On/Off** too (today solves already call `navigator.vibrate(20)` with no switch) | Leave vibration as it is |
| D5 | Sound for the update banner ("New version ready") | **Yes, very soft** | No sound (it is a passive event) |
| D6 | Tap ticks on the bottom navigation and segmented controls | **Yes, very soft and rate limited** | Only reward and error sounds |

If the owner just says "go with your recommendations", use the Recommended column.

---

## 3. Where sound plays in the current app (the full list)

Every row is a real place in the current code.

### 3.1 Solving a problem (the most important moment)

Files: `src/features/home/index.js` (`onSolved`), `src/features/path/index.js` (solve handler around line 213), reward logic in `src/features/home/rewards.js` (`computeRewards`).

| Event | Today | Sound |
|-------|-------|-------|
| "Solved" tapped on Home, save succeeded | bounce, `+10 XP` float, `vibrate(20)`, toast "Marked #N solved" with Undo | `solve` |
| Same on Path (sheet checkbox, after the confirm step) | `vibrate(20)`, reward toasts | `solve` |
| Daily goal reached (toast "+5 daily goal reached") | reward toast | `goal` |
| Streak started (first solve ever, streak 0 to 1) | toast "Streak started" | `streak-start` |
| Freeze earned (toast "Freeze earned") | toast, Ember cheers | `freeze` |
| 7-day streak milestone with freezes already full (toast "N-day streak") | toast, Ember cheers | `streak-milestone` |
| Level up (toast "Level N") | toast, Ember cheers | `level-up` |
| Section finished (toast "Section finished: ...") | toast | `section` |
| Topic finished (toast "Topic finished: ...") | toast, Ember cheers | `topic` |
| Undo tapped (toast Undo on Home) | `unmarkSolved` | `undo` |
| Uncheck confirmed on Path ("Unchecked #N") | toast | `undo` |
| Solve save failed ("Could not save...") | default toast | `error` |

### 3.2 Navigation and small interactions

| Event | File | Sound |
|-------|------|-------|
| Bottom navigation item tapped | `src/ui/nav.js` (plain links) | `tap` |
| Path node tapped, bottom sheet opens | `src/ui/sheet.js` (`openSheet`) | `sheet-open` |
| Sheet closes (X, background tap, Escape, swipe) | `src/ui/sheet.js` | `sheet-close` |
| "Continue here" pressed on Path (`onContinue`, toast "Next up: ...") | `src/features/path/index.js` | `continue` |
| Goal 1/2/3 or Theme segmented control tapped | `src/features/settings/index.js` | `select` |
| Sound switch turned ON in Settings | settings | `select` (so the person hears that it works; no sound when turned off) |

### 3.3 Backup and updates

| Event | File | Sound |
|-------|------|-------|
| Export backup finished (toast "Backup saved...") | settings | `success` |
| Import restored ("Backup restored: N solved problems") | settings | `success` |
| Import file rejected (error list shown) or export failed | settings | `error` |
| Import confirm box appears ("This replaces all data...") | settings | none (do not startle) |
| "New version ready" banner appears | `src/ui/update-banner.js` / `src/main.js` | `notify` (soft, D5) |

### 3.4 Never play a sound for

App start, loading screens, Stats screen scrolling, the midnight rollover, today changing, the streak-at-risk state, Ember changing mood, toasts disappearing, the service worker updating in the background, any event while `document.hidden` is true.

---

## 4. Timing (what happens in what order)

The solve moment, as a timeline (all times from the moment `markSolved` resolves successfully; never play before the save succeeds):

```
t = 0 ms     markSolved resolved      -> play `solve` (pop + two-note chime, about 300 ms)
                                          XP float "+10 XP" appears, bounce starts, vibrate
t = +150 ms  highest priority reward  -> play ONE reward sound (section 5 priority)
                                          reward toasts + Ember cheer start at the same moment
t = +150..1500 ms                      reward sound rings out (it may overlap the tail of `solve`)
```

Why +150 ms: the pop must be heard as its own event, and the reward should feel like an answer to it, not a clash. Tune by ear in the Sound Lab (section 8).

Other timing rules:

* **Latency:** schedule every sound with `AudioContext.currentTime` (Web Audio is under 20 ms on Android). Do not use `setTimeout` for tight timing, except the +150 ms reward delay (use `ctx.currentTime + 0.15` there too).
* **Nav and select ticks:** play on `pointerdown` (feels instant), not on `click`. Everything with an async save waits for success.
* **Rate limits (engine side, per sound):** `tap` and `select` at most one every 60 ms; any other sound at most one every 120 ms. Stops machine-gun noise when someone mashes buttons.
* **Voice limit:** at most 6 sounds playing at once; a new sound beyond that is dropped (lowest priority first).
* **Hidden page:** if `document.visibilityState !== 'visible'`, play nothing.

---

## 5. Reward priority (D2 recommended behaviour)

`computeRewards` today returns `{ messages, cheer }`. Extend it to also return `events` (a list of names) so sound does not have to parse message text:

`events` values: `goal`, `streak-start`, `freeze`, `streak-milestone`, `level-up`, `section`, `topic`.

A new pure function `pickRewardSound(events)` returns ONE sound name (or null), highest first:

1. `topic`
2. `level-up`
3. `streak-milestone`
4. `freeze`
5. `goal`
6. `section`
7. `streak-start`

Examples: goal reached + section finished gives `goal`. Topic finished + level up + goal gives `topic`. Nothing special gives null (only the `solve` pop plays).

Keep the toasts exactly as they are (all messages still show). If the owner picks D2 alternative (queue two), play the top two sequentially, the second starting when the first ends, and cap the total at 2.2 s.

---

## 6. The sounds (starting recipes, tune by ear)

All sounds are built from: oscillators (`sine`, `triangle`), optional short filtered noise bursts, a gain envelope (fast attack, exponential decay), and optionally a very light feedback delay for sparkle. Notes are given as note name and frequency. Gains are before the master volume (section 7). Treat every number as a **starting point**; the Sound Lab exists to change them.

Design language: good things go UP in pitch in major intervals (C-E-G-C), bad things go DOWN and are soft and low (never a harsh buzzer), neutral ticks are tiny and dry.

| Name | Length | Recipe |
|------|--------|--------|
| `tap` | 25 ms | triangle glide 1200 to 800 Hz, gain 0.10, 2 ms attack, exp decay. A dry "tick". |
| `select` | 45 ms | sine 880 Hz (A5), gain 0.14, 3 ms attack, exp decay. For the segmented controls the pitch may follow the choice: goal 1 = A5, 2 = B5 (987.8 Hz), 3 = C#6 (1108.7 Hz). |
| `solve` | 300 ms | Pop: 15 ms noise burst through a bandpass at 2 kHz, gain 0.10. Then two notes: C5 (523.25) at 0 ms and G5 (783.99) at 70 ms, each triangle plus a quiet sine one octave up (40 percent mix), 160 ms exponential decay, gain 0.22. The signature sound; it plays hundreds of times, so keep it pleasant and not too loud. |
| `goal` | 600 ms | Rising arpeggio C5, E5 (659.25), G5, C6 (1046.5), 60 ms apart, triangle + sine octave. The last note holds 450 ms with a light delay sparkle (120 ms delay, 0.25 feedback). Gain 0.22. |
| `streak-start` | 450 ms | Warm "ignite": noise whoosh through a bandpass sweeping 300 to 1800 Hz over 350 ms (gain 0.12), then a spark note A5 (880) triangle at 280 ms, 150 ms decay. |
| `freeze` | 900 ms | Icy bell: sine carrier 1568 Hz (G6) frequency-modulated by a sine at 3.5 times the carrier with a modulation depth that decays over 400 ms, 900 ms exp decay, gain 0.18, plus a soft second bell E6 (1318.5) 120 ms later. |
| `streak-milestone` | 750 ms | Five rising notes G4 (392), B4 (493.9), D5 (587.3), G5 (784), B5 (987.8), 70 ms apart, triangle + sine octave, last note 400 ms, light delay sparkle. Feels like `goal` but bigger and warmer. |
| `level-up` | 1200 ms | Climbing C5, E5, G5, C6, E6 (1318.5), 90 ms apart, the last note held 700 ms. Triangle + sine octave + a very quiet square one octave down for body (gain 0.05). Light delay sparkle. The "big win" sound. |
| `section` | 380 ms | Three quick notes E5, G5, C6, 80 ms apart, triangle, short decay. A small cheerful "checkpoint". |
| `topic` | 1500 ms | Fanfare: C5, C5, C5 (60 ms apart, short), then E5 held 200 ms, then a sustained C major chord C5 + E5 + G5 + C6 for 700 ms. Triangle + sine octave, light delay. The biggest sound in the app, so it is rare and special. |
| `undo` | 160 ms | Sine glide G5 (784) down to C5 (523) over 150 ms, gain 0.10. Soft and gentle, not sad. |
| `error` | 260 ms | Two soft low triangle notes A3 (220) then E3 (164.8), 90 ms each, gain 0.12. A low "oh well", never a buzzer. |
| `success` | 300 ms | Two notes G5 then C6, 110 ms apart, triangle, gain 0.18. Smaller than `goal`. |
| `notify` | 320 ms | Sine A5 (880) 120 ms, then E6 (1318.5) 160 ms, gain 0.08. Very soft ping. |
| `sheet-open` | 140 ms | Filtered noise (bandpass) rising 200 to 900 Hz, gain 0.05. A soft "whoosh up". |
| `sheet-close` | 120 ms | Same noise falling 900 to 200 Hz, gain 0.04. |
| `continue` | 200 ms | Two notes E5 then A5 (880), 70 ms apart, triangle, gain 0.14. A quick "next". |

Limits the code must enforce (and tests must check): every sound lasts at most 1500 ms, every note is between 80 and 4000 Hz, every gain is at most 0.3 before master volume, every sound ends at silence (no click at the end: always ramp the gain to zero).

---

## 7. Architecture

Keep it small, in the project's existing style (plain JS, ES modules, pure logic separated from the browser parts so it can be tested in Node).

```
src/core/sound-defs.js      PURE DATA + pure helpers. The sounds from section 6 as plain objects,
                            the reward priority list, pickRewardSound(events), SOUND_NAMES,
                            the rate limit and voice limit numbers. No browser code.
src/ui/sound.js             The engine. createSoundEngine({ AudioContextClass, getState }) returns
                            { play(name, options), unlock(), setEnabled(bool), setVolume('low'|'medium'|'high') }.
                            Plays the definitions with Web Audio. One shared engine, exported as `sound`.
tools/sound-lab.html        A test page (served by `npm run preview`) with one button per sound and
                            sliders for the numbers, to tune by ear on the real phone. Not shipped in dist.
```

Engine rules:

* **Create the AudioContext lazily and only if sound is ON.** If the setting is Off, never create it.
* **Unlock:** Android Chrome only allows audio after a user gesture. Install ONE global `pointerdown` and `keydown` listener at startup (`once`, passive) that calls `unlock()`, which creates or resumes the context. Because solve sounds play after an `await`, the unlock must already have happened on an earlier tap (it always has: the person tapped something to get there).
* **Resume** the context on `visibilitychange` to visible (browsers suspend it in the background).
* **Master gain:** one `GainNode` to the destination. Volume: Low 0.35, Medium 0.6, High 0.9 (starting numbers).
* **Safety:** a `DynamicsCompressorNode` after the master gain so overlapping sounds never clip.
* **Failure is silent:** if Web Audio is missing or throws, `play` does nothing (log once with `console.error`). Sound must never break a solve.
* **Cleanup:** disconnect nodes with `onended`; no leaks after thousands of plays.
* **Reduced data:** no network at all.

### Settings and data (this touches the backup, so be careful)

* Two new settings fields: `soundOn` (boolean, default `true`) and `soundVolume` (`'low' | 'medium' | 'high'`, default `'medium'`). If D4 is accepted also `vibrationOn` (boolean, default `true`).
* `src/data/db.js` `defaultSettings()` gets the new fields. `loadAll` already merges defaults, so old data keeps working.
* `src/state/actions.js`: add `setSoundOn(bool)`, `setSoundVolume(level)` (and `setVibrationOn`), same pattern as `setTheme` (ignore invalid values, then `updateSettings`). Register them in the `actions` object in `src/main.js`.
* `src/main.js`: apply the settings to the engine at start and whenever they change (same pattern as the theme subscription).
* **Backup (`src/core/backup.js`): the new fields are OPTIONAL in the file.** Keep `version: 1`. `buildBackup` writes them. `validateBackup` accepts them missing, and when present checks the types (`soundOn` boolean, `soundVolume` one of the three words, `vibrationOn` boolean) and reports readable errors. `backupToState` fills defaults when missing, so a Phase 8 backup file still imports. Add tests for: old file without the fields passes and restores defaults, bad types fail with readable messages, the round trip keeps the values.
* Settings screen (`src/features/settings/index.js`): a new "Sound" card with segmented controls Sound effects On/Off and Volume Low/Medium/High (volume control hidden or disabled when Off), plus a "Play test sound" button that plays `goal`. The vibration switch goes in the same card.

### Wiring (small edits, one line each where possible)

* `computeRewards` returns `events` too (keep `messages` and `cheer` exactly as they are so existing tests stay green; add tests for `events`).
* Home `onSolved` and Path solve handler: after the save succeeds, call `sound.play('solve')`, then `sound.play(pickRewardSound(rewards.events), { delay: 0.15 })` when not null.
* Undo (Home toast action) and Path `confirmUncheck`: `sound.play('undo')`.
* Failure toasts ("Could not save..."): add `variant: 'error'` support to `showToast` (CSS class `toast--error`, same look as default) and a new optional `sound` field: `showToast({ message, variant: 'error', sound: 'error' })`. Settings success toasts pass `sound: 'success'`. The toast code plays the named sound when the toast appears.
* `src/ui/nav.js`: `pointerdown` on an item plays `tap`.
* `src/ui/sheet.js`: `sheet-open` when it opens, `sheet-close` when it closes.
* Path `onContinue`: `continue`. Settings controls: `select`. Update banner shown: `notify`.
* Vibration: put the `navigator.vibrate` calls behind one helper `buzz(pattern)` in `src/ui/sound.js` that respects `vibrationOn`. Patterns: solve `20`, goal `[20, 40, 20]`, level-up and topic `[30, 50, 30, 50, 60]`.
* Tests use the existing pretend page (`tests/helpers/fake-dom.js`). Add a tiny fake `AudioContext` helper in `tests/helpers/` that records created nodes and scheduled times.

---

## 8. Sound Lab (tuning by ear)

Because sound quality is subjective and the numbers in section 6 are only a start, build `tools/sound-lab.html`:

* One button per sound name, a volume slider, and the key numbers (frequencies, durations, gains, delay) as editable fields that rebuild the definition live.
* A "Copy definition" button that prints the sound as JSON to paste into `src/core/sound-defs.js`.
* Served by `npm run preview` (add a small route or serve the `tools/` folder), opened on the real phone through the same USB port forwarding used for the PWA test, so the owner hears the real speaker.
* It imports the same engine, so what is tuned is exactly what ships.

Expect two or three tuning rounds. `solve` is the one that matters most: it plays on every solve for months.

---

## 9. Tests (all in Node, no browser)

* **Definitions:** every name in section 3 exists; length at most 1500 ms; notes 80 to 4000 Hz; gains at most 0.3; every sound ends with a ramp to zero; `pickRewardSound` priority order and the null case; no unknown names in the priority list.
* **Engine (fake AudioContext):** Off means no context is created; `unlock` creates and resumes it; `play` schedules the right number of oscillators at the right times; rate limit drops a too-fast repeat; voice limit drops the extra; hidden page plays nothing; unknown name does not throw; a throwing AudioContext does not throw out of `play`; `setVolume` changes the master gain; resume happens on visibility change; nodes are disconnected after `onended`.
* **Rewards:** `events` for each reward case (goal, streak start, freeze, milestone, level, section, topic), existing message tests unchanged.
* **Actions:** `setSoundOn`, `setSoundVolume`, `setVibrationOn` save and ignore invalid values.
* **Backup:** the optional fields (see section 7).
* **Settings DOM:** the Sound card, switching Off hides or disables volume, the test button plays `goal`, `select` plays on control taps.
* **Wiring DOM:** Home and Path solve play `solve` then the top reward after the delay; a failed save plays `error` and no `solve`; undo plays `undo`; nav `pointerdown` plays `tap`; sheet open and close play their sounds. Use a spy engine passed in through the existing `ctx` object so no real audio is needed.

`npm test` must stay green with the existing 326 tests plus the new ones.

---

## 10. Manual test on the phone (Android, Chrome and the installed app)

1. Fresh install, open the app, do nothing: **silence** (no sound on start).
2. Tap a bottom nav item: tiny tick. Tap quickly five times: no machine-gun noise.
3. Tap "Solved" on Home: pop and chime, XP float, vibration. First solve ever also plays `streak-start` after the pop.
4. Hit the daily goal: `goal` after the pop. Check a level up, a finished section, a finished topic (use a test backup file close to the edge, or temporarily lower the numbers in a dev build).
5. Tap Undo: soft descending blip.
6. Turn the phone's media volume to 0: silence, no errors. Turn it up: sounds back.
7. Settings: turn Sound Off, solve a problem: silence and no sound-related errors. Turn it On: the confirmation tick plays. Change Volume and use "Play test sound".
8. Put the app in the background, then come back: the next tap still plays sound (resume works).
9. Export, clear site data, import: the sound settings come back. Then import an OLD Phase 8 backup file: it imports, sound is On and Medium.
10. Airplane mode: everything still works (nothing is downloaded for sound).
11. Headphones: check nothing is too loud or too sharp.
12. Rebuild with a changed file: the update banner appears with its soft ping.

Note for iPhone (the owner uses Android): Web Audio on iOS follows the silent switch and needs the same first-tap unlock. Not a goal now.

---

## 11. Work plan (split so each chat stays small)

* **Phase 10a: engine, definitions, Sound Lab.** `src/core/sound-defs.js`, `src/ui/sound.js`, `tools/sound-lab.html`, fake AudioContext helper, their tests. No changes to screens or settings. Done when the owner can press every sound in the Sound Lab on the phone and `npm test` is green. Owner tunes the sounds and sends back the final numbers (or says "good").
* **Phase 10b: settings, backup fields, wiring, vibration.** Everything in section 7 from "Settings and data" and "Wiring", with tests. Done when the section 10 manual test passes and `npm test` is green.

Each phase ends with the handoff note appended to `HANDOFF.md` (Brief H format), and the zip `dsa-streak-phase10a.zip` / `dsa-streak-phase10b.zip`.

---

## 12. Risks and how to handle them

* **Annoyance after a week.** The biggest risk. Mitigations: quiet default, short sounds, the switch, volume levels, rate limits, no ambient sounds. The `solve` sound is the one to get right; keep it understated.
* **Autoplay blocking.** Solved by the global first-gesture unlock. If a sound is silent after a long background period, `resume()` on visibility fixes it.
* **Clipping when sounds overlap.** Compressor plus master gain plus the voice limit.
* **Backup compatibility.** New settings fields must be optional in the file so old backups still import (tested).
* **Synthesized sounds may sound "cheap".** That is what the Sound Lab is for; if the owner is unhappy, switch D1 to recorded files without changing the rest (the engine would load files from `src/pwa/sounds/`, which the PWA build precaches automatically).
* **Silent phones.** Nothing to do: the system volume decides. Sound is optional by design.
