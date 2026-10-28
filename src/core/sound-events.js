// Which sound to play after a "Solved" tap. Pure code: compares the Home numbers from
// before and after (same idea as computeRewards) and returns ONE sound name.
// When several things happen at once, the biggest one wins, so you never hear a pile-up.
import { TOPICS } from './catalog.js';
import { SOUND_PRIORITY } from './sound-recipes.js';

// before, after: selectHome results. problem: the problem just solved.
// solvedIds: a Set of solved ids AFTER the tap.
export function soundForSolve({ before, after, problem, solvedIds }) {
  const found = ['solve'];

  if (!before.daily.met && after.daily.met) found.push('goalMet');
  if (after.freezes > before.freezes) found.push('freeze');
  else if (after.streak > before.streak && after.streak % 7 === 0) found.push('milestone');
  else if (before.streak === 0 && after.streak === 1) found.push('streakStart');
  if (after.xp.level > before.xp.level) found.push('levelUp');

  const topic = TOPICS.find((t) => t.name === problem.topic);
  const subsection = topic && topic.subsections.find((s) => s.name === problem.subsection);
  if (topic && topic.ids.every((id) => solvedIds.has(id))) found.push('topicDone');
  else if (subsection && subsection.ids.every((id) => solvedIds.has(id))) found.push('section');

  // Highest priority wins; on a tie the one found first wins.
  return found.reduce((best, name) => (SOUND_PRIORITY[name] > SOUND_PRIORITY[best] ? name : best));
}
