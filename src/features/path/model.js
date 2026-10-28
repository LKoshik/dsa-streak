// Path screen logic. Pure code: no screen, no storage, no clock.
// Turns selectPath(state) into banners and nodes (one node per subsection).

// The wave the nodes follow, as a share of the maximum sideways shift.
const WAVE = [0, 0.6, 1, 0.6, 0, -0.6, -1, -0.6];

// Sideways shift in px for the node at `index` (the wave keeps going across topics).
export function zigzagOffset(index, amplitude = 64) {
  const value = Math.round(WAVE[((index % WAVE.length) + WAVE.length) % WAVE.length] * amplitude);
  return value === 0 ? 0 : value; // never -0
}

// 'done' | 'current' | 'progress' | 'upcoming'
export function nodeState({ solved, total, isCurrent }) {
  if (total > 0 && solved >= total) return 'done';
  if (isCurrent) return 'current';
  if (solved > 0) return 'progress';
  return 'upcoming';
}

// pathData: the result of selectPath(state).
// Returns { topics: [{ number, name, solved, total, done, isCurrent, nodes }], nodes: Map(key -> node), currentKey }
// node: { key, topicNumber, topic, name, solved, total, state, offset, nextProblemId, problems }
// The current node is the first unfinished subsection of the current topic
// (the Next up problem is the lowest unsolved id of that topic, so it lives there).
export function buildPathModel(pathData) {
  const nodes = new Map();
  let currentKey = null;
  let index = 0;

  const topics = pathData.map((topic, topicIndex) => {
    let currentInTopic = -1;
    if (topic.isCurrent) currentInTopic = topic.subsections.findIndex((s) => s.solved < s.total);

    const topicNodes = topic.subsections.map((sub, subIndex) => {
      const isCurrent = subIndex === currentInTopic;
      const next = isCurrent ? sub.problems.find((p) => !p.solved) : null;
      const node = {
        key: `t${topicIndex}s${subIndex}`,
        topicNumber: topicIndex + 1,
        topic: topic.topic,
        name: sub.name,
        solved: sub.solved,
        total: sub.total,
        state: nodeState({ solved: sub.solved, total: sub.total, isCurrent }),
        offset: zigzagOffset(index),
        nextProblemId: next ? next.id : null,
        problems: sub.problems,
      };
      index += 1;
      if (isCurrent) currentKey = node.key;
      nodes.set(node.key, node);
      return node;
    });

    return {
      number: topicIndex + 1,
      name: topic.topic,
      solved: topic.solved,
      total: topic.total,
      done: topic.done,
      isCurrent: topic.isCurrent,
      nodes: topicNodes,
    };
  });

  return { topics, nodes, currentKey };
}

// The banner text, e.g. "TOPIC 3 · Binary Search · 12 of 32".
export function bannerText(topic) {
  return `TOPIC ${topic.number} · ${topic.name} · ${topic.solved} of ${topic.total}`;
}

// Where to scroll so a node sits near the middle of the view (a bit above centre,
// because the START bubble is drawn above the node). Never negative.
export function centeredScrollTop({ nodeTop, nodeHeight, viewHeight, scrollTop }) {
  const target = scrollTop + nodeTop - (viewHeight * 0.45 - nodeHeight / 2);
  return Math.max(0, Math.round(target));
}
