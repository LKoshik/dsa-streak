// Works out which little celebration messages to show after a "Solved" tap.
// Pure code: compares the Home numbers from before and after.
import { TOPICS } from '../../core/catalog.js';

// before, after: selectHome results. problem: the problem just solved.
// solvedIds: a Set of solved ids AFTER the tap.
// Returns { messages: [text], cheer: boolean } (cheer = Ember cheers for a milestone).
export function computeRewards({ before, after, problem, solvedIds }) {
  const messages = [];
  let cheer = false;

  if (!before.daily.met && after.daily.met) {
    messages.push('🎯 +5 daily goal reached');
  }
  if (after.freezes > before.freezes) {
    messages.push('❄️ Freeze earned');
    cheer = true;
  } else if (after.streak > before.streak && after.streak % 7 === 0) {
    // A 7-day milestone, but the two freezes were already full.
    messages.push(`🔥 ${after.streak}-day streak`);
    cheer = true;
  } else if (before.streak === 0 && after.streak === 1) {
    messages.push('🔥 Streak started');
  }
  if (after.xp.level > before.xp.level) {
    messages.push(`⭐ Level ${after.xp.level}`);
    cheer = true;
  }

  const topic = TOPICS.find((t) => t.name === problem.topic);
  const subsection = topic && topic.subsections.find((s) => s.name === problem.subsection);
  if (topic && topic.ids.every((id) => solvedIds.has(id))) {
    messages.push(`🏆 Topic finished: ${topic.name}`);
    cheer = true;
  } else if (subsection && subsection.ids.every((id) => solvedIds.has(id))) {
    messages.push(`✅ Section finished: ${subsection.name}`);
  }

  return { messages, cheer };
}
