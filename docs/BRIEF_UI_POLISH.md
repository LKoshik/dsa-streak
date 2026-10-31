# DSA Streak: UI Polish Brief (UI Phases 1 to 8)

Save this file as `docs/BRIEF_UI_POLISH.md` in the project. Save the Duolingo research file next to it as
`docs/Duolingo-Visual-Style-Reference.md`.

This brief overrides `docs/BRIEF_V2_AMENDMENTS.md` wherever the two disagree about LOOK (for example "no confetti",
"CSS only", emoji icons). It does NOT override the app logic, the data format, or the rules in section 3.

---

## WORK MODE (read this first; it overrides anything below that conflicts)

The owner is on a free plan, so every token counts.

- Do not ask questions. Make every small decision yourself and pick the simplest sensible option. Stop to ask only if continuing would change app behaviour, stored data or the backup file.
- Do not explain, plan out loud or summarise in chat. No preamble. Work, then deliver.
- Read only what the phase needs: README, the last HANDOFF section, this brief, and the files you will change. Do not re-read or re-print whole files. Edit files instead of rewriting them.
- Run tests and build once when the phase is finished, and again only if something failed. Skip screenshots; the owner checks on his phone. Never claim something "looks right"; write "not visually checked" under Known.
- Deliver: `dsa-streak-ui-N.zip` (no node_modules, no dist) and a handoff appended to HANDOFF.md.
- The handoff is short, about 15 lines at most, headed `HANDOFF UI Phase N`: Done (1 to 3 lines), Files, Contract changes (or "none"), Known (anything unchecked or wrong, including any test or build failure), Phone check (3 to 5 short bullets), Next phase. This replaces the 8-point format in section 4.
- The final chat message is 3 lines at most: phase done, tests passed or not, and where the zip is.
- Everything else in this brief (the rules and the phases) still applies in full. If a rule cannot be met, say so under Known; do not stop to ask.


## 0. How to use this brief (for the owner)

1. Open a new chat. Upload the latest project zip (without `node_modules/` and `dist/`) and, if they are not
   already inside `docs/`, this brief and the Duolingo reference file.
2. Paste this, and change the phase number:

   > Read docs/BRIEF_UI_POLISH.md, README.md, the last two sections of HANDOFF.md, docs/BRIEF_V2_AMENDMENTS.md and
   > docs/Duolingo-Visual-Style-Reference.md. Then do UI Phase N only, and nothing from other phases. Follow section 3
   > (rules) and section 4 (handoff). Give me the final zip and append the handoff note to HANDOFF.md.

3. After each phase: run `npm test` and `npm run build`, push to `main`, open the live app on the phone, go through
   that phase's "Phone check", and report anything wrong in the next message. Only then start the next phase.

Phases are in a good order on purpose: later phases use what earlier phases build. If a phase is skipped, say so at the
start of the next chat.

---

## 1. Where the app is today (so nobody has to guess)

- DSA Streak: a personal, offline PWA that tracks one problem a day from Striver's A2Z sheet (405 problems, 18 topics,
  71 subsections). Vanilla JS, no framework. esbuild builds it. IndexedDB stores the data. A service worker makes it
  work offline. Deployed to GitHub Pages by GitHub Actions on every push to `main`.
- The functioning is finished and working on the owner's phone. This work is ONLY about how it looks and feels.
- Layers: `core/` (pure logic, no browser), `data/db.js` (the only IndexedDB file), `state/` (store, actions,
  selectors), `ui/` (small building blocks), `features/` (home, path, stats, settings), `styles/main.css` (all styles,
  light and dark), `pwa/` (manifest, service worker, icons).
