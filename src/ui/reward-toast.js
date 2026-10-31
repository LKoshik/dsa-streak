// Celebration messages ("Level 4", "Freeze earned"...). computeRewards() writes each message with an emoji in
// front; this turns the emoji into a drawn icon, so the toast looks the same on every phone.
//   rewardView('🎯 +5 daily goal reached') -> { icon: 'goal', text: '+5 daily goal reached' }
//   showRewardToast(text, { host, duration }) -> close function
import { icon } from './icons.js';
import { showToast } from './toast.js';

const EMOJI_ICON = { '🎯': 'goal', '❄': 'snowflake', '🔥': 'flame', '⭐': 'xp', '🏆': 'trophy', '✅': 'check' };
const LEADING_EMOJI = /^(\p{Extended_Pictographic})\uFE0F?\s*/u;

export function rewardView(text) {
  const match = LEADING_EMOJI.exec(text);
  if (!match) return { icon: null, text };
  return { icon: EMOJI_ICON[match[1]] || null, text: text.slice(match[0].length) };
}

export function showRewardToast(text, { host = null, duration = 3500 } = {}) {
  const view = rewardView(text);
  return showToast({ message: view.text, variant: 'reward', duration, host, icon: view.icon ? icon(view.icon, 24) : null });
}
