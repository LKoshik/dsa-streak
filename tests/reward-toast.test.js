import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, byClass } from './helpers/fake-dom.js';
import { rewardView, showRewardToast } from '../src/ui/reward-toast.js';
import { showToast } from '../src/ui/toast.js';

test('rewardView: each celebration emoji becomes an icon name and is taken off the text', () => {
  assert.deepEqual(rewardView('🎯 +5 daily goal reached'), { icon: 'goal', text: '+5 daily goal reached' });
  assert.deepEqual(rewardView('❄️ Freeze earned'), { icon: 'snowflake', text: 'Freeze earned' });
  assert.deepEqual(rewardView('🔥 Streak started'), { icon: 'flame', text: 'Streak started' });
  assert.deepEqual(rewardView('🔥 7-day streak'), { icon: 'flame', text: '7-day streak' });
  assert.deepEqual(rewardView('⭐ Level 4'), { icon: 'xp', text: 'Level 4' });
  assert.deepEqual(rewardView('🏆 Topic finished: Maths'), { icon: 'trophy', text: 'Topic finished: Maths' });
  assert.deepEqual(rewardView('✅ Section finished: Theory'), { icon: 'check', text: 'Section finished: Theory' });
});

test('rewardView: text without an emoji is left alone', () => {
  assert.deepEqual(rewardView('Backup saved to your downloads.'), { icon: null, text: 'Backup saved to your downloads.' });
  assert.deepEqual(rewardView('Level up'), { icon: null, text: 'Level up' });
});

test('showRewardToast: a reward toast with the drawn icon before the text', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const dom = installFakeDom();
  const host = document.createElement('div');
  dom.body.append(host);
  showRewardToast('🏆 Topic finished: Arrays', { host });
  const toast = host.children[0];
  assert.ok(toast.classList.contains('toast--reward'));
  assert.equal(byClass(toast, 'toast__icon').length, 1);
  assert.equal(byClass(toast, 'icon--trophy').length, 1);
  assert.equal(byClass(toast, 'toast__text')[0].textContent, 'Topic finished: Arrays');
  // No emoji left in the toast at all.
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(toast.textContent));
  dom.restore();
  mock.timers.reset();
});

test('showToast: no icon, no icon slot', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const dom = installFakeDom();
  const host = document.createElement('div');
  dom.body.append(host);
  showToast({ message: 'Hello', host });
  assert.equal(byClass(host, 'toast__icon').length, 0);
  dom.restore();
  mock.timers.reset();
});
