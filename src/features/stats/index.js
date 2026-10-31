// Stats screen (Duolingo streak-screen style): big streak hero, then
// "heading outside, outline card inside" blocks: Streak Calendar and Progress.
// Everything comes from selectStats; the calendar grid comes from core/calendar.js.
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { buildMonthGrid, shiftMonth, compareMonths, monthTitle, monthOfDay } from '../../core/calendar.js';
import { createStreakFlame, flameStageFor } from '../../ui/flame.js';
import { statsToday, percent, monthLimits, clampMonth, nextMilestone } from './model.js';

const MAX_FREEZES = 2;
const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STATUS_WORD = { solved: 'solved', frozen: 'frozen', missed: 'missed', pending: 'not done yet' };
const COUNT_UP_MS = 650;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Numbers count up from 0 once, when the screen opens. The final value is already in the text, so nothing breaks without animation.
function countUp(el) {
  const to = Number(el.dataset.count);
  if (!Number.isFinite(to) || to <= 0 || prefersReducedMotion()) return;
  const start = performance.now();
  const step = (now) => {
    if (!el.isConnected) return;
    const t = Math.min(1, (now - start) / COUNT_UP_MS);
    const eased = 1 - (1 - t) * (1 - t);
    el.textContent = String(Math.round(to * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  el.textContent = '0';
  requestAnimationFrame(step);
}

function mount(root, ctx) {
  const { store, selectors } = ctx;

  const container = h('div', { class: 'stats' });
  root.append(container);

  let frame = null;      // pending render request
  let viewed = null;     // the month shown in the calendar: { year, month }
  let intro = true;      // the opening animation (count-up, bars filling, blocks rising) plays on the first draw only
  let introTimer = null;

  // ---------- small pieces ----------

  // ICON SWAP: these three are placeholders. Put the new trophy / freeze / calendar SVGs here (one place).
  const ART = {
    trophy: () => icon('trophy', 22),
    freeze: () => icon('snowflake', 22),
    days: () => icon('calendar', 22),
  };

  function bar(fraction, color, label) {
    const pct = percent(fraction);
    return h('div', {
      class: 'bar', role: 'progressbar', 'aria-label': label,
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct,
    }, h('div', { class: 'bar__fill', style: { width: `${pct}%`, background: color } }));
  }

  // A heading on the page (outside the card) with the card under it.
  function block(title, card) {
    return h('section', { class: 'stats-block' }, h('h2', { class: 'stats__h' }, title), card);
  }

  // Top: giant number on the left, his flame (stage by streak, dim until today is solved) on the right.
  function hero(stats, solvedToday) {
    const stage = flameStageFor(stats.streak, solvedToday);
    const sparks = stage === 'stage-2' || stage === 'stage-3'
      ? h('div', { class: 'streak-hero__sparks', 'aria-hidden': 'true' },
        h('span', { class: 'streak-hero__spark' }), h('span', { class: 'streak-hero__spark' }), h('span', { class: 'streak-hero__spark' }))
      : null;
    return h('section', { class: `stats-hero stats-hero--${stage}` },
      h('div', {
        class: `streak-hero streak-hero--${stage}${solvedToday ? '' : ' is-dim'}`, role: 'img',
        'aria-label': `${stats.streak}-day streak`, title: `${stats.streak}-day streak`,
      },
        h('div', { class: 'streak-hero__text' },
          h('span', { class: 'streak-hero__number', dataset: { count: stats.streak } }, stats.streak),
          h('span', { class: 'streak-hero__label' }, 'day streak!')),
        h('div', { class: 'streak-hero__flame' }, createStreakFlame(stage), sparks)));
  }

  // Longest / Freezes / Days: a plain row (no boxes) at the bottom of the Progress card.
  function statsRow(stats) {
    const item = (cls, iconEl, value, label, title) => h('div', { class: `stat ${cls}`, title },
      h('span', { class: 'stat__icon', 'aria-hidden': 'true' }, iconEl),
      h('span', { class: 'stat__value' }, value),
      h('span', { class: 'stat__label' }, label));
    return h('div', { class: 'stats-strip' },
      item('stat--longest', ART.trophy(), stats.longest, 'Longest', `${stats.longest}-day longest streak`),
      item('stat--freeze', ART.freeze(), `${stats.freezes}/${MAX_FREEZES}`, 'Freezes', `${stats.freezes} of ${MAX_FREEZES} streak freezes`),
      item('stat--days', ART.days(), stats.daysPracticed, stats.daysPracticed === 1 ? 'Day' : 'Days', `${stats.daysPracticed} days practiced`));
  }

  // One number, one bar, one nudge towards the next round number, then the small stats row.
  function progressCard(stats) {
    const fraction = stats.total > 0 ? stats.solvedCount / stats.total : 0;
    const next = nextMilestone(stats.solvedCount, stats.total);
    let hint = 'Every problem solved. Legend.';
    if (stats.total > 0 && stats.solvedCount === 0) hint = 'Your first solve starts the bar.';
    else if (next) hint = next.isFinish ? `${next.remaining} more to finish the sheet` : `${next.remaining} more to reach ${next.target}`;
    return h('section', { class: 'card progress' },
      h('div', { class: 'progress__top' },
        h('div', { class: 'progress__big', role: 'img', 'aria-label': `Solved ${stats.solvedCount} of ${stats.total}` },
          h('b', { dataset: { count: stats.solvedCount } }, stats.solvedCount),
          h('span', null, ` / ${stats.total}`)),
        h('span', { class: 'progress__pct' }, `${percent(fraction)}%`)),
      bar(fraction, 'var(--success)', 'Solved progress'),
      h('p', { class: 'progress__hint' }, hint),
      statsRow(stats));
  }

  // ---------- the calendar ----------

  function cellFor(cell, today) {
    if (cell === null) return h('div', { class: 'cal__pad', 'aria-hidden': 'true' });
    const classes = ['cal__cell'];
    if (cell.status === 'solved' || cell.status === 'frozen' || cell.status === 'missed') classes.push(`cal__cell--${cell.status}`);
    if (cell.isToday) classes.push('is-today');
    if (cell.day > today) classes.push('is-future');
    const word = cell.isToday && cell.status !== 'solved' ? 'today' : STATUS_WORD[cell.status] || 'no activity';
    return h('div', { class: classes.join(' '), role: 'gridcell', 'aria-label': `${cell.day}: ${word}`, dataset: { day: cell.day } },
      h('span', null, cell.date));
  }

  // One row of the month: neighbouring solved days join into one orange pill, neighbouring frozen days into one ice-tinted pill.
  function weekRow(week, today) {
    const runs = [];
    ['solved', 'frozen'].forEach((kind) => {
      let from = -1;
      week.forEach((cell, i) => {
        const match = cell !== null && cell.status === kind;
        if (match && from < 0) from = i;
        if ((!match || i === week.length - 1) && from >= 0) {
          const end = match ? i : i - 1;
          runs.push(h('span', {
            class: kind === 'frozen' ? 'cal__run cal__run--frozen' : 'cal__run',
            style: { '--from': from + 1, '--len': end - from + 1 }, 'aria-hidden': 'true',
          }));
          from = -1;
        }
      });
    });
    const cells = week.map((cell, i) => {
      const el = cellFor(cell, today);
      el.style.gridColumn = String(i + 1);
      return el;
    });
    return h('div', { class: 'cal__week' }, runs, cells);
  }

  // No legend: solved = gradient pill (flame colour), frozen = ice-tinted pill, today = ring, everything else stays quiet and grey.
  function calendar(stats, today) {
    const limits = monthLimits(stats.firstDay, today);
    viewed = clampMonth(viewed || monthOfDay(today), limits);
    const canPrev = compareMonths(viewed, limits.first) > 0;
    const canNext = compareMonths(viewed, limits.last) < 0;
    const weeks = buildMonthGrid(viewed.year, viewed.month, stats.statusByDay, today);

    // The pills take the colour of the current flame stage (same stage as the hero flame, even while today is still open).
    const stage = flameStageFor(stats.streak, true);
    return h('section', { class: `card cal cal--${stage}` },
      h('div', { class: 'cal__head' },
        h('button', {
          type: 'button', class: 'cal__nav cal__nav--prev', 'aria-label': 'Previous month',
          disabled: !canPrev, onclick: () => go(-1),
        }, '‹'),
        h('h3', { class: 'cal__title', 'aria-live': 'polite' }, monthTitle(viewed.year, viewed.month)),
        h('button', {
          type: 'button', class: 'cal__nav cal__nav--next', 'aria-label': 'Next month',
          disabled: !canNext, onclick: () => go(1),
        }, '›')),
      h('div', { class: 'cal__weekdays', 'aria-hidden': 'true' },
        WEEKDAY_LETTERS.map((letter) => h('span', null, letter))),
      h('div', { class: 'cal__grid', role: 'grid', 'aria-label': monthTitle(viewed.year, viewed.month) },
        weeks.map((week) => weekRow(week, today))));
  }

  function go(delta) {
    const state = store.get();
    const stats = selectors.selectStats(state);
    const today = statsToday(state.today, stats.statusByDay);
    const limits = monthLimits(stats.firstDay, today);
    const next = shiftMonth(viewed.year, viewed.month, delta);
    if (compareMonths(next, limits.first) < 0 || compareMonths(next, limits.last) > 0) return;
    viewed = next;
    render();
  }

  // ---------- drawing ----------

  function render() {
    frame = null;
    const state = store.get();
    const stats = selectors.selectStats(state);
    const today = statsToday(state.today, stats.statusByDay);
    const solvedToday = stats.statusByDay[today] === 'solved';
    const playIntro = intro;
    intro = false;
    container.classList.toggle('is-intro', playIntro);
    container.replaceChildren(
      h('h1', { class: 'stats__title' }, 'Stats'),
      hero(stats, solvedToday),
      block('Streak Calendar', calendar(stats, today)),
      block('Progress', progressCard(stats)));
    if (playIntro) {
      container.querySelectorAll('[data-count]').forEach(countUp);
      clearTimeout(introTimer);
      introTimer = setTimeout(() => container.classList.remove('is-intro'), 1500);
    }
  }

  // Draw on the next frame: many changes at once give one redraw.
  function scheduleRender() {
    if (frame === null) frame = requestAnimationFrame(render);
  }

  const unsubscribe = store.subscribe(scheduleRender);
  render();

  return function unmount() {
    unsubscribe();
    clearTimeout(introTimer);
  };
}

export default { id: 'stats', label: 'Stats', icon: 'stats', mount };
