HANDOFF Phase 1
1. Done: Skeleton, build tooling (esbuild), problem catalog + tests. Data checked against Brief C: all matches (405 / 18 / 71 / Basic 35, Core 254, Pro 108, 8 blanks / CSV = JSON).
2. Files: package.json, .gitignore, tools/build.js, tools/build-problems.js, tools/source/{json,csv}, src/index.html, src/main.js, src/styles/main.css, src/core/{problems.data.js (generated), catalog.js}, tests/catalog.test.js, docs/BRIEF_V2_AMENDMENTS.md, empty folders (src/data, state, ui, features, pwa).
3. Public: buildTopics(problems) -> [{name, ids, subsections:[{name, ids}]}]; TOPICS; getProblem(id); PROBLEMS records { id, topic, subsection, noInSubsection, title, difficulty|null }; flattenProblems(json), renderModule(problems) in tools/build-problems.js.
4. Commands: npm install; npm test (12 pass); npm run build (dist/ with index.html, app.js, app.css); npm run dev (http://localhost:8080 shows "DSA Streak").
5. Defaults: esbuild ^0.25.0; npm test uses glob "tests/*.test.js"; build/dev regenerate problems.data.js first; placeholder CSS is dark; .gitkeep in empty folders.
6. CONTRACT CHANGES: none new. Amendment 4 (approved): selectHome must also return `week: [{ day, status, isToday }]` (7 items ending today, status null before firstDay) in Phase 4.
7. Known: no network here, so esbuild could not be installed. build.js and dev were NOT run; tests were. Path screen (Phase 6) uses subsection nodes per V2 amendment 1.
8. Next phase: 2

HANDOFF Phase 2
1. Done: src/core/dates.js and src/core/streak.js per Brief D1-D3, with tests for all 13 cases plus extras.
2. Files: src/core/dates.js, src/core/streak.js, tests/dates.test.js, tests/streak.test.js, HANDOFF.md.
3. Public: toDayString(date), addDays(day, n), isValidDay(str), eachDay(from, to), msUntilNextMidnight(date); replayStreak(solvedDays, today) -> { streak, longest, freezes, statusByDay, todayStatus, firstDay }.
4. Commands: npm test -> 45 pass, 0 fail.
5. Defaults: no solves -> todayStatus 'pending', firstDay null, statusByDay {}. addDays/eachDay/replayStreak throw RangeError on invalid day text. eachDay(from > to) returns []. statusByDay is a plain object. The DST test skips itself if the computer ignores TZ changes.
6. CONTRACT CHANGES: none.
7. Known: addDays does not support dates before year 0 (never needed). Phase 1 build/dev still need your confirmation they run (you said all passed).
8. Next phase: 3

HANDOFF Phase 3
1. Done: src/core/xp.js (goal, XP, levels) and src/core/next.js (next problem, topic progress) per Brief D4-D8, with tests using hand-made topics.
2. Files: src/core/xp.js, src/core/next.js, tests/xp.test.js, tests/next.test.js, HANDOFF.md.
3. Public: goalForDay(goalHistory, day); solvesPerDay(solves) -> { day: count }; computeXp(solves, goalHistory) -> { total, solveXp, bonusXp, bonusDays }; levelFromXp(xp) -> { level, xpIntoLevel, xpForNext, fraction }; dailyProgress(solves, goalHistory, today) -> { done, goal, met }; findNext(topics, solvedIds, currentTopic) -> { topic, problemId } | null; topicProgress(topics, solvedIds) -> [{ topic, solved, total, done }].
4. Commands: npm test -> 73 pass, 0 fail.
5. Defaults: ADDED (not in Brief F) withGoalChange(goalHistory, today, goal) -> new sorted history; replaces today's entry (Phase 4 setGoal should use it). solvesPerDay returns a plain object. bonusDays is a number. { topic } in findNext/topicProgress is the topic NAME. Bad or negative XP counts as 0.
6. CONTRACT CHANGES: none (one helper added, nothing renamed).
7. Known: none. Reminder for Phase 4: selectHome must return `week`; use effectiveToday if a solve is dated after today.
8. Next phase: 4

HANDOFF Phase 4
1. Done: IndexedDB layer, store, actions and selectors per Brief E/F + V2 amendment 4 (selectHome returns `week`). Browser check page added.
2. Files: src/data/db.js, src/state/{store,actions,selectors}.js, tests/{store,selectors,actions}.test.js, tools/db-check.html, tools/serve.js, package.json (script check:db), HANDOFF.md.
3. Public: db: openDb(), loadAll() -> { solves, settings }, putSolve(s), deleteSolve(id), saveSettings(s), replaceAll({solves, settings}), requestPersistence(), defaultSettings(), deleteDatabase() [danger, check page only]. store: createStore(initial) -> { get, set, subscribe }. actions: store (shared), init(), markSolved(id) -> solve|null, unmarkSolved(id) -> bool, setGoal(1|2|3), setTheme(t), setCurrentTopic(name|null), refreshToday(), exportBackup() and importBackup(text) [placeholders until Phase 8], useStorage(fake) [tests only]. selectors: selectHome(state) -> { streak, longest, freezes, todayStatus, daily, next: { problem, topic } | null, xp: { total, level, xpIntoLevel, xpForNext, fraction }, solvedCount, total, backupReminder, week: [{ day, status, isToday }] }; selectPath(state); selectStats(state) (shapes as Brief F).
4. Commands: npm test -> 110 pass. Browser: npm run check:db, open http://localhost:8081/tools/db-check.html, expect all PASS, press "Reload the page", expect 2 more PASS.
5. Defaults: markSolved/unmarkSolved return a value (solve or bool) so Home can compute rewards; markSolved also sets state.today. selectors use effectiveToday (max of today and latest solve). Backup reminder is computed by day in selectors (lastBackupAt converted to a local day); Phase 8 should reuse that rule. Week status is null for days before firstDay and for all days when there are no solves. selectPath isCurrent = topic of Next up.
6. CONTRACT CHANGES: none beyond approved `week`.
7. Known: db.js and db-check.html were NOT run in a browser here (no IndexedDB in Node); actions are tested with a fake storage. init() throws if IndexedDB is unavailable (Phase 5 should show an error).
8. Next phase: 5

HANDOFF Phase 5
1. Done: app shell (hash router, bottom nav, theme), Home screen with V2 amendments (states a-d, Ember mascot, 7-day strip, rewards), design tokens (light + dark), placeholders for Path/Stats/Settings (Settings has the Habit tip).
2. Files: src/index.html, src/main.js, src/router.js, src/styles/main.css, src/ui/{dom,ring,toast,nav,theme,ember}.js, src/features/index.js, src/features/home/{index,copy,rewards}.js, src/features/{path,stats,settings}/index.js, tests/{home-copy,rewards,home-dom}.test.js, tests/helpers/{fake-dom,fake-storage}.js, tests/actions.test.js (uses shared fake storage).
3. Public: h(tag, props, ...children); createRing({size, stroke, value, color, content}) -> element with setValue(f); showToast({message, actionLabel, onAction, duration, variant}) -> close fn; createNav(features) -> { el, setActive(id) }; applyTheme(theme); createEmber({mood: 'sleepy'|'happy'|'cheering', size, lit}); startRouter({root, features, ctx, nav}); homeCopy(home), weekdayLetter(day), computeRewards({before, after, problem, solvedIds}) -> { messages, cheer }. Feature contract unchanged: { id, label, icon, mount(root, ctx) } returning unmount.
4. Commands: npm test -> 144 pass. npm run build, then npm run dev -> http://localhost:8080 on a phone-size window: tap Solved, see ring fill, +10 XP float, toasts, Undo; reload keeps data; switch theme by phone dark mode.
5. Defaults: app always starts at #/home (router replaces the hash). Layout: Next up card with Solved is pinned at the bottom, always visible; top part scrolls on tiny screens. Home draws on the next animation frame. Extra message "Streak started" on the first solve. If the 7-day milestone hits with both freezes full: "N-day streak" message instead of "Freeze earned". Streak 0 Ember is happy (sleepy only when a streak is at risk). Goal ring chip, freezes shown as "x/2". vibrate(20) only if available. Reduced-motion turns all animation off.
6. CONTRACT CHANGES: none.
7. Known: UI was tested against a pretend page (fake DOM) in Node, NOT in a real browser, and build/dev were not run here (no esbuild). Look, animation and spacing need your eyes on a phone. Path/Stats/Settings are placeholders. Phase 6 notes: Path uses subsection nodes per V2 amendment 1 and should add view--fill/scroll handling itself (router resets root class to 'view').
8. Next phase: 6

HANDOFF Phase 6
1. Done: Path screen per V2 amendment 1: 18 sticky green topic banners ("TOPIC 3 · Binary Search · 12 of 32"), the 71 subsections as zig-zag nodes (done / in progress / current with pulsing START bubble / upcoming), a bottom sheet with the subsection's problems as checkboxes plus "Continue here", auto-scroll to the current node, reward messages for finishing a subsection or topic. No links anywhere.
2. Files: src/features/path/index.js (replaced the placeholder), src/features/path/model.js, src/ui/sheet.js, src/styles/main.css (appended: path + sheet), tests/{path-model,path-dom,sheet}.test.js, tests/helpers/fake-dom.js (added document key listeners, focus, activeElement, fire(), pressKey()), HANDOFF.md.
3. Public: sheet: openSheet({ label, title, subtitle, progress, body, footer, onClose }) -> { el, update(parts), close(), isOpen() }. model: zigzagOffset(index, amplitude), nodeState({ solved, total, isCurrent }), buildPathModel(selectPath(state)) -> { topics, nodes: Map, currentKey }, bannerText(topic), centeredScrollTop({ nodeTop, nodeHeight, viewHeight, scrollTop }). Feature contract unchanged.
4. Commands: npm test -> 188 pass, 0 fail. npm install, npm run build -> OK (dist/app.js 83 kb, esbuild did run here this time). npm run dev, open #/path on a phone-size window.
5. Defaults: current node = first unfinished subsection of the Next up topic. Bubble says START, or CONTINUE once some of that subsection is solved. In-progress and partly solved current nodes get an orange ring with "x/y". Continue here is topic-level (sets currentTopic, as the Brief says), so Next up becomes the first unsolved problem of that topic, which can sit in an earlier subsection. If the tapped node's topic is already current, the button is replaced by a note showing the Next up problem. Checking a problem in the sheet counts like Home's Solved (same XP, streak, goal, level and Section/Topic finished messages through computeRewards, small +10 XP pop in the row, vibrate(20)). No Undo toast on Path: unchecking asks "Uncheck #N title?" inside the sheet (Keep it / Uncheck) and then calls unmarkSolved. Done topics keep the green banner and get a 🏆 badge; a 🏆 marker ends the path. Toasts move to the top of the screen while a sheet is open. Sheet closes with X, dark background, Escape or swipe down. The screen adds view--fill and view--path itself and scrolls its own .path box; it keeps its scroll position when it redraws and only auto-scrolls on first open and after Continue here.
6. CONTRACT CHANGES: none (selectPath unchanged; nothing added to selectors or actions).
7. Known: the UI was tested against the pretend page in Node, NOT in a real browser. Please check on a phone: banner stickiness, zig-zag spacing on a 320px screen, START bubble position, sheet slide and swipe, toasts at the top while the sheet is open, light and dark mode. I could not read the Brief link here, so I worked from the code, HANDOFF and V2 amendments only.
8. Next phase: 7

HANDOFF Phase 7
1. Done: Stats screen. Tiles for current streak, longest streak and freezes (x/2); "Solved X of 405" with a green progress bar; XP total, level and a yellow bar to the next level ("N XP to Level L+1"); days practiced; a month calendar with previous/next buttons and a legend. Calendar colors: solved green, frozen light blue, missed light red, today outlined in orange, everything else plain (future days are dimmed). Built on selectStats, no new selector fields.
2. Files: src/core/calendar.js, src/features/stats/index.js (replaced the placeholder), src/features/stats/model.js, src/styles/main.css (appended: stats), tests/{calendar,stats-model,stats-dom}.test.js, HANDOFF.md.
3. Public: calendar: buildMonthGrid(year, month, statusByDay, today) -> weeks (list of 7-cell lists, Monday first); a cell is null for padding, else { day, date, status: 'solved'|'frozen'|'missed'|'pending'|null, isToday }. Also daysInMonth(year, month), shiftMonth(year, month, delta) -> { year, month }, compareMonths(a, b), monthTitle(year, month), monthOfDay(day), MONTH_NAMES. Months are 1 to 12. model: statsToday(stateToday, statusByDay), percent(fraction), monthLimits(firstDay, today) -> { first, last }, clampMonth(month, limits). Feature contract unchanged.
4. Commands: npm install; npm test -> 222 pass, 0 fail; npm run build -> OK (dist/app.js 88 kb, esbuild ran here); npm run dev, open #/stats on a phone-size window.
5. Defaults: I could not read the Brief link here, so the buildMonthGrid signature and cell shape above are my own choice from the HANDOFF notes; if Brief F says otherwise, only calendar.js and the one buildMonthGrid call in stats/index.js need to change. The calendar opens on the month of today. Back stops at the month of the first solve (this month when there are no solves), forward stops at this month; a button at its limit is disabled. The month you are viewing is kept when the screen redraws after a solve. "Today" is worked out as the later of state.today and the newest day in statusByDay, the same rule as the selectors, so a solve dated after today moves it. Today's cell is outlined in orange even when solved (then it is green too). Pending today is plain with the outline. Cells carry an aria-label like "2026-06-08: frozen". Days practiced says "1 day" or "N days". Freezes show as "x/2" like Home.
6. CONTRACT CHANGES: none (selectStats unchanged, nothing added to selectors or actions).
7. Known: the UI was tested against the pretend page in Node, NOT in a real browser. Please check on a phone: tile fit at 320px width, calendar cell size and the light blue / light red tints in light and dark mode, the orange today outline, and the bar animation. Calendar cells show only the date number (color carries the status, plus the legend and aria-labels); say so if you want a small ✓ / ❄ glyph in cells like the Home strip.
8. Next phase: 8

HANDOFF Phase 8
1. Done: Backup and Settings. src/core/backup.js (build, validate, parse, restore, reminder rule) with tests; exportBackup and importBackup finished in actions.js; Settings screen with goal 1/2/3 and theme System/Light/Dark segmented controls, Export, Import (file picker, error list, or "This replaces all data on this phone, continue?"), last backup date, Habit tip.
2. Files: src/core/backup.js, src/state/actions.js, src/state/selectors.js (reminder rule moved out), src/features/settings/{index,model}.js, src/ui/download.js, src/styles/main.css (appended: settings), tests/{backup,settings-model,settings-dom}.test.js, tests/actions.test.js (placeholder test replaced), tests/helpers/fake-storage.js (replaceAll now really replaces), HANDOFF.md.
3. Public: backup: buildBackup({solves, settings}, nowMs) -> file object; validateBackup(data, validIds?) -> { ok, errors[] }; parseBackup(text, validIds?) -> { ok, errors, data }; backupToState(validBackup) -> { solves, settings }; backupFileName(date); needsBackupReminder(solves, lastBackupAt, effectiveToday); constants BACKUP_APP, BACKUP_VERSION, BACKUP_REMINDER_DAYS. actions: exportBackup() -> { filename, text } (also saves lastBackupAt); importBackup(text) -> { ok: true, solveCount } | { ok: false, errors }. ui: downloadText(filename, text, type).
4. Commands: npm install; npm test -> 282 pass, 0 fail; npm run build -> OK (dist/app.js 96 kb); npm run dev, open #/settings. Phone check: Export, then clear site data, reopen, Import that file, press Replace: all solves, goal, theme and current topic come back.
5. Defaults: I could not read the Brief (only the zip), so the file format is my own choice: { app: "dsa-streak", version: 1, exportedAt: ISO text, settings: { goalHistory, theme, currentTopic, lastBackupAt }, solves: [{ problemId, day, at }] }. lastBackupAt in the file is the export time. lastBackupAt may be missing or null in a file (restored as null); other unknown fields are ignored. goalHistory must be strictly ascending (same day twice counts as unsorted). exportedAt must be an ISO date-time text. Reminder rule moved from selectors.js into needsBackupReminder, behavior unchanged (selectHome still returns backupReminder). exportBackup saves lastBackupAt before the download starts. importBackup validates, runs replaceAll (one transaction), then reloads from storage; a storage failure returns "Nothing was changed". Settings shows at most 8 errors plus "...and N more problems", rejects files over 5 MB, and uses an inline confirm box (Cancel / Replace) instead of a browser popup.
6. CONTRACT CHANGES: exportBackup now returns { filename, text } (it was a placeholder). Nothing else renamed. If Brief E/D9 define a different file shape, only backup.js (buildBackup, validateBackup, backupToState) and its tests change.
7. Known: UI tested against the pretend page in Node, NOT in a real browser. Please check on a phone: the download really lands in Downloads, the file picker opens, the segmented controls and red Replace button in dark and light mode, and the full export, clear site data, import loop.
8. Next phase: 9

HANDOFF Phase 9
1. Done: PWA setup. Manifest (name/short_name DSA Streak, start_url ./, scope ./, standalone, theme and background #131f24, icons 192, 512 and maskable 512) linked from index.html with a relative URL. Flame icon as SVG plus PNGs. Service worker: cache-first for same-origin GET, build-time precache list and version hash, no skipWaiting on install, SKIP_WAITING message handler, old caches deleted on activate. In main.js: relative-path registration, waiting worker detected at load and after updatefound, "New version ready" banner with Reload, SKIP_WAITING on tap, one reload on controllerchange.
2. Files: src/pwa/{manifest.webmanifest, sw.js, icon.svg, icon-maskable.svg, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png}, tools/pwa-build.js, tools/build.js (calls finalizeDist), tools/preview.js, tools/make-icons.py (optional), src/ui/{sw-client,update-banner}.js, src/main.js, src/index.html, src/styles/main.css (appended: update banner), package.json (script "preview"), tests/{sw,pwa-build,sw-client,update-banner-dom,manifest}.test.js, tests/helpers/fake-dom.js (textContent setter), HANDOFF.md.
3. Public: registerWorker({ serviceWorker, scriptUrl = './sw.js', onUpdateReady, reload, doc }) -> { registration, hasUpdate(), applyUpdate() } or null when the browser has no service workers. createUpdateBanner({ onReload }) -> { el, button }. tools/pwa-build.js: injectBuildInfo(source, { version, urls, dev }), listPrecacheFiles(distDir), buildVersion(distDir, urls), finalizeDist(distDir, { dev }). sw.js has three lines ending in "// @build:version", "// @build:precache", "// @build:dev": never edit or remove them (the build fails loudly if one is missing).
4. Commands: npm install; npm test -> 326 pass, 0 fail; npm run build -> prints "Service worker: version <hash>, 11 files precached"; npm run preview serves dist/ at http://localhost:8080/ (PORT=xxxx to change).
   MANUAL TEST (install and offline need https or localhost; plain http://192.168.x.x does NOT work):
   A. Phone, USB way: npm run build, npm run preview. Phone: USB debugging on, plugged in. Computer Chrome: chrome://inspect/#devices, Port forwarding, add 8080 -> localhost:8080, tick Enable. Phone Chrome: open http://localhost:8080/ .  (Or deploy dist/ to GitHub Pages and open the https address.)
   B. Install: wait 5 seconds, Chrome menu (three dots) -> Install app (or Add to Home screen). Open it from the home screen: full screen, flame icon.
   C. Offline: with the installed app opened once online, turn on airplane mode, close the app completely (recent apps, swipe away), open it from the home screen. It must open with all data, and marking a problem solved must work.
   D. Update banner: back online, keep npm run preview running. Change a real file (for example a word in src/features/home/index.js), run npm run build. On the phone open the app again (or leave it and come back). Within a few seconds the banner "New version ready" appears at the top. Tap Reload: the page reloads once and shows the change; the banner is gone. If it does not show: close the app completely and reopen once (Chrome re-checks sw.js on open).
   E. Computer check first if you like: Chrome http://localhost:8080/ -> DevTools -> Application: Manifest (no errors, Installable), Service workers (activated; after a rebuild a second one shows "waiting"), Cache storage (dsa-streak-<version>; the old one disappears after Reload).
5. Defaults: Brief B was not in the zip, so I followed the rules from the prompt. Icons: dark #131f24 background, orange/yellow flame; the maskable icon and apple-touch-icon are full-bleed with the flame in the safe zone; the "any" icons have rounded corners. The PNGs were drawn from the SVG with tools/make-icons.py (Python + Pillow, optional, NOT a project dependency, not part of the build); to redo them by hand, export icon.svg to 192x192 and 512x512, and icon-maskable.svg to 512x512 and 180x180 (apple-touch-icon.png) with any SVG-to-PNG tool. Cache names are "dsa-streak-<hash>" and only caches with that prefix are deleted on activate, so other apps on the same github.io address (Money Manager) keep theirs. Version = first 12 hex of a SHA-256 of the names and contents of all files in dist/ except sw.js and .map files; same input gives the same version. Precache = "./" plus every file in dist/, saved with cache: 'reload' so the browser's own HTTP cache is skipped; if any file fails, install fails and the old version keeps running. Good same-origin answers not in the list are saved when first fetched. Offline page opens (any address in scope, even with ?query) fall back to index.html. clients.claim() runs on activate; the page reloads ONLY after the person tapped Reload, so the first install never reloads. The app asks for a new version each time it becomes visible again (registration.update()). Banner sits at the top, above the page. Dev mode (npm run dev): sw.js is a pass-through with fixed version "dev", so no offline caching and no banner while editing; test PWA behavior with build + preview. iPhone: Share -> Add to Home Screen (apple-touch-icon and meta tags added).
6. CONTRACT CHANGES: tools/build.js copyStatic now also runs finalizeDist, so dist/sw.js is different from src/pwa/sw.js (placeholders filled). index.html: the emoji data-URI favicon was replaced by ./icon.svg. src/pwa/.gitkeep removed. tests/helpers/fake-dom.js: added a textContent setter. No other renames.
7. Known: Nothing was tried in a real browser here (no browser in my sandbox). The worker is tested by running the real sw.js and the real registration code against pretend objects, and the build step against real temp folders. Please confirm on the phone: Chrome offers Install, the app opens in airplane mode, the banner appears after a rebuild and Reload shows the new code, and the maskable icon looks right in your launcher's shape.
8. Next phase: 10

HANDOFF Phase 10
1. Done: sound effects, all made in code with the Web Audio API (no audio files, nothing added to dist/ or the precache). Eight sounds: solve (pop + ding-ding), goalMet (sparkly arpeggio), section (tada), streakStart (flame whoosh + ding), freeze (icy glass notes), milestone (whoosh, steps, big chord), levelUp (scale run + big chord), topicDone (fanfare, huge chord, falling glitter). One sound per Solved tap: the biggest event wins. Settings has a Sound On/Off control (default On); turning it On plays a small preview. Undo, navigation, backup and errors are silent. The Duolingo pack was only used as a mood reference; none of its audio is in the app.
2. Files: src/core/sound-recipes.js (new), src/core/sound-events.js (new), src/ui/sound.js (new), src/data/db.js (soundOn default), src/state/actions.js (setSound, import keeps soundOn), src/features/home/index.js, src/features/path/index.js, src/features/settings/index.js, tools/sound-preview.html (new), tools/serve.js (comment only), tests/{sound,sound-events}.test.js (new), tests/settings-dom.test.js (3 segmented controls + 2 new tests), HANDOFF.md.
3. Public: sound-recipes: RECIPES, SOUND_PRIORITY, noteHz(name), recipeLength(recipe). sound-events: soundForSolve({ before, after, problem, solvedIds }) -> sound name. ui/sound: createSoundEngine({ getContextClass, recipes, nowMs }) -> { play(name, enabled), unlock() }; unlockAudio(); playSound(name, enabled = true) -> true if it started. actions: setSound(true | false). Settings shape: soundOn (boolean, default true; older saved data gets true when loaded).
4. Commands: npm test -> 346 pass, 0 fail. Hear every sound: npm run check:db, open http://localhost:8081/tools/sound-preview.html (laptop or phone on the same address via USB forwarding). In the real app: npm run build, npm run preview, tap Solved with sound On.
5. Defaults: soundOn is a phone setting and is NOT in the backup file (backup format unchanged, still version 1); a restore keeps the current soundOn. unlockAudio() runs at the very start of the Solved tap (before any await) because phones only allow sound that starts from a tap. The same sound twice within 80 ms is ignored. All sounds are under 2.6 s; a normal solve is about 0.5 s. Master volume 0.7 through a compressor so big chords do not crackle. Sounds play on Path checks too (same rule as Home). If Web Audio is missing or fails, the app stays silent and nothing breaks.
6. CONTRACT CHANGES: none renamed. Added: settings.soundOn, actions.setSound, three new modules. tests/settings-dom.test.js now expects 3 segmented controls.
7. Known: nothing was heard or run in a real browser here (the sandbox cannot play audio, and esbuild could not be installed), so the sounds are designed from music rules and unit-tested for structure, not judged by ear. Please listen on the phone: is solve too long or too quiet, are the big ones too loud, does the first tap after opening the app make sound (phones can be picky), and does Android silent/vibrate mode mute it. To tune a sound, only src/core/sound-recipes.js needs to change (notes, timing, gain). Volume is one number, MASTER_GAIN in src/ui/sound.js.
8. Next phase: 11


HANDOFF Phase 10 (Deploy)
1. Done: deploy to GitHub Pages and the README. Workflow runs on every push to main and by hand. Job `test`: checkout, Node 22, npm ci, npm test. Job `deploy` (needs `test`): checkout, Node 22, npm ci, npm run build, configure-pages, upload-pages-artifact (path dist), deploy-pages. Permissions (contents read, pages write, id-token write) and a concurrency group are set. README covers what the app is, run/test/build, deploy (Settings, Pages, Source: GitHub Actions), install on Android, the Habit tip, the backup reminder (data lives only on the phone) and the folder map. URL check of the build: every URL is relative (details in 5). No app code changed.
2. Files: .github/workflows/deploy.yml (new), README.md (new), HANDOFF.md.
3. Public: nothing in the code. Workflow name "Deploy to GitHub Pages"; jobs `test` and `deploy`; concurrency group "pages".
4. Commands: npm test -> 346 pass, 0 fail; npm run build -> OK (11 files precached). Proof that a failing test blocks the deploy (after the first successful deploy):
   a. Create tests/zz-deploy-gate.test.js containing a test that calls assert.fail(). Run npm test: it must fail.
   b. git add, commit ("TEMP: failing test"), push to main.
   c. GitHub, Actions tab, open the new run: `test` is red, `deploy` is grey "Skipped". The live app and the list of deployments (Settings, Environments, github-pages) show no new deployment.
   d. Remove the file (git rm, commit, push): both jobs go green and a new deployment appears.
5. Defaults: action versions checkout@v4, setup-node@v4 (with cache: npm), configure-pages@v5, upload-pages-artifact@v4, deploy-pages@v4. The `deploy` job uses environment `github-pages` (deploy-pages needs it) and shows the site address on the run. concurrency cancel-in-progress is false, so a running deploy finishes and a newer push waits. `deploy` builds dist/ itself (it is not passed from `test`). No .nojekyll needed (Actions deploys do not run Jekyll). URL check: I read dist/index.html, manifest, sw.js (precache list), app.js and app.css for absolute or http addresses (none found), then served dist/ ONLY under /dsa-streak/ and loaded all 11 files plus the manifest icons: all 200, and manifest start_url, scope and id stay inside the sub-path. The only address-changing code is history.replaceState(null, '', '#/home'), which keeps the path.
6. CONTRACT CHANGES: none.
7. Known: the workflow was NOT run here (no GitHub access); its YAML was parsed and checked for structure only, so the first real run is the real test. Action versions: configure-pages@v5, upload-pages-artifact@v4 and deploy-pages@v4 match GitHub's current Pages docs; setup-node@v4 was not checked against docs. Newer majors exist (the docs example uses checkout@v5, and upload-pages-artifact has a v5), so you may see an upgrade notice; the versions used keep working. This file already used "Phase 10" for the sound phase, so this note is the deploy phase from the original plan. The README uses <your-username> and <repo> as placeholders for the app address; nothing in the build depends on the real names. Still to confirm on a real GitHub repo: Pages source set to GitHub Actions, first deploy green, the app opens at the sub-path address, install and offline work from that https address, and the failing-test proof (4).
8. Next phase: none defined in the files I have. After the deploy proof and the phone checks from Phases 9 and 10 (sound), v1 is ready to use.

## UI merge: looks folder merged into the app (this zip is now the current app)

The older UI phases (tokens, Nunito, icons) were lost, so they were rebuilt from the looks folder, together with the
newer looks work. Logic files were not changed (state, core, actions, selectors). Tests: 382 pass. `npm run build` works.

What changed
- `src/styles/main.css` = the looks stylesheet (tokens, Nunito, 5 topic hues, flame, node art, Ember rig CSS).
  The old bobbing `.hero__ember` rule was removed (the rig floats by itself).
- Font: `src/fonts/` (Nunito + OFL.txt). `tools/build.js` copies it to `dist/fonts/` (esbuild `file` loader); the CSS url stays relative.
- New `src/ui/`: `icons.js` (13 icons, `icon(name, size)`), `flame.js` (dim / stage-1 / stage-2 / stage-3, `flameStageFor`),
  `node-art.js` (hidden sprite + `<use>`), `ember-rig.js` (the layered mascot), `reward-toast.js` (emoji in reward text -> icon).
  `ember.js` is now `createEmber()` + `setEmberMood / cheerEmber / waveEmber`. `dom.js` got `svgFromString()` (SVG text -> element).
- Home: flame chip (dim until today is solved; stage by streak 1-6 / 7-13 / 14+), drawn icons everywhere, ONE Ember per screen
  that survives redraws. Faces: `wait` (not solved today), `new` (never solved anything), `happy` (goal met), normal idle otherwise
  (`emberMoodFor` in `features/home/copy.js`). Cheers once when the daily goal is completed (or a milestone), waves once per app open.
- Path: 5 topic colours (green, purple, teal, pink, blue, repeating, `topicHue` in `features/path/model.js`), star node art for
  explored nodes and the upcoming art for unexplored ones, 96 px progress ring on the current node, bottom sheet wears the topic colour.
- Stats, nav, toasts, week dots, banner: emoji and symbols replaced by drawn icons.
- Tests: new `svg-icons`, `ember-rig`, `reward-toast`, `tokens` tests; existing Home / Path / model / copy tests extended.

Notes
- Not changed: `homeCopy().mood` and `.lit` still exist (old Ember moods) but Home no longer reads them. Safe to delete later.
- Known old quirk (not new): tapping a node while a sheet is already open leaves the second sheet empty. The backdrop makes it
  impossible by hand, so it was left alone.

## Path ring fix (segmented ring)
- The progress ring around a Path node is now split: 3 or 4 equal-length arcs, with the problems shared out evenly
  between them (`splitProblems`, `ringSegments`, `createSegmentedRing` in `src/ui/ring.js`), arcs fill one after the other.
  E.g. 15 = 5+5+5, 49 = 13+12+12+12. 2 or 3 problems = one arc per problem; 0 or 1 problem = one plain ring.
- The ring is centred on the node (same 96 px stage for every node that has a ring; before, "in progress" nodes used an 80 px
  stage, which pushed the ring down onto the name). The current node's ring breathes with the node (`node-pulse` on `.ring--segments`).

## Skip + Continue here anywhere
- "Next up" is now found from a saved POINTER (`settings.currentProblemId`), not just a topic: `findNext` in `src/core/next.js` starts at the
  pointer, walks forward through the sheet (wrapping at the end) and returns the first problem that is not solved and not skipped.
  Home and Path both use it through `findNextFor` in `src/state/selectors.js`, so they always show the same problem.
- Skip (button on the Home Next-up card): `actions.skipProblem`. The problem stays unsolved (no XP, no streak) and is added to
  `settings.skippedIds`; Next up passes over it for good. It only comes back when the user goes back to it by hand
  (`actions.continueFrom` on it, or solving it). Undo on the toast = `actions.unskipProblem`.
- Continue here: on every node (footer button, starts at the node's first open problem; if none, after the node) and on every problem row
  (small button beside the row; not shown on the Next-up row). `actions.continueFrom(problemId)`.
- The current node on the Path is the node that holds Next up. When only skipped problems are left, Home says so instead of "All done".
- Backup file: `currentProblemId` and `skippedIds` are included (older backups without them still load). Old saved data with only a
  `currentTopic` keeps working (the search starts at that topic's first problem).
- Tests: `tests/skip-continue.test.js` is new; backup / selectors / path-dom tests were updated.

## Home streak look (big streak + merged week pill)
- The small streak chip is gone from the top row (now 3 chips: freezes, XP, goal). `streakHero()` in `src/features/home/index.js` draws a big flame
  and number with "day streak" (the 3 flame stages from `flameStageFor`). Flickers when today is done, 3 sparks from a 7-day streak on,
  dim while today is open. Colours come from `.streak-hero--stage-N` in `main.css`.
- Week strip: neighbouring SOLVED days join into one gradient pill (`.week__run`, placed with `--from` / `--len` on a 7-column grid; each `.day` is
  `display: contents` so letters and dots sit on the same grid). A gap starts a new pill; frozen/missed days stay separate dots. The pill that
  includes today grows in (`is-fresh`) only right after a solve. Today's empty dot glows softly.
- New tokens (in `:root` next to the flame tokens): `--run-top`, `--run-bottom`, `--run-edge`, `--run-check`.
- Ember in the Home hero is 108 px wide (was about 130) to make room; `.home__scroll` has side room so his flame tail is no longer cut off.
- Next: the daily streak celebration screen (full screen after the first solve of the day).

## Home redesign (from the home demo, v5)
- `src/features/home/index.js` is the demo's design wired to the real store. Header = 3 big pill cards (freezes, XP, daily goal), each opens a
  short sheet (`infoSheet`); the goal sheet changes the goal with `actions.setGoal`. The middle part spreads out (`justify-content: space-evenly`).
  Home sizes scale smoothly with the height Home gets (`.home` is a size container; the block "Home sizes" in `main.css` uses `cqh` units, small at 600 px
  of Home height, roomy at 714 px). It fits with no scrolling from about 720 px of screen height; below that the middle part scrolls.
- "Next up" card (`.next2`): tinted band in the topic colour (`topicHue(n.topicIndex)`), ONE XP chip (`+10 XP`, or `+15 XP` with a goal icon when this
  solve completes today's goal), title, tag + topic, a progress bar for the current section with its `done/total`, then Skip + Solved.
  After Solved the SAME card turns gold (`.next2--done`): reward chips (via `rewardView`, drawn icons), Undo, Next problem. Next problem is disabled
  for 600 ms so a fast double tap cannot skip past. The old toast-with-Undo, the floating "+10 XP" and `showRewardToast` are no longer used on Home.
- `selectHome().next` now also has `topicIndex`, `subDone`, `subTotal` (section progress for the card).
- First solve of the day only: flame, number and week pill animate (`fx.streak = before.todayStatus !== 'solved'`); Ember reacts every time (`fx.bounce`).
- Week bar: shows the last 4 days, today, and `UPCOMING = 2` empty dashed days (`.dot--future`), so it is never full. Built from `home.week` in the
  UI (no selector change). Change `UPCOMING` to 3 for an emptier bar (then it shows 3 past days).
- Dropped from the card on purpose (the demo was approved without them): the "#7 of 405" counter and the "Solve it on takeUforward, then tap Solved." hint.
- CSS: the old `.chip*`, `.next__*` (except the finished-card ones), `.fx-layer` and `.xp-float` rules were removed; the new rules sit in `main.css`
  where the old card rules were. The level bar in the XP sheet is `.level-bar` (the old `.bar` belongs to other screens).
- Reward chips on the gold card are kept short (`+5 goal` instead of `+5 daily goal reached`) so the usual rewards fit on one line; 4+ chips (for
  example day 7 with a freeze) can still wrap to a second row.
- App frame fix (bug seen on an Android phone: bottom navigation pushed off screen, whole page scrolled): `#app` is now `position: fixed; inset: 0`
  and `html, body` do not scroll. The old `height: 100vh / 100dvh` was taller than the visible area on Android Chrome. This affects every screen.
- Tests: `home-dom`, `path-dom`, `skip-continue` updated for the new card; new tests for first-solve-only animation, upcoming days, info sheets and
  section progress.