- Feature contract: `{ id, label, icon, mount(root, ctx) }` returning an unmount function.
- Current look: Duolingo-style colours (green `#58cc02`, blue `#1cb0f6`, orange `#ff9600`, red `#ff4b4b`), chunky
  buttons with a darker bottom edge, dark mode first (`#131f24`), system font stack with `ui-rounded` (which only
  works on Apple devices, so on the owner's Android phone it falls back to a plain system font).
- Current weak points this brief fixes: emoji used as icons (nav, chips, stats, toasts, trophy); flat text symbols
  (✓ ★ ☆) on path nodes; all 18 topic banners are the same green; Ember (the flame mascot) only lives on Home; the
  streak flame is the 🔥 emoji; rewards are plain text toasts; font sizes and spacing are typed by hand, so only
  colours and one radius are tokens; the resource chips exist only on Home.
- Emoji and symbols appear in: `src/features/home/index.js`, `src/features/home/rewards.js`,
  `src/features/path/index.js`, `src/features/stats/index.js`, the `icon` field of each feature, and in the tests
  `tests/home-dom.test.js`, `tests/path-dom.test.js`, `tests/rewards.test.js`. Phases that change them must update
  those tests.

---

## 2. Decisions already made by the owner (final, do not re-ask)

1. Using Duolingo's overall look (colours, chunky buttons, winding path, rewards) is fine. This is a private,
   offline, motivation app. The goal is a polished, professional, compelling look that makes him want to open it
   every day.
2. The app's identity is **Ember** (the flame mascot), not Duo. Everything new should feel like it belongs to Ember.
3. **No "locked" look.** Every node can be opened, so upcoming nodes must look "not started yet" (quiet but clearly
   tappable), never disabled.
4. **Font: Nunito**, bundled with the app (not loaded from the internet).
5. **The flame is no longer an emoji.** It becomes the app's own cool, minimalist, original fire that EVOLVES with
   the streak (new colour, bigger, cooler at milestones such as every 4 or 7 days), so keeping the streak feels
   worth it.
6. Work is split into phases, and each phase improves one thing.
7. Nothing may be copied from Duolingo as an asset: no owl, no copied icons, no copied sounds. The LOOK (palette,
   chunky edges, path rhythm, reward hierarchy) may be followed. All art is drawn fresh as inline SVG.

---

## 3. Rules for every phase

**Scope**
- Do only the phase you were asked to do. If you notice something for another phase, write it in the handoff
  under "Known", do not fix it.
- App logic does not change. `core/`, `data/`, backup format and database shape stay as they are. The only allowed
  logic additions are named inside a phase below (for example `core/flame.js` in UI Phase 3).
- If a phase needs a contract change (a function result gets a new field, a feature field changes meaning), keep it
  as small as possible, list it under "CONTRACT CHANGES" in the handoff, and update every test that touches it.
- Small decisions are made by you. Ask the owner a question only if you are truly blocked.

**Quality**
- `npm test` passes (all tests, including new ones for any logic). `npm run build` passes.
- New logic goes in pure files under `core/` with tests. Screens and components get DOM tests in the existing style
  (`tests/helpers/fake-dom.js`).
- Dark mode must look great (main mode). Light mode must also be correct. Check both.
- Accessibility floor: text contrast at least 4.5:1 on every background colour (check each banner colour
  separately); state is never shown by colour alone; every icon-only control has an accessible name; touch targets
  at least 44px; visible keyboard focus; `prefers-reduced-motion` turns animation off and the state still reads
  clearly without it.
- The Solved button must stay one tap away without scrolling on a 360×640 screen. Check 320×568 too and say what
  happens there.
- Toasts must never cover the Solved button (this was a real bug before; keep the current toast anchoring and its
  tests).

**Offline and build**
- No network at runtime. Fonts, icons and art are bundled. Every URL stays relative (the app lives under a GitHub
  Pages sub-path).
- Every new file in `dist/` must appear in the service-worker precache automatically (it is built from the files in
  `dist/`). Check this and keep `tests/pwa-build.test.js` and `tests/sw.test.js` passing.
- Never edit or remove the three `// @build:` lines in `src/pwa/sw.js`.
- Do not add runtime libraries. A dev dependency is fine only if it is truly needed (say why).

**Performance (the target is a normal mid-range Android phone in Chrome)**
- Animate only `transform` and `opacity`. No big or repeated `blur()` filters. Prefer simple SVG shapes over heavy
  filters. Do not run more than one or two infinite animations on screen at once (for example: current-node glow
  plus one flame flicker, and nothing else).
- Motion has a purpose: feedback, orientation, emphasis, expression or reward. Small actions get small motion,
  milestones get bigger motion. Use the motion tokens from UI Phase 1.

**Checking your own work**
- If the sandbox has a headless browser, take screenshots at 360×740 and 320×568, light and dark, for the screens
  you changed, and look at them. If there is no browser, say so plainly in the handoff. Never claim something "looks
  right" if it was not seen.

---

## 4. Handoff format (append to HANDOFF.md at the end of every phase)

Use the same 8 points as the earlier phases, with the heading `HANDOFF UI Phase N`:

1. Done
2. Files (new, changed, removed)
3. Public (new functions, components, tokens, with their signatures)
4. Commands (test, build, and how to look at it: `npm run dev`, any preview page)
5. Defaults (the small decisions you made, in plain words)
6. CONTRACT CHANGES (or "none")
7. Known (what you could not check, what the owner should look at on the phone, ideas for later phases)
8. Next phase

Also give the final zip, named `dsa-streak-ui-N.zip`, with the same folder layout as the uploaded zip but WITHOUT
`node_modules/` and `dist/`.

---

## 5. The phases

### UI Phase 1: Foundation (font and design tokens)

**Goal:** the app gets the right voice and a real design system, with almost no visible change except the font.
Everything after this is built on it.

**Do**
1. Bundle **Nunito** (SIL Open Font License; take it from Google Fonts or the `@fontsource/nunito` package; keep the
   licence text in the repo). Use a variable woff2, Latin subset, weights 400 to 900 (the app uses 400, 700, 800).
   Aim for a small total size (under about 100 KB). If the sandbox has no network, say so and tell the owner exactly
   which file to drop where.
2. `@font-face` with `font-display: swap`. Make esbuild put the font in `dist/` with a RELATIVE url, and make sure it
   is precached for offline. New font stack: Nunito first, then `system-ui`, `Segoe UI`, `Roboto`, `sans-serif`.
   Remove `ui-rounded` as the lead font.
3. Add tokens in `:root` (and keep both dark blocks in sync):
   - **Type scale:** consolidate the sizes now typed by hand (10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28) into a
     scale of at most 8 steps, with matching line-heights and weights for: display, title, heading, body, small,
     micro.
   - **Spacing scale:** 4, 8, 12, 16, 24, 32 (and names for them).
   - **Radius scale:** small, medium, large, pill.
   - **Elevation:** the "lip" depth for chunky objects (small 3px, normal 4px, large 6px) and a card surface rule.
   - **Motion:** durations and easings. Starting values (tune on a real phone): press 100ms, micro-feedback 200ms,
     ui-transition 250ms, reward-reveal 500ms, character-reaction 700ms, milestone-celebration 1100ms.
   - **Colour roles:** keep the current palette, add roles (success, info, danger, reward/gold, streak) so that
     colour meaning stays the same on every screen. Add a small set of banner/section hues now (green, purple,
     teal, blue, pink, orange) each with a darker edge colour, for UI Phase 4. Check text contrast on each.
4. Move the existing CSS onto the tokens, screen by screen, without changing how anything looks (except the font
   and the sizes that merge into the scale). Remove duplicated or dead rules you find.
5. Add `tools/tokens-preview.html` (a page that shows the font, the type scale, spacing, colours and motion) in the
   same spirit as `tools/sound-preview.html`.

**Do not:** change any screen layout, icon, or behaviour.

**Tests:** build and precache tests still pass; add a test that the built `dist/` contains the font and that the
precache list includes it.

**Phone check:** the app now uses Nunito on Android (letters look rounder); nothing moved; offline still works (open
in airplane mode); dark and light both fine.

---

### UI Phase 2: Icon system (replace emoji with our own SVG icons)

**Goal:** no emoji used as icons anywhere in the UI.

**Do**
1. Add `src/ui/icons.js` with `createIcon(name, { size, title })` returning an inline SVG. One consistent style: 2px
   rounded strokes or soft filled shapes, same corner feel as the chunky buttons, `currentColor` where sensible,
   `aria-hidden` unless a `title` is given.
2. Icons needed: home, path, stats (bars), settings (gear), snowflake (freeze), xp (star or bolt), goal (target),
   trophy, check, star, backup, plus a simple static **flame** (a single clean shape for now; UI Phase 3 replaces it
   with the evolving flame).
3. Replace emoji and text symbols in: bottom nav, the Home chips (streak, freezes, XP), the Home 7-day strip
   (✓ and ❄), Stats tiles and bars, the backup banner, the topic banner trophy, the path end trophy, and node symbols
   (✓ ★ ☆) where an icon fits better.
4. Reward and toast messages: change `computeRewards` messages from strings with an emoji to
   `{ icon: 'name', text: '...' }`. `showToast` shows the icon next to the text. Keep the wording of the texts.
5. Features: the `icon` field becomes an icon NAME (for example `'home'`), and `createNav` renders it with
   `createIcon`. Nav active state: a rounded tinted background behind the active icon plus the colour change, so the
   current tab is unmistakable. Inactive icons stay muted but clearly visible.
6. Add `tools/icons-preview.html` that lists every icon at 16, 24 and 32px.

**Do not:** build the evolving flame yet (only the static one).

**Tests:** update `tests/home-dom.test.js`, `tests/path-dom.test.js`, `tests/rewards.test.js` and the nav-related
tests to the new shapes. Add tests for `createIcon` (unknown name behaviour, `title` gives an accessible name,
otherwise `aria-hidden`).

**Phone check:** nav, chips, week strip, stats and toasts all show crisp icons on Android; no emoji left; active tab is
clear in both themes.

---

### UI Phase 3: The evolving flame (the streak's fire)

**Goal:** a cool, minimalist, original fire that grows and changes with the current streak, and makes the owner
want to protect it.

**Design rules**
- Minimalist: at most three shapes (outer flame, inner flame, hot core) plus a few tiny sparks at higher tiers.
  Clean curves, flat colours or one soft gradient, readable at 20px (chip) and 96px (hero).
- It must be original (not a copy of any app's flame) and must match Ember's world.
- One component, many sizes: `createFlame({ tier, size, state })`.

**Do**
1. New pure file `src/core/flame.js` with `flameTier(streak)` and one **table** of tiers with their thresholds so the
   owner can change them in one place. Starting table (adjust the looks, keep the idea that each step is clearly
   better than the one before):

   | Tier | Streak | Look |
   |---|---|---|
   | 0 | 0 | Cold ember: a small dim coal with a faint orange glow (not shaming, just quiet) |
   | 1 | 1 to 3 | Small orange flame |
   | 2 | 4 to 6 | Taller flame, orange with a yellow inner flame |
   | 3 | 7 to 13 | Bigger, gold-yellow core, a second tongue, soft glow (matches the first freeze) |
   | 4 | 14 to 29 | Hot: white-yellow core, orange-red outer, two or three rising sparks |
   | 5 | 30 to 59 | Blue-white core inside the orange, more sparks |
   | 6 | 60 to 99 | A blue flame with a purple edge |
   | 7 | 100+ | A "legend" flame, unmistakable (for example gold and blue), still minimalist |

   Tests: tier at every boundary (0, 1, 3, 4, 6, 7, 13, 14, 29, 30, 59, 60, 99, 100), a huge number, and bad input
   (negative, NaN, undefined) falling back to tier 0.
2. `src/ui/flame.js` with `createFlame({ tier, size, state })`. States:
   - **lit** (solved today): full colour with a soft glow;
   - **at risk** (streak above 0 and today still open): same shape, dimmer, with one slow gentle pulse (reuse the
     existing pulse idea, reduced motion turns it off);
   - **cold** (tier 0).
3. Use the flame everywhere the old 🔥 or the static flame was: Home streak chip, Stats streak tile, "streak"
   messages, the 7-day streak milestone toast.
4. **Tier-up moment:** extend `computeRewards` with `flameUp: { from, to } | null`. When one Solved tap moves the
   streak across a tier threshold, show a short one-time moment (flame scales up with a small overshoot and settles,
   Ember cheers, one clear toast such as "Your flame grew"). It must not block the next tap. Use the existing
   milestone sound (a new recipe is optional; if you add one, only `sound-recipes.js` changes).
5. **Ember follows the flame (default decision):** Ember's body colours take the current tier's palette, so Ember
   visibly grows with the streak. Face and moods stay as they are.
6. Add `tools/flame-preview.html`: shows all 8 tiers, all 3 states, at chip size and hero size, on dark and light
   backgrounds, so the owner can judge the art on a laptop or phone before trusting it.

**Do not:** change the streak or freeze rules, or the Ember moods.

**Tests:** `flameTier` as above; `createFlame` output differs per tier and state and has an accessible label such as
"Flame, tier 3, 9-day streak"; `computeRewards` returns `flameUp` only when a threshold is crossed (and never on
Undo or on a non-streak-changing solve).

**Phone check:** open `tools/flame-preview.html` (or the app) and judge all tiers; solve a problem across a tier
boundary (use a test backup file if needed) and watch the tier-up moment; reduced motion on, the state still reads.

---

### UI Phase 4: Path nodes and topic banners

**Goal:** the Path feels like a journey made of tactile objects, not a list of flat circles.

**Do**
1. **Pebble nodes** as SVG (or CSS plus a small SVG): a saturated face, a simple lighter highlight shape, a darker
   bottom lip, and a clear centre icon (check for done, star or flame for the current one, count for in progress).
   Press state: the lip compresses (the existing `translateY` idea, using the elevation tokens). One base node with
   variants: done, in progress (progress ring kept), current (pulsing START or CONTINUE bubble kept), not started.
2. **Not started** (decision 3): a quiet, desaturated-but-tappable material, with its own look, not a faded copy of
   the active node and never a lock icon. It must still be clearly a button.
3. **Topic banner colours:** the 18 topics cycle through the banner hues from UI Phase 1 (each with its darker edge).
   Done topics keep the trophy badge. Text on each banner passes 4.5:1 contrast (check every hue, adjust text
   colour or hue if needed).
4. Keep the zig-zag, the sticky banners, the auto-scroll to the current node, and the bottom sheet exactly as they
   behave now.
5. Banner and node spacing use the spacing tokens; long subsection names wrap cleanly at 320px.

**Do not:** add characters, chests or coins yet (UI Phases 6 and 7). Do not add a jump-to-current button yet (UI
Phase 5).

**Tests:** extend `tests/path-dom.test.js` and `tests/path-model.test.js` for the new node variants, the banner colour
cycling (a pure function: topic number gives hue index), and accessible names that still say "done", "current",
"in progress", "not started".

**Phone check:** scroll the whole path; banners are readable in dark and light; tapping a node feels physical; the
current node is obvious; nothing overlaps at 320px.

---

### UI Phase 5: App chrome (top resource bar, bottom nav, jump to current)

**Goal:** the frame around every screen feels like one product.

**Do**
1. **Persistent top resource bar** in the app shell (above every screen): flame with streak count, freezes (x/2),
   XP with level. Compact. The daily-goal ring stays on Home (it is the hero's job), so the bar and the Home top row
   must not repeat each other. Move what is shared out of `home/index.js` and into one component.
2. **Bottom nav** final polish: sizes, spacing, the active tab outline/tint from UI Phase 2, safe-area padding.
3. **Jump to current** floating button on the Path: appears only when the current node is off screen, shows an arrow
   up or down, scrolls smoothly (instant with reduced motion), never covers a node's tap area or the sheet, and
   never interrupts a manual scroll.
4. The sticky topic banners and the top bar must not fight for the same space on the Path. Decide a clean
   arrangement (for example the bar scrolls away on the Path, or banners sit directly below it) and explain it in
   the handoff.

**Risk to check first:** vertical space. After this phase, Solved must still be one tap away without scrolling at
360×640, and you must report the 320×568 result honestly. If the persistent bar costs too much space, make it
shorter or let it hide on small heights, and say what you chose.

**Tests:** shared resource bar (values update after a solve and after Undo), nav active state, jump button
visible/hidden logic as a pure function (current node position and viewport give true or false), no regression in
the Home layout tests.

**Phone check:** the bar shows the right numbers on all four tabs; the jump button appears and disappears correctly;
Solved is still reachable without scrolling; the keyboard and system bars do not cover anything.

---

### UI Phase 6: Reward objects and the reward ladder

**Goal:** progress feels earned, with three clear levels of reward and original art for the moments that matter.

**Do**
1. Original SVG objects: **coin**, **chest** (closed and open), **trophy**, **star cluster**, **numbered badge**.
   Same style as the icons and flame.
2. **Three levels** (do not make every solve a big event):
   - *Micro* (every solve): the existing +10 XP pop and the ring fill, now with the check pop on the node or button.
   - *Session* (daily goal reached): a short, skippable reward moment (about one second) with Ember and a coin and
     XP count-up. It never blocks the next tap, and never appears on Undo.
   - *Milestone*: 7-day streak and freeze earned (a chest opens), level up, subsection finished (star cluster on its
     node), topic finished (trophy on its banner, bigger celebration).
3. On the Path, show a reward object at the end of each topic's nodes: a dim silhouette while the topic is not
   done, the trophy or open chest once it is. This shows progress and is NOT a locked or claimable item.
4. Replace text-only toasts for these events with the new objects plus short text. Keep the Undo toast and its
   position exactly as they are.
5. Sound: reuse the existing sound events. A new recipe is optional (for example a chest-open sound), and if added
   only `sound-recipes.js` and its tests change. Sound stays off when the Sound setting is off.
6. Add confetti-like sparkle only with CSS/SVG (no library), small, short, and off with reduced motion.

**Do not:** add currencies, shops, or anything that changes XP, streak or freeze rules.

**Tests:** a pure function that maps a solve (before and after state) to one reward level and one celebration type
(highest wins, same idea as `soundForSolve`); DOM tests for the session moment (shown once, skippable, not on Undo);
topic-end object states.

**Phone check:** a normal solve stays quick and light; reaching the goal feels good but short; finishing a
subsection or topic feels bigger; nothing ever delays the next tap.

---

### UI Phase 7: Ember comes alive

**Goal:** Ember is a character with presence across the app, not a picture on Home.

**Do**
1. **Idle life:** a rare, low-amplitude blink and a small breathing movement. Not constant, not loud.
2. **Reactions:** on solve a short happy reaction; on a milestone the bigger cheer already exists, now reused; when
   the streak is at risk Ember looks sleepy (already exists); after a missed day Ember is kind, never sad about
   the owner.
3. **On the Path:** a small Ember sits beside the current node (near the START or CONTINUE bubble) and at the start
   of each topic. Decoration must never cover a node or its tap area.
4. **On Stats and in empty or finished states:** Ember shows a fitting mood.
5. **Coordination rule:** at most one looping animation near the current node at a time (node glow, Ember idle,
   flame pulse take turns or are very quiet). Animations pause when the app is hidden and are off with reduced
   motion.

**Do not:** copy any other app's mascot poses; do not add speech or text bubbles beyond what exists.

**Tests:** Ember mood selection as a pure function (state in, mood out) for every home and path state; DOM tests that
the idle animation class is not applied under reduced motion.

**Phone check:** the app feels alive but calm; scrolling the Path stays smooth on the phone; nothing flickers.

---

### UI Phase 8: Stats, Settings and the cohesion pass

**Goal:** the last screens match the rest, and the whole app is checked as one product.

**Do**
1. **Stats:** tiles with the new icons and the evolving flame, better hierarchy for the big numbers, and calendar
   cells that show a small flame or snowflake mark where it helps (status must not rely on colour alone).
2. **Settings:** clearer cards and headings, consistent segmented controls, a calmer Backup area, sound and theme
   unchanged in behaviour.
3. **Cohesion pass (do this last):** go screen by screen and check
   - the same spacing, type and radius rules everywhere (tokens only, no stray numbers);
   - small uppercase labels only where they carry meaning (button text, banner label); sentence case elsewhere if
     the hierarchy looks flat;
   - the same name for the same action everywhere (for example "Export backup" button gives a "Backup saved" toast);
   - empty, error and finished states read clearly and kindly;
   - widths 320, 360 and 412px; light and dark; system font size at 130% and 200%; reduced motion on;
   - contrast on every colour combination.
4. Remove CSS and code that is no longer used. Update the README folder map and the "Look and feel" notes so the
   next person knows the tokens, the icon set, the flame tiers and where to change them.

**Tests:** the full suite stays green; add DOM tests for any new Stats and Settings structure.

**Phone check:** walk through the whole app like a new user on a fresh install, then like someone on a 40-day streak;
export a backup and restore it; open offline.

---
