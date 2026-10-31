import test from 'node:test';
import assert from 'node:assert/strict';
import { homeCopy, weekdayLetter } from '../src/features/home/copy.js';

const base = {
  streak: 0, longest: 0, freezes: 0, todayStatus: 'pending',
  daily: { done: 0, goal: 1, met: false },
  next: { problem: { id: 1 }, topic: 'Arrays' }, total: 405,
};
const home = (patch) => ({ ...base, ...patch });

test('(a) streak 0 and never solved: start your streak', () => {
  const c = homeCopy(home({}));
  assert.equal(c.state, 'start');
  assert.equal(c.headline, 'Start your streak today');
  assert.equal(c.sub, 'One problem is enough.');
  assert.equal(c.mood, 'happy');
  assert.equal(c.pulse, false);
});

test('(b) streak above 0 and today pending: keep your N-day streak, sleepy Ember, pulsing flame', () => {
  const c = homeCopy(home({ streak: 5, longest: 5 }));
  assert.equal(c.state, 'keep');
  assert.equal(c.headline, 'Solve 1 problem to keep your 5-day streak');
  assert.equal(c.mood, 'sleepy');
  assert.equal(c.pulse, true);
});

test('(c) today done: done message, happy lit Ember', () => {
  const c = homeCopy(home({ streak: 5, longest: 5, todayStatus: 'solved', daily: { done: 1, goal: 1, met: true } }));
  assert.equal(c.state, 'done');
  assert.equal(c.headline, 'Done for today. See you tomorrow');
  assert.equal(c.mood, 'happy');
  assert.equal(c.lit, true);
  assert.equal(c.pulse, false);
});

test('(c) goal not reached yet says how many more', () => {
  const c = homeCopy(home({ streak: 1, longest: 1, todayStatus: 'solved', daily: { done: 1, goal: 3, met: false } }));
  assert.equal(c.sub, "2 more to reach today's goal.");
});

test('(c) milestone streak: cheering', () => {
  const c = homeCopy(home({ streak: 7, longest: 7, todayStatus: 'solved', daily: { done: 1, goal: 1, met: true } }));
  assert.equal(c.mood, 'cheering');
});

test('(d) after a missed day: kind wording, no shaming', () => {
  const c = homeCopy(home({ streak: 0, longest: 9 }));
  assert.equal(c.state, 'welcomeBack');
  assert.equal(c.headline, "Welcome back. Let's start a new streak");
  assert.equal(c.sub, 'One problem is enough.');
  assert.doesNotMatch(c.headline + c.sub, /miss|lost|fail|broke/i);
});

test('everything solved', () => {
  const c = homeCopy(home({ next: null, streak: 3, todayStatus: 'solved' }));
  assert.equal(c.state, 'allDone');
  assert.equal(c.headline, 'All 405 done!');
  assert.equal(c.mood, 'cheering');
});

test('weekdayLetter', () => {
  assert.equal(weekdayLetter('2026-10-26'), 'M'); // a Monday
  assert.equal(weekdayLetter('2026-10-27'), 'T');
  assert.equal(weekdayLetter('2026-10-28'), 'W');
  assert.equal(weekdayLetter('2026-10-29'), 'T');
  assert.equal(weekdayLetter('2026-10-30'), 'F');
  assert.equal(weekdayLetter('2026-10-31'), 'S');
  assert.equal(weekdayLetter('2026-11-01'), 'S');
});

import { emberMoodFor } from '../src/features/home/copy.js';

test('emberMoodFor: the calm face for each situation', () => {
  const mood = (patch) => emberMoodFor({ next: {}, daily: { met: false }, todayStatus: 'pending', solvedCount: 5, ...patch });
  assert.equal(mood({}), 'wait');                                        // solved before, nothing today
  assert.equal(mood({ solvedCount: 0 }), 'new');                         // never solved anything
  assert.equal(mood({ todayStatus: 'solved' }), null);                   // solved today, goal not met: normal idle
  assert.equal(mood({ todayStatus: 'solved', daily: { met: true } }), 'happy');
  assert.equal(mood({ next: null }), 'happy');                           // whole list done
  assert.equal(mood({ solvedCount: 0, todayStatus: 'solved' }), null);   // the first solve ends "new"
});
