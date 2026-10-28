// Home screen: open the app, solve one problem, feel rewarded, come back tomorrow.
// Layout: the top part (numbers, Ember, week) can scroll on tiny screens,
// the "Next up" card with the Solved button is always visible at the bottom.
import { h } from '../../ui/dom.js';
import { createRing } from '../../ui/ring.js';
import { createEmber } from '../../ui/ember.js';
import { showToast } from '../../ui/toast.js';
import { homeCopy, weekdayLetter } from './copy.js';
import { computeRewards } from './rewards.js';
import { soundForSolve } from '../../core/sound-events.js';
import { unlockAudio, playSound } from '../../ui/sound.js';

const MAX_FREEZES = 2;
const DOT_SYMBOL = { solved: '✓', frozen: '❄', missed: '' };

function mount(root, ctx) {
  const { store, actions, selectors } = ctx;

  root.classList.add('view--fill');
  const container = h('div', { class: 'home' });
  const fxLayer = h('div', { class: 'fx-layer', 'aria-hidden': 'true' });
  root.append(container, fxLayer);

  let busy = false;          // true while a Solved tap is being saved
  let frame = null;          // pending render request
  let prevFraction = null;   // last daily ring value, so the ring can fill smoothly
  const fx = { bounce: false, cheer: false }; // one-time effects used by the next render

  // ---------- small pieces ----------

  function chip(className, icon, value, label, { iconClass = '', title = '' } = {}) {
    return h('div', { class: `chip ${className}`, title },
      h('div', { class: 'chip__main' },
        h('span', { class: `chip__icon ${iconClass}`, 'aria-hidden': 'true' }, icon),
        h('span', { class: 'chip__value' }, value)),
      h('div', { class: 'chip__label' }, label));
  }

  function topRow(home, copy) {
    const fraction = Math.min(1, home.daily.done / home.daily.goal);
    const ring = createRing({
      size: 46, stroke: 6,
      value: prevFraction === null ? fraction : prevFraction,
      color: home.daily.met ? 'var(--green)' : 'var(--orange)',
      content: h('span', { class: 'ring__text' }, home.daily.met ? '✓' : `${home.daily.done}/${home.daily.goal}`),
    });
    if (prevFraction !== null && prevFraction !== fraction) {
      // Two frames later the browser animates the ring from the old value to the new one.
      requestAnimationFrame(() => requestAnimationFrame(() => ring.setValue(fraction)));
    }
    prevFraction = fraction;

    const flameClass = fx.bounce ? 'is-bounce' : copy.pulse ? 'is-pulse' : '';
    return h('div', { class: 'top-row' },
      chip('chip--streak', '🔥', home.streak, 'Streak', { iconClass: flameClass, title: `${home.streak}-day streak` }),
      chip('chip--freeze', '❄️', `${home.freezes}/${MAX_FREEZES}`, 'Freezes', { title: `${home.freezes} of ${MAX_FREEZES} streak freezes` }),
      chip('chip--xp', '⭐', home.xp.total, `Level ${home.xp.level}`, { title: `${home.xp.total} XP, level ${home.xp.level}` }),
      h('div', { class: 'chip chip--goal', title: `Daily goal: ${home.daily.done} of ${home.daily.goal}` },
        ring, h('div', { class: 'chip__label' }, 'Goal')));
  }

  function hero(copy) {
    const mood = fx.cheer ? 'cheering' : copy.mood;
    const emberClass = `hero__ember${copy.pulse ? ' is-pulse' : ''}${fx.bounce ? ' is-bounce' : ''}`;
    return h('div', { class: 'hero' },
      h('div', { class: emberClass }, createEmber({ mood, size: 84, lit: copy.lit })),
      h('div', { class: 'hero__text' },
        h('h1', { class: 'hero__title' }, copy.headline),
        h('p', { class: 'hero__sub' }, copy.sub)));
  }

  function weekStrip(home) {
    return h('div', { class: 'week', role: 'list', 'aria-label': 'Last 7 days' },
      home.week.map((d) => {
        let kind = 'empty';
        if (d.isToday && d.status !== 'solved') kind = 'today';
        else if (d.status === 'solved') kind = 'solved';
        else if (d.status === 'frozen') kind = 'frozen';
        else if (d.status === 'missed') kind = 'missed';
        const label = `${d.day}: ${d.isToday && d.status !== 'solved' ? 'today' : d.status || 'no activity'}`;
        return h('div', { class: `day${d.isToday ? ' is-today' : ''}`, role: 'listitem', 'aria-label': label },
          h('span', { class: 'day__letter' }, weekdayLetter(d.day)),
          h('span', { class: `dot dot--${kind}` }, DOT_SYMBOL[kind] || ''));
      }));
  }

  function backupBanner() {
    return h('a', { class: 'banner', href: '#/settings' },
      h('span', null, '💾 Time to back up your progress'), h('span', { 'aria-hidden': 'true' }, '→'));
  }

  function nextCard(home, copy) {
    if (home.next === null) {
      return h('section', { class: 'card next next--finished' },
        h('div', { class: 'label' }, 'Finished'),
        h('h2', { class: 'next__title' }, `All ${home.total} problems done 🎉`),
        h('p', { class: 'next__hint' }, 'You did the whole list. Be proud.'));
    }
    const problem = home.next.problem;
    const done = copy.state === 'done';
    return h('section', { class: 'card next' },
      h('div', { class: 'next__head' },
        h('div', { class: 'label' }, 'Next up'),
        problem.difficulty
          ? h('span', { class: `tag tag--${problem.difficulty.toLowerCase()}` }, problem.difficulty)
          : null),
      h('div', { class: 'next__meta' },
        h('span', { class: 'next__where' }, `${home.next.topic} · ${problem.subsection}`),
        h('span', { class: 'next__num' }, `#${problem.id} of ${home.total}`)),
      h('h2', { class: 'next__title' }, problem.title),
      h('p', { class: 'next__hint' }, 'Solve it on takeUforward, then tap Solved.'),
      h('button', {
        type: 'button',
        class: done ? 'btn btn--ghost btn--block' : 'btn btn--green btn--block',
        onclick: () => onSolved(problem),
      }, done ? 'Solved one more' : 'Solved'));
  }

  // ---------- drawing ----------

  function render() {
    frame = null;
    const home = selectors.selectHome(store.get());
    const copy = homeCopy(home);
    container.replaceChildren(
      h('div', { class: 'home__scroll' },
        topRow(home, copy),
        home.backupReminder ? backupBanner() : null,
        hero(copy),
        weekStrip(home)),
      nextCard(home, copy));
    // One-time effects have been used now.
    fx.bounce = false;
  }

  // Draw on the next frame: many changes at once give one redraw.
  function scheduleRender() {
    if (frame === null) frame = requestAnimationFrame(render);
  }

  // ---------- the Solved tap ----------

  function floatXp() {
    const el = h('div', { class: 'xp-float' }, '+10 XP');
    fxLayer.append(el);
    setTimeout(() => el.remove(), 1300);
  }

  async function onSolved(problem) {
    if (busy) return;
    busy = true;
    unlockAudio(); // phones only allow sound that starts from a tap, so do it before any waiting
    try {
      const before = selectors.selectHome(store.get());
      fx.cheer = false;
      const solve = await actions.markSolved(problem.id);
      if (!solve) return;
      const after = selectors.selectHome(store.get());
      const solvedIds = new Set(store.get().solves.map((s) => s.problemId));
      const rewards = computeRewards({ before, after, problem, solvedIds });

      fx.bounce = true;
      fx.cheer = rewards.cheer;
      playSound(soundForSolve({ before, after, problem, solvedIds }), store.get().settings.soundOn !== false);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(20);
      floatXp();
      for (const text of rewards.messages) showToast({ message: text, variant: 'reward', duration: 3500 });
      showToast({
        message: `Marked #${problem.id} solved`,
        actionLabel: 'Undo',
        duration: 6000,
        onAction: () => { fx.cheer = false; actions.unmarkSolved(problem.id); },
      });
      scheduleRender();
    } catch (error) {
      console.error(error);
      showToast({ message: 'Could not save. Please try again.', duration: 4000 });
    } finally {
      busy = false;
    }
  }

  const unsubscribe = store.subscribe(scheduleRender);
  render();

  return function unmount() {
    unsubscribe();
    root.classList.remove('view--fill');
  };
}

export default { id: 'home', label: 'Home', icon: '🏠', mount };
