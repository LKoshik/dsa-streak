// Build script. Uses esbuild to make the dist/ folder.
//   npm run build   -> one build
//   npm run dev     -> build, serve on http://localhost:8080, rebuild on every change
// Every URL in the output is relative (./), so it works under a GitHub Pages sub-path.
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizeDist } from './pwa-build.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const serve = process.argv.includes('--serve');

// Copy the files that need no bundling: index.html and everything in src/pwa
// (manifest, icons, sw.js). Then sw.js gets its precache list and build version.
function copyStatic() {
  fs.mkdirSync(DIST, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'src/index.html'), path.join(DIST, 'index.html'));
  const pwaDir = path.join(ROOT, 'src/pwa');
  if (fs.existsSync(pwaDir)) {
    for (const name of fs.readdirSync(pwaDir)) {
      if (name === '.gitkeep') continue;
      fs.cpSync(path.join(pwaDir, name), path.join(DIST, name), { recursive: true });
    }
  }
  const { version, urls } = finalizeDist(DIST, { dev: serve });
  if (!serve) console.log(`Service worker: version ${version}, ${urls.length} files precached`);
}

// Runs the static copy after every build (also every rebuild in dev mode).
const copyStaticPlugin = {
  name: 'copy-static',
  setup(build) {
    build.onEnd(() => copyStatic());
  },
};

const options = {
  // Two entries with the same output name: app.js and app.css.
  entryPoints: [
    { in: path.join(ROOT, 'src/main.js'), out: 'app' },
    { in: path.join(ROOT, 'src/styles/main.css'), out: 'app' },
  ],
  bundle: true,
  outdir: DIST,
  format: 'esm',
  target: 'es2020',
  minify: !serve,
  sourcemap: serve,
  logLevel: 'info',
  plugins: [copyStaticPlugin],
};

fs.rmSync(DIST, { recursive: true, force: true });

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: DIST, port: 8080 });
  console.log(`Dev server: http://localhost:${port}  (Ctrl+C to stop)`);
} else {
  await esbuild.build(options);
  console.log('Built to dist/');
}
