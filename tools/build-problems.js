// Turns tools/source/a2z_arrays_to_end.json into src/core/problems.data.js.
// Run it with: npm run problems   (build and dev run it for you).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_JSON = path.join(ROOT, 'tools/source/a2z_arrays_to_end.json');
export const OUTPUT_FILE = path.join(ROOT, 'src/core/problems.data.js');

// Flatten { topic: { subsection: [problem, ...] } } into one list in sheet order.
// A blank difficulty becomes null. Titles and names are kept exactly as they are.
export function flattenProblems(json) {
  const list = [];
  for (const [topic, subsections] of Object.entries(json)) {
    for (const [subsection, items] of Object.entries(subsections)) {
      for (const item of items) {
        list.push({
          id: item.no,
          topic,
          subsection,
          noInSubsection: item.no_in_subsection,
          title: item.name,
          difficulty: item.difficulty ? item.difficulty : null,
        });
      }
    }
  }
  return list;
}

// The exact text of the generated file.
export function renderModule(problems) {
  return (
    '// GENERATED FILE - do not edit.\n' +
    '// Made by tools/build-problems.js from tools/source/a2z_arrays_to_end.json.\n' +
    '// To change it, edit the source file and run: npm run problems\n' +
    'export const PROBLEMS = ' + JSON.stringify(problems, null, 2) + ';\n'
  );
}

// Only write the file when this script is run directly (not when a test imports it).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const json = JSON.parse(fs.readFileSync(SOURCE_JSON, 'utf8'));
  const problems = flattenProblems(json);
  fs.writeFileSync(OUTPUT_FILE, renderModule(problems));
  console.log(`Wrote ${problems.length} problems to src/core/problems.data.js`);
}
