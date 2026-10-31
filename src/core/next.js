// Finds the next problem and the progress of each topic (Brief D7).
// Pure code. `topics` is the list from catalog.js: [{ name, ids, subsections }] in sheet order.
// `solvedIds` is a Set of problem ids.

// Returns { topic: name, problemId } or null when nothing is left to do.
// The search starts at a problem and walks forward through the whole sheet in order, wrapping around at the end:
// 1) it starts at `currentProblemId` (set by "Continue here" or by Skip) when that is a real problem;
// 2) otherwise it starts at the first problem of `currentTopic` (older saved data); a null or unknown
//    topic means "start from the very first problem";
// 3) the answer is the first problem on the way that is NOT solved and NOT skipped.
// Skipped problems are passed over for good: they only come back when you go back to them yourself.
// `options` = { currentProblemId, skippedIds } (a Set or an array); both are optional.
export function findNext(topics, solvedIds, currentTopic, options = {}) {
  const currentProblemId = options && options.currentProblemId !== undefined ? options.currentProblemId : null;
  const skippedIds = options && options.skippedIds ? new Set(options.skippedIds) : new Set();
  const order = [];
  for (const topic of topics) for (const id of topic.ids) order.push({ id, topic: topic.name });
  if (order.length === 0) return null;
  let start = currentProblemId === null ? -1 : order.findIndex((entry) => entry.id === currentProblemId);
  if (start < 0) {
    start = currentTopic === null || currentTopic === undefined ? -1 : order.findIndex((entry) => entry.topic === currentTopic);
  }
  if (start < 0) start = 0;
  for (let step = 0; step < order.length; step++) {
    const entry = order[(start + step) % order.length];
    if (!solvedIds.has(entry.id) && !skippedIds.has(entry.id)) return { topic: entry.topic, problemId: entry.id };
  }
  return null;
}

// Returns [{ topic: name, solved, total, done }] in the same order as `topics`.
export function topicProgress(topics, solvedIds) {
  return topics.map((topic) => {
    let solved = 0;
    for (const id of topic.ids) if (solvedIds.has(id)) solved += 1;
    const total = topic.ids.length;
    return { topic: topic.name, solved, total, done: total > 0 && solved === total };
  });
}
