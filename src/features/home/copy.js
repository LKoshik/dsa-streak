// The words and mood for the Home screen (pure code, easy to test).

// Picks the headline, the small line under it, Ember's mood and whether the flame pulses.
//   state: 'start' | 'keep' | 'progress' | 'done' | 'welcomeBack' | 'allDone'

// Short cheers for "you solved one, but the daily goal is not met yet". The word is picked by how many problems
// are done today, so it stays the same when the screen redraws.
const CHEERS = ['Good job!', 'Awesome!', 'Nice one!'];

export function homeCopy(home) {
  const { streak, longest, todayStatus, daily, next, total } = home;

  if (next === null) {
    return { state: 'allDone', headline: `All ${total} done!`, sub: 'You finished the whole list. Amazing.', mood: 'cheering', pulse: false, lit: true };
  }
  if (todayStatus === 'solved') {
    const left = Math.max(0, daily.goal - daily.done);
    const milestone = streak > 0 && streak % 7 === 0;
    const mood = milestone ? 'cheering' : 'happy';
    if (left > 0) {
      // Streak is safe, but the daily goal is not reached yet: cheer, and say how many are left. No goodbye yet.
      const cheer = CHEERS[Math.max(0, daily.done - 1) % CHEERS.length];
      return { state: 'progress', headline: cheer, sub: `${left} more to reach today's goal.`, mood, pulse: false, lit: true };
    }
    return { state: 'done', headline: 'Done for today. See you tomorrow', sub: 'Your streak is safe.', mood, pulse: false, lit: true };
  }
  if (streak > 0) {
    // Today is still open and there is a streak to lose: Ember is sleepy and the flame pulses.
    return { state: 'keep', headline: `Solve 1 problem to keep your ${streak}-day streak`, sub: 'One problem is enough.', mood: 'sleepy', pulse: true, lit: false };
  }
  if (longest > 0) {
    // A missed day reset the streak. Kind words only.
    return { state: 'welcomeBack', headline: "Welcome back. Let's start a new streak", sub: 'One problem is enough.', mood: 'happy', pulse: false, lit: false };
  }
  return { state: 'start', headline: 'Start your streak today', sub: 'One problem is enough.', mood: 'happy', pulse: false, lit: false };
}

// The calm face of Ember (the layered mascot) for the Home numbers:
//   'happy' = the daily goal is met (or the whole list is done), null = solved something today but the goal is not met
//   yet (normal idle), 'wait' = nothing solved today, 'new' = nothing was EVER solved (looking around).
// "No history" only counts until the first problem is solved; after that "not solved today" wins.
export function emberMoodFor(home) {
  if (home.next === null && !(home.skippedCount > 0)) return 'happy'; // all done (skipped problems left is not "all done")
  if (home.daily.met) return 'happy';
  if (home.todayStatus === 'solved') return null;
  return home.solvedCount === 0 ? 'new' : 'wait';
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// First letter of the weekday for a day like '2026-03-08'.
export function weekdayLetter(day) {
  const [y, m, d] = day.split('-').map(Number);
  return LETTERS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
