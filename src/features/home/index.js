// Home screen: open the app, solve one problem, feel rewarded, come back tomorrow.
// Layout: header pills (freezes, XP, daily goal; each opens a short explanation), then the streak, Ember and the
// week bar (this part can scroll on tiny screens), and the "Next up" card with the Solved button, always visible
// at the bottom. After Solved the SAME card turns into a gold "Solved" card (rewards, Undo, Next problem), so
// nothing covers the streak.
import { h } from '../../ui/dom.js';
import { createRing } from '../../ui/ring.js';
import { createEmber, setEmberMood, cheerEmber, waveEmber } from '../../ui/ember.js';
import { icon } from '../../ui/icons.js';
import { createStreakFlame, flameStageFor } from '../../ui/flame.js';
import { openSheet } from '../../ui/sheet.js';
import { showToast } from '../../ui/toast.js';
import { rewardView } from '../../ui/reward-toast.js';
import { homeCopy, emberMoodFor, weekdayLetter } from './copy.js';
import { computeRewards } from './rewards.js';
import { topicHue } from '../path/model.js';
import { levelFromXp } from '../../core/xp.js';
import { addDays } from '../../core/dates.js';
import { soundForSolve } from '../../core/sound-events.js';
import { unlockAudio, playSound } from '../../ui/sound.js';

const MAX_FREEZES = 2;
const UPCOMING = 2;        // empty days shown after today in the week bar, so the bar is never full
const SWAP_MS = 200;       // the card slides out, then the next one slides in
const ARM_MS = 600;        // "Next problem" wakes up a moment after Solved, so a fast double tap cannot skip past

// Ember waves once each time the app is opened, not every time you come back to Home.
let wavedThisOpen = false;

