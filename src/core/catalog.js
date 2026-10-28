// The problem catalog: groups the flat problem list into topics and subsections.
// Pure code: no screen, no storage, no clock.
import { PROBLEMS } from './problems.data.js';

// Returns [{ name, ids, subsections: [{ name, ids }] }] in sheet order.
export function buildTopics(problems) {
  const topics = [];
  const topicByName = new Map();
  for (const p of problems) {
    let topic = topicByName.get(p.topic);
    if (!topic) {
      topic = { name: p.topic, ids: [], subsections: [] };
      topicByName.set(p.topic, topic);
      topics.push(topic);
    }
    let sub = topic.subsections[topic.subsections.length - 1];
    if (!sub || sub.name !== p.subsection) {
      sub = { name: p.subsection, ids: [] };
      topic.subsections.push(sub);
    }
    topic.ids.push(p.id);
    sub.ids.push(p.id);
  }
  return topics;
}

export const TOPICS = buildTopics(PROBLEMS);

const problemById = new Map(PROBLEMS.map((p) => [p.id, p]));

// Look up one problem by id. Returns undefined for an unknown id.
export function getProblem(id) {
  return problemById.get(id);
}
