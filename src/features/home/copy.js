// The words and mood for the Home screen (pure code, easy to test).

// Picks the headline, the small line under it, Ember's mood and whether the flame pulses.
//   state: 'start' | 'keep' | 'done' | 'welcomeBack' | 'allDone'
export function homeCopy(home) {
  const { streak, longest, todayStatus, daily, next, total } = home;

  if (next === null) {
    return { state: 'allDone', headline: `All ${total} done!`, sub: 'You finished the whole list. Amazing.', mood: 'cheering', pulse: false, lit: true };
  }
  if (todayStatus === 'solved') {
    const left = Math.max(0, daily.goal - daily.done);
    const milestone = streak > 0 && streak % 7 === 0;
    return {
      state: 'done',
      headline: 'Done for today. See you tomorrow',
      sub: left > 0 ? `${left} more to reach today's goal.` : 'Your streak is safe.',
      mood: milestone ? 'cheering' : 'happy',
      pulse: false,
      lit: true,
    };
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

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// First letter of the weekday for a day like '2026-03-08'.
export function weekdayLetter(day) {
  const [y, m, d] = day.split('-').map(Number);
  return LETTERS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
