// Finds the next problem and the progress of each topic (Brief D7).
// Pure code. `topics` is the list from catalog.js: [{ name, ids, subsections }] in sheet order.
// `solvedIds` is a Set of problem ids.

// The lowest unsolved id in a topic, or null if the topic is finished.
function firstUnsolved(topic, solvedIds) {
  let best = null;
  for (const id of topic.ids) {
    if (!solvedIds.has(id) && (best === null || id < best)) best = id;
  }
  return best;
}

// Returns { topic: name, problemId } or null when everything is solved.
// 1) currentTopic if it still has an unsolved problem;
// 2) otherwise the next topic after it (wrapping around) that has one;
//    a null or unknown currentTopic means "start from the first topic";
// 3) the next problem is the lowest unsolved id in that topic.
export function findNext(topics, solvedIds, currentTopic) {
  const count = topics.length;
  if (count === 0) return null;
  const currentIndex = topics.findIndex((t) => t.name === currentTopic);
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  for (let step = 0; step < count; step++) {
    const topic = topics[(startIndex + step) % count];
    const problemId = firstUnsolved(topic, solvedIds);
    if (problemId !== null) return { topic: topic.name, problemId };
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