function mount(root, ctx) {
  const { store, actions, selectors } = ctx;

  root.classList.add('view--fill');
  const container = h('div', { class: 'home' });
  root.append(container);

  // Messages ("Skipped #7" + Undo, save errors) show here: in the free space just ABOVE the Next-up card,
  // so they never sit on top of the Solved button. Made once, so redraws do not throw them away.
  const toastHost = h('div', { class: 'toasts toasts--inline', role: 'status', 'aria-live': 'polite' });
  const toastAnchor = h('div', { class: 'home__toast-anchor' }, toastHost);

  // ONE Ember for this screen. Every redraw moves the same element into the new layout,
  // so its idle animation (float, blink) keeps running and a celebration is not cut off.
  const ember = createEmber({ label: 'Ember' });

  let busy = false;          // true while a tap is being saved or a card is sliding
  let frame = null;          // pending render request
  let prevFraction = null;   // last daily ring value, so the ring can fill smoothly
  let celebrating = null;    // after Solved: the card shows the success state until Next problem / Undo
  // One-time effects used by the next render. bounce = Ember (every solve); streak = flame, number and
  // week bar (only the FIRST solve of the day, when the streak actually grows).
  const fx = { bounce: false, streak: false, cheer: false, enter: false, pop: false };

  // ---------- header: three pill cards, each opens a short explanation ----------

  function infoSheet({ hue, label, title, subtitle, lines, extra }) {
    const close = () => sheet.close();
    const sheet = openSheet({
      hue, label, title, subtitle,
      body: [...lines.map((t) => h('p', { class: 'sheet__text' }, t)), extra ? extra(close) : null].filter(Boolean),
      footer: h('button', { type: 'button', class: 'btn btn--green btn--block', onclick: close }, 'Got it'),
    });
  }

  function pill(kind, { top, label, bar, title, met = false, onTap }) {
    return h('button', { type: 'button', class: `pill pill--${kind}${met ? ' is-met' : ''}`, 'aria-label': title, onclick: onTap },
      h('div', { class: 'pill__top' }, top),
      h('div', { class: 'pill__label' }, label),
      bar === undefined ? null : h('div', { class: 'pill__bar', 'aria-hidden': 'true' }, h('i', { style: { '--p': String(bar) } })));
  }

  async function pickGoal(n, close) {
    close();
    try {
      await actions.setGoal(n);
    } catch (error) {
      console.error(error);
      showToast({ message: 'Could not save the goal. Try again.', duration: 4000, host: toastHost });
    }
  }

  function topRow(home) {
    const lv = levelFromXp(home.xp.total);
    const { done, goal, met } = home.daily;
    const fraction = Math.min(1, done / goal);
    const ring = createRing({
      size: 40, stroke: 6,
      value: prevFraction === null ? fraction : prevFraction,
      color: met ? 'var(--green)' : 'var(--orange)',
      content: met ? h('span', { class: 'ring__text ring__text--done' }, icon('check', 20)) : h('span', { class: 'ring__text' }, `${done}/${goal}`),
    });
    if (prevFraction !== null && prevFraction !== fraction) {
      // Two frames later the browser animates the ring from the old value to the new one.
      requestAnimationFrame(() => requestAnimationFrame(() => ring.setValue(fraction)));
    }
    prevFraction = fraction;

    return h('div', { class: 'top-row' },
      pill('freeze', {
        top: [icon('snowflake', 26), `${home.freezes}/${MAX_FREEZES}`], label: 'Freezes', title: `${home.freezes} of ${MAX_FREEZES} streak freezes`,
        onTap: () => infoSheet({
          hue: 'blue', label: 'Streak freezes', title: `${home.freezes} of ${MAX_FREEZES} freezes`,
          subtitle: 'A freeze protects your streak if you miss a day.',
          lines: ['You earn 1 freeze for every 7 days of streak, and can hold up to 2.', 'A freeze is used automatically on a day you miss.'],
        }),
      }),
      pill('xp', {
        top: [icon('xp', 26), home.xp.total], label: `Level ${lv.level}`, bar: lv.fraction, title: `${home.xp.total} XP, level ${lv.level}`,
        onTap: () => infoSheet({
          hue: 'purple', label: 'Level', title: `Level ${lv.level}`, subtitle: `${lv.xpIntoLevel} / ${lv.xpForNext} XP to Level ${lv.level + 1}`,
          lines: ['Every solved problem gives 10 XP. Reaching your daily goal gives a 5 XP bonus.'],
          extra: () => h('div', { class: 'level-bar', 'aria-hidden': 'true' }, h('i', { style: { '--p': String(lv.fraction) } })),
        }),
      }),
      pill('goal', {
        top: ring, label: 'Daily goal', met, title: `Daily goal: ${done} of ${goal}`,
        onTap: () => infoSheet({
          hue: 'green', label: 'Daily goal', title: `${done} of ${goal} today`, subtitle: 'Your goal never affects your streak. It only earns bonus XP.',
          lines: ['Problems per day:'],
          extra: (close) => h('div', { class: 'goal-pick' }, [1, 2, 3].map((n) =>
            h('button', { type: 'button', class: `btn ${n === goal ? 'btn--green' : 'btn--ghost'}`, onclick: () => pickGoal(n, close) }, n))),
        }),
      }));
  }

  // ---------- streak, Ember, week ----------

  // The big streak: a large flame and number. The flame flickers when today is done, throws sparks from a
  // 7-day streak on, and is dim and slow while today is still open. It grows with the streak (3 stages).
  function streakHero(home, copy) {
    const solvedToday = home.todayStatus === 'solved';
    const stage = flameStageFor(home.streak, solvedToday);
    const motion = fx.streak ? ' is-bounce' : copy.pulse ? ' is-pulse' : '';
    const sparks = stage === 'stage-2' || stage === 'stage-3'
      ? h('div', { class: 'streak-hero__sparks', 'aria-hidden': 'true' },
        h('span', { class: 'streak-hero__spark' }), h('span', { class: 'streak-hero__spark' }), h('span', { class: 'streak-hero__spark' }))
      : null;
    return h('div', {
      class: `streak-hero streak-hero--${stage}${solvedToday ? '' : ' is-dim'}`,
      role: 'img',
      'aria-label': `${home.streak}-day streak`,
      title: `${home.streak}-day streak`,
    },
      h('div', { class: `streak-hero__flame${motion}` }, createStreakFlame(stage), sparks),
      h('div', { class: 'streak-hero__text' },
        h('span', { class: `streak-hero__number${fx.streak ? ' is-bounce' : ''}` }, home.streak),
        h('span', { class: 'streak-hero__label' }, 'day streak')));
  }

  function hero(copy) {
    return h('div', { class: 'hero' },
      h('div', { class: `hero__ember${fx.bounce ? ' is-bounce' : ''}` }, ember),
      h('div', { class: 'hero__text' },
        h('h1', { class: 'hero__title' }, copy.headline),
        h('p', { class: 'hero__sub' }, copy.sub)));
  }

  // The bar shows the last few days, today, and UPCOMING empty days after it, so it is never a full bar.
  // It is built from home.week (7 days ending today), so selectHome does not need to know about this.
  function weekStrip(home) {
    const past = home.week.slice(UPCOMING);
    const todayIndex = past.length - 1;
    const future = Array.from({ length: UPCOMING }, (_, i) => ({ day: addDays(past[todayIndex].day, i + 1), status: null, isToday: false, future: true }));
    const week = [...past, ...future];
    // Neighbouring SOLVED days join into ONE pill (a run); a gap in the streak starts a new pill.
    const runs = [];
    week.forEach((d, index) => {
      if (d.status !== 'solved') return;
      const last = runs[runs.length - 1];
      if (last && last.to === index - 1) last.to = index;
      else runs.push({ from: index, to: index });
    });
    const pills = runs.map((run) => h('div', {
      class: `week__run${fx.streak && run.to === todayIndex ? ' is-fresh' : ''}`,
      'aria-hidden': 'true',
      style: { '--from': String(run.from + 1), '--len': String(run.to - run.from + 1) },
    }));
    const days = week.map((d, index) => {
      let kind = 'empty';
      if (d.future) kind = 'future';
      else if (d.isToday && d.status !== 'solved') kind = 'today';
      else if (d.status === 'solved') kind = 'solved';
      else if (d.status === 'frozen') kind = 'frozen';
      else if (d.status === 'missed') kind = 'missed';
      const label = `${d.day}: ${d.future ? 'upcoming' : d.isToday && d.status !== 'solved' ? 'today' : d.status || 'no activity'}`;
      return h('div', { class: `day${d.isToday ? ' is-today' : ''}${d.future ? ' is-future' : ''}`, role: 'listitem', 'aria-label': label, style: { '--col': String(index + 1) } },
        h('span', { class: 'day__letter' }, weekdayLetter(d.day)),
        h('span', { class: `dot dot--${kind}` }, kind === 'solved' ? icon('check', 20) : kind === 'frozen' ? icon('snowflake', 16) : null));
    });
    return h('div', { class: 'week', role: 'list', 'aria-label': 'Days of this streak' }, pills, days);
  }

  function backupBanner() {
    return h('a', { class: 'banner', href: '#/settings' },
      h('span', { class: 'banner__text' }, icon('backup', 20), 'Time to back up your progress'),
      icon('arrow-right', 20));
  }

  // ---------- the Next up card: normal state and "just solved" state ----------

  // Progress of the current section: a rounded bar with its count beside it (same spot in both card states).
  const progress = (from, to, count, title) => h('div', { class: 'next2__progress' },
    h('div', { class: 'next2__strip', 'aria-hidden': 'true' }, h('i', { style: { '--p': String(to), '--from': String(from) } })),
    h('span', { class: 'next2__count', title }, count));

  function nextCard(home) {
    if (celebrating) return solvedCard(home);
    if (home.next === null && home.skippedCount > 0) {
      const count = home.skippedCount;
      return h('section', { class: 'card next next--finished' },
        h('div', { class: 'label' }, 'Skipped'),
        h('h2', { class: 'next__title' }, `Only ${count} skipped problem${count === 1 ? '' : 's'} left`),
        h('p', { class: 'next__hint' }, 'Open the Path and tap "Continue here" on one to go back to it.'));
    }
    if (home.next === null) {
      return h('section', { class: 'card next next--finished' },
        h('div', { class: 'label' }, 'Finished'),
        h('h2', { class: 'next__title' }, `All ${home.total} problems done 🎉`),
        h('p', { class: 'next__hint' }, 'You did the whole list. Be proud.'));
    }
    const n = home.next;
    const p = n.problem;
    const bonus = home.daily.met;                                  // goal already met: this is a bonus round
    const completesGoal = !bonus && home.daily.done + 1 >= home.daily.goal;
    const frac = n.subTotal ? n.subDone / n.subTotal : 0;
    return h('section', { class: `card next2 topic topic--${topicHue(n.topicIndex)}${fx.enter ? ' is-enter' : ''}` },
      h('div', { class: 'next2__band' },
        h('span', { class: 'next2__label' }, bonus ? 'Bonus round' : 'Next up'),
        h('span', { class: `xp-chip${completesGoal ? ' xp-chip--goal' : ''}`, title: completesGoal ? '10 XP + 5 goal bonus' : '10 XP' },
          icon(completesGoal ? 'goal' : 'xp', 16), completesGoal ? '+15 XP' : '+10 XP')),
      h('div', { class: 'next2__body' },
        h('h2', { class: 'next2__title' }, p.title),
        h('div', { class: 'next2__meta' },
          p.difficulty ? h('span', { class: `tag tag--${p.difficulty.toLowerCase()}` }, p.difficulty) : null,
          h('span', { class: 'next2__where' }, `${n.topic} · ${p.subsection}`)),
        progress(frac, frac, `${n.subDone}/${n.subTotal}`, `${n.subDone} of ${n.subTotal} solved in ${p.subsection}`),
        h('div', { class: 'next2__actions' },
          h('button', { type: 'button', class: 'btn-text', 'aria-label': `Skip #${p.id} for now`, onclick: () => onSkip(p) }, 'Skip'),
          h('button', { type: 'button', class: `btn ${bonus ? 'btn--blue' : 'btn--green'} next2__solved`, onclick: () => onSolved(p) }, bonus ? 'Solved one more' : 'Solved'))));
  }

  // The card stays the same size and in the same place; only its content changes, so nothing covers the streak.
  function solvedCard(home) {
    const c = celebrating;
    const next = h('button', { type: 'button', class: 'btn btn--green next2__solved', onclick: onNext }, home.next ? 'Next problem' : 'Continue');
    if (!c.armed) {            // the button sits where Solved was: wait a moment so a fast double tap cannot skip past
      next.disabled = true;
      setTimeout(() => { c.armed = true; next.disabled = false; }, ARM_MS);
    }
    // Chips are short so the usual rewards fit on ONE line (a second row would make the card taller than the Next up card).
    const short = (text) => text.replace(/^\+5 daily goal reached$/, '+5 goal');
    const chips = [[icon('xp', 14), '+10 XP'], ...c.messages.map((m) => {
      const view = rewardView(m);
      return [view.icon ? icon(view.icon, 14) : null, short(view.text)].filter(Boolean);
    })];
    return h('section', { class: `card next2 next2--done topic${fx.pop ? ' is-pop' : ''}` },
      h('div', { class: 'next2__band' }, h('span', { class: 'next2__label' }, icon('check', 16), 'Solved')),
      h('div', { class: 'next2__body' },
        h('h2', { class: 'next2__title' }, c.problem.title),
        h('div', { class: 'reward-row' }, chips.map((t, i) => h('span', { class: `reward-chip${i === 0 ? ' reward-chip--xp' : ''}`, style: { '--i': String(i) } }, t))),
        progress(c.sub.from, c.sub.done / c.sub.total, `${c.sub.done}/${c.sub.total}`, `${c.sub.done} of ${c.sub.total} solved`),
        h('div', { class: 'next2__actions' }, h('button', { type: 'button', class: 'btn-text', onclick: onUndo }, 'Undo'), next)));
  }

  // ---------- drawing ----------

  function render() {
    frame = null;
    const home = selectors.selectHome(store.get());
    const copy = homeCopy(home);
    container.replaceChildren(
      topRow(home),
      h('div', { class: 'home__scroll' },
        home.backupReminder ? backupBanner() : null,
        streakHero(home, copy),
        hero(copy),
        weekStrip(home)),
      toastAnchor,
      nextCard(home));
    applyEmber(home);
    // One-time effects have been used now.
    fx.bounce = false; fx.streak = false; fx.enter = false; fx.pop = false;
  }

  // Ember's face: a one-shot celebration when asked, otherwise the calm face for today.
  // While a celebration is playing the face is left alone (the celebration ends in the calm happy face).
  function applyEmber(home) {
    if (fx.cheer) {
      fx.cheer = false;
      cheerEmber(ember);
      return;
    }
    if (ember.classList.contains('is-cheer')) return;
    setEmberMood(ember, emberMoodFor(home));
  }

  // Draw on the next frame: many changes at once give one redraw.
  function scheduleRender() {
    if (frame === null) frame = requestAnimationFrame(render);
  }

  const saveFailed = (error) => {
    console.error(error);
    showToast({ message: 'Could not save. Please try again.', duration: 4000, host: toastHost });
  };

  // Slides the current card out (the caller then draws the next one, which slides in).
  function slideOut() {
    const card = container.querySelector('.next2');
    if (card) card.classList.add('is-leaving');
  }

  // ---------- the Solved tap ----------

  async function onSolved(problem) {
    if (busy || celebrating) return;
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
      const n = before.next;

      celebrating = {
        problem, messages: rewards.messages, armed: false,
        sub: { from: n.subTotal ? n.subDone / n.subTotal : 0, done: n.subDone + 1, total: n.subTotal },
      };
      fx.bounce = true; fx.pop = true;
      fx.streak = before.todayStatus !== 'solved';  // the streak only "grows" for the first problem of the day
      fx.cheer = rewards.cheer || (!before.daily.met && after.daily.met);
      playSound(soundForSolve({ before, after, problem, solvedIds }), store.get().settings.soundOn !== false);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(20);
      scheduleRender();
    } catch (error) {
      saveFailed(error);
    } finally {
      busy = false;
    }
  }

  // "Next problem": the gold card slides out and the next problem slides in.
  function onNext() {
    if (busy || !celebrating || !celebrating.armed) return;
    busy = true;
    slideOut();
    setTimeout(() => {
      celebrating = null;
      fx.enter = true;
      busy = false;
      scheduleRender();
    }, SWAP_MS);
  }

  // Undo on the gold card: the solve is taken back and the problem is Next up again.
  async function onUndo() {
    if (busy || !celebrating) return;
    busy = true;
    const { problem } = celebrating;
    try {
      await actions.unmarkSolved(problem.id);
      celebrating = null;
      fx.cheer = false;
      ember.classList.remove('is-cheer'); // an undone solve must not keep celebrating
      fx.enter = true;
      scheduleRender();
    } catch (error) {
      saveFailed(error);
    } finally {
      busy = false;
    }
  }

  // ---------- the Skip tap ----------

  async function onSkip(problem) {
    if (busy || celebrating) return;
    busy = true;
    try {
      const saved = await actions.skipProblem(problem.id);
      if (!saved) return;
      toastHost.replaceChildren();                                   // one message at a time
      showToast({
        message: `Skipped #${problem.id}`,
        actionLabel: 'Undo',
        duration: 6000,
        host: toastHost,
        onAction: () => { fx.enter = true; actions.unskipProblem(problem.id); },
      });
      fx.enter = true;
      scheduleRender();
    } catch (error) {
      saveFailed(error);
    } finally {
      busy = false;
    }
  }

  const unsubscribe = store.subscribe(scheduleRender);
  render();
  if (!wavedThisOpen) {
    wavedThisOpen = true;
    waveEmber(ember);
  }

  return function unmount() {
    unsubscribe();
    root.classList.remove('view--fill');
  };
}

export default { id: 'home', label: 'Home', icon: 'home', mount };
