// Checks every fact from Brief section C, plus the catalog functions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROBLEMS } from '../src/core/problems.data.js';
import { TOPICS, buildTopics, getProblem } from '../src/core/catalog.js';
import { flattenProblems, renderModule } from '../tools/build-problems.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSource = (name) => fs.readFileSync(path.join(ROOT, 'tools/source', name), 'utf8');
const json = JSON.parse(readSource('a2z_arrays_to_end.json'));

// A small CSV reader. Handles quoted fields, commas inside quotes, "" escapes and CRLF.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // ignore: CRLF line ends
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const EXPECTED_TOPICS = [
  ['Arrays', 32], ['Hashing', 6], ['Binary Search', 32],
  ['Strings (Basic and Medium)', 7], ['Recursion', 22], ['Linked-List', 49],
  ['Bit Manipulation', 14], ['Greedy Algorithms', 14],
  ['Sliding Window / 2 Pointer', 13], ['Stack / Queues', 31],
  ['Binary Trees', 32], ['Binary Search Trees', 15], ['Heaps', 20],
  ['Graphs', 46], ['Dynamic Programming', 53], ['Tries', 7],
  ['Strings (Advanced Algo)', 9], ['Maths', 3],
];

test('totals: 405 problems, 18 topics, 71 subsections', () => {
  assert.equal(PROBLEMS.length, 405);
  assert.equal(TOPICS.length, 18);
  assert.equal(TOPICS.reduce((n, t) => n + t.subsections.length, 0), 71);
});

test('topics are in sheet order with the right sizes', () => {
  assert.deepEqual(TOPICS.map((t) => [t.name, t.ids.length]), EXPECTED_TOPICS);
});

test('ids run 1 to 405 with no gaps, in order', () => {
  PROBLEMS.forEach((p, i) => assert.equal(p.id, i + 1));
});

test('difficulty counts: Basic 35, Core 254, Pro 108, 8 nulls', () => {
  const counts = { Basic: 0, Core: 0, Pro: 0, null: 0 };
  for (const p of PROBLEMS) {
    assert.ok(['Basic', 'Core', 'Pro', null].includes(p.difficulty), `bad difficulty on #${p.id}`);
    counts[p.difficulty === null ? 'null' : p.difficulty]++;
  }
  assert.deepEqual(counts, { Basic: 35, Core: 254, Pro: 108, null: 8 });
});

test('no empty titles, and odd titles are kept as they are', () => {
  for (const p of PROBLEMS) assert.ok(p.title.trim().length > 0, `empty title on #${p.id}`);
  assert.equal(getProblem(397).title, 'Hashing In Strings | Theory');
  assert.ok(PROBLEMS.some((p) => p.subsection === 'FAQS (DLL)'));
});

test('every problem has the right record shape', () => {
  for (const p of PROBLEMS) {
    assert.deepEqual(Object.keys(p), ['id', 'topic', 'subsection', 'noInSubsection', 'title', 'difficulty']);
  }
});

test('noInSubsection counts 1, 2, 3... inside each subsection', () => {
  for (const topic of TOPICS) {
    for (const sub of topic.subsections) {
      sub.ids.forEach((id, i) => assert.equal(getProblem(id).noInSubsection, i + 1));
    }
  }
});

test('CSV and JSON agree row by row', () => {
  const rows = parseCsv(readSource('a2z_arrays_to_end.csv'));
  assert.deepEqual(rows[0], ['no', 'topic', 'subsection', 'no_in_subsection', 'name', 'difficulty']);
  const body = rows.slice(1);
  assert.equal(body.length, 405);
  body.forEach((r, i) => {
    const p = PROBLEMS[i];
    assert.equal(Number(r[0]), p.id);
    assert.equal(r[1], p.topic);
    assert.equal(r[2], p.subsection);
    assert.equal(Number(r[3]), p.noInSubsection);
    assert.equal(r[4], p.title);
    assert.equal(r[5] === '' ? null : r[5], p.difficulty);
  });
});

test('generated file equals a fresh flatten of the JSON', () => {
  assert.deepEqual(PROBLEMS, flattenProblems(json));
  const onDisk = fs.readFileSync(path.join(ROOT, 'src/core/problems.data.js'), 'utf8');
  assert.equal(onDisk, renderModule(flattenProblems(json)));
});

test('catalog: ids in topics and subsections match the problems', () => {
  for (const topic of TOPICS) {
    const fromSubs = topic.subsections.flatMap((s) => s.ids);
    assert.deepEqual(fromSubs, topic.ids);
    for (const id of topic.ids) assert.equal(getProblem(id).topic, topic.name);
  }
});

test('buildTopics works on a small hand-made list', () => {
  const fake = [
    { id: 1, topic: 'A', subsection: 'x', noInSubsection: 1, title: 't1', difficulty: null },
    { id: 2, topic: 'A', subsection: 'y', noInSubsection: 1, title: 't2', difficulty: null },
    { id: 3, topic: 'B', subsection: 'z', noInSubsection: 1, title: 't3', difficulty: null },
  ];
  assert.deepEqual(buildTopics(fake), [
    { name: 'A', ids: [1, 2], subsections: [{ name: 'x', ids: [1] }, { name: 'y', ids: [2] }] },
    { name: 'B', ids: [3], subsections: [{ name: 'z', ids: [3] }] },
  ]);
});

test('getProblem returns the problem, or undefined for an unknown id', () => {
  assert.equal(getProblem(1).title, 'Linear Search');
  assert.equal(getProblem(405).id, 405);
  assert.equal(getProblem(0), undefined);
  assert.equal(getProblem(406), undefined);
});
