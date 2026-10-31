// Path screen logic. Pure code: no screen, no storage, no clock.
// Turns selectPath(state) into banners and nodes (one node per subsection).

// The five topic colours, in topic order, repeating. A topic's colour never depends on progress.
export const TOPIC_HUES = ['green', 'purple', 'teal', 'pink', 'blue'];

export function topicHue(topicIndex) {
  return TOPIC_HUES[((topicIndex % TOPIC_HUES.length) + TOPIC_HUES.length) % TOPIC_HUES.length];
}

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
// Returns { topics: [{ number, hue, name, solved, total, done, isCurrent, nodes }], nodes: Map(key -> node), currentKey, allDone }
// node: { key, topicNumber, topic, hue, name, solved, total, state, offset, nextProblemId, skippedCount, problems }
// The current node is the one that holds the Next up problem (selectPath marks it with `isNext`),
// so the Path and Home always show the same problem. allDone = every problem of the sheet is solved
// (currentKey can also be null when only skipped problems are left).
export function buildPathModel(pathData) {
  const nodes = new Map();
  let currentKey = null;
  let index = 0;

  const topics = pathData.map((topic, topicIndex) => {
    const currentInTopic = topic.subsections.findIndex((s) => s.problems.some((p) => p.isNext));

    const topicNodes = topic.subsections.map((sub, subIndex) => {
      const isCurrent = subIndex === currentInTopic;
      const next = isCurrent ? sub.problems.find((p) => p.isNext) : null;
      const node = {
        key: `t${topicIndex}s${subIndex}`,
        topicNumber: topicIndex + 1,
        topic: topic.topic,
        hue: topicHue(topicIndex),
        name: sub.name,
        solved: sub.solved,
        total: sub.total,
        state: nodeState({ solved: sub.solved, total: sub.total, isCurrent }),
        offset: zigzagOffset(index),
        nextProblemId: next ? next.id : null,
        skippedCount: sub.problems.filter((p) => p.skipped).length,
        problems: sub.problems,
      };
      index += 1;
      if (isCurrent) currentKey = node.key;
      nodes.set(node.key, node);
      return node;
    });

    return {
      number: topicIndex + 1,
      hue: topicHue(topicIndex),
      name: topic.topic,
      solved: topic.solved,
      total: topic.total,
      done: topic.done,
      isCurrent: currentInTopic >= 0,
      nodes: topicNodes,
    };
  });

  const allDone = topics.every((t) => t.done);
  return { topics, nodes, currentKey, allDone };
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

// Where "Continue here" on a whole node starts: its first problem that is not solved and not skipped.
// If there is none (the node is all solved, or only skipped problems are left), its LAST problem,
// which means "carry on right after this node". Returns a problem id, or null for an empty node.
export function continueTargetFor(node) {
  if (!node || node.problems.length === 0) return null;
  const open = node.problems.find((p) => !p.solved && !p.skipped);
  return open ? open.id : node.problems[node.problems.length - 1].id;
}
