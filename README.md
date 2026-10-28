# DSA Streak

A small phone app that helps you solve **one DSA problem a day** from Striver's A2Z sheet.

It does not host or teach any problems. It only remembers which problem is next, counts your streak,
and nudges you to open the real sheet on takeUforward. Think of it as a Duolingo-style habit tracker
for the A2Z sheet: streak flame, streak freezes, daily goal ring, XP and levels, a winding path of
topics, a stats calendar, and small sounds and animations when you solve something.

It is a PWA (a website you can install like an app). It works offline, and everything you do stays
on your phone. There is no server and no account.

## Run it on your computer

You need Node 22 or newer.

```
npm ci          # first time only (installs exactly what package-lock.json says)
npm run dev     # builds, then opens a dev server at http://localhost:8080
```

`npm run dev` rebuilds whenever you save a file. In dev mode the service worker does nothing, so
there is no offline caching while you edit.

## Test

```
npm test
```

This runs every file in `tests/` with Node's built-in test runner (`node --test`). No browser is
needed: the screens are tested against a small pretend page (`tests/helpers/fake-dom.js`).

## Build

```
npm run build     # makes dist/ (index.html, app.js, app.css, sw.js, icons, manifest)
npm run preview   # serves dist/ at http://localhost:8080/ so you can try install and offline
```

`npm run build` first rebuilds `src/core/problems.data.js` from the A2Z files in `tools/source/`,
then bundles the app with esbuild, then fills in the service worker's file list and version.
`dist/` is generated, so it is not stored in git.

Every address in the built app is relative (`./app.js`, `./manifest.webmanifest`, and so on), so the
same build works at `http://localhost:8080/` and at `https://<your-username>.github.io/<repo>/`.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` tests, builds and publishes the app.

One-time setup:

1. Push this project to a GitHub repository, on the branch `main`.
2. In the repository, open **Settings**, then **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

After that, every push to `main` deploys the app. You can also deploy by hand: open the **Actions**
tab, pick **Deploy to GitHub Pages**, and press **Run workflow**.

What the workflow does:

1. Job `test`: checks out the code, sets up Node 22, runs `npm ci` and `npm test`.
2. Job `deploy`: starts only if `test` passed. It runs `npm ci` and `npm run build`, then publishes
   the `dist/` folder to GitHub Pages.

If a test fails, the `deploy` job is skipped and the live app stays exactly as it was.

Your app address is `https://<your-username>.github.io/<repo>/` (the finished run also shows it
on the `deploy` job).

## Install on Android

1. Open the app address in **Chrome** on your phone.
2. Wait a few seconds, then tap the three dots menu and choose **Install app**
   (or **Add to Home screen**).
3. Open it once from the home screen while you are online. After that it also opens in airplane mode.

When a new version is published, a banner "New version ready" appears at the top of the app.
Tap **Reload** to switch to it.

Habit tip: install the app to your home screen and set a daily phone alarm at a fixed time.
One problem is enough.

## Back up your data

**Your data lives only on your phone** (in the browser's storage for this app). If you clear the
site data, uninstall the app, or lose the phone, your streak and progress are gone, and nobody
else has a copy.

So export a backup regularly:

- Open **Settings**, then **Export backup**. A JSON file is saved to your Downloads folder.
- Keep the file somewhere safe (Google Drive, email it to yourself, your computer).
- To restore: **Settings**, then **Import backup**, pick the file, and confirm. Importing replaces all data
  on that phone.

The app reminds you when your last backup is 14 days old or more.

## Folder map

```
.github/workflows/deploy.yml   test, build and deploy to GitHub Pages
docs/                          design briefs (BRIEF_V2_AMENDMENTS.md, BRIEF_SOUND.md)
HANDOFF.md                     notes at the end of each build phase
package.json                   scripts: dev, test, build, preview, problems, check:db
src/
  index.html                   the page shell
  main.js                      start-up: database, router, service worker
  router.js                    hash router (#/home, #/path, #/stats, #/settings)
  core/                        pure logic, no browser needed: dates, streak, xp, next problem,
                               catalog, calendar, backup, sound recipes and events,
                               problems.data.js (generated, do not edit)
  data/db.js                   IndexedDB: the only place that touches the database
  state/                       store, actions (change data), selectors (read data for screens)
  ui/                          small building blocks: dom helper, ring, toast, nav, bottom sheet,
                               theme, Ember mascot, sound engine, download, update banner
  features/                    the four screens: home, path, stats, settings
  styles/main.css              all styles (light and dark)
  pwa/                         manifest, service worker, icons
tests/                         node --test files; helpers/ holds the pretend page and storage
tools/                         build.js, build-problems.js, pwa-build.js, preview.js, serve.js,
                               db-check.html, sound-preview.html, make-icons.py (optional),
                               source/ (the scraped A2Z sheet as JSON and CSV)
dist/                          build output (generated, not in git)
```
