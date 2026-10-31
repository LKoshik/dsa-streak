// Stats screen: streak tiles, solved progress, XP and level, days practiced, and a month calendar.
// Everything comes from selectStats; the calendar grid comes from core/calendar.js.
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { buildMonthGrid, shiftMonth, compareMonths, monthTitle, monthOfDay } from '../../core/calendar.js';
import { statsToday, percent, monthLimits, clampMonth } from './model.js';

const MAX_FREEZES = 2;
const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STATUS_WORD = { solved: 'solved', frozen: 'frozen', missed: 'missed', pending: 'not done yet' };

function mount(root, ctx) {
  const { store, selectors } = ctx;

  const container = h('div', { class: 'stats' });
  root.append(container);

  let frame = null;      // pending render request
  let viewed = null;     // the month shown in the calendar: { year, month }

  // ---------- small pieces ----------

  function tile(className, iconEl, value, label, title) {
    return h('div', { class: `card tile ${className}`, title },
      h('div', { class: 'tile__main' },
        h('span', { class: 'tile__icon', 'aria-hidden': 'true' }, iconEl),
        h('span', { class: 'tile__value' }, value)),
      h('div', { class: 'tile__label' }, label));
  }

  function bar(fraction, color, label) {
    const pct = percent(fraction);
    return h('div', {
      class: 'bar', role: 'progressbar', 'aria-label': label,
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct,
    }, h('div', { class: 'bar__fill', style: { width: `${pct}%`, background: color } }));
  }

  function tiles(stats) {
    return h('div', { class: 'tiles' },
      tile('tile--streak', icon('flame', 20), stats.streak, 'Current streak', `${stats.streak}-day current streak`),
      tile('tile--longest', icon('trophy', 20), stats.longest, 'Longest streak', `${stats.longest}-day longest streak`),
      tile('tile--freeze', icon('snowflake', 20), `${stats.freezes}/${MAX_FREEZES}`, 'Freezes', `${stats.freezes} of ${MAX_FREEZES} streak freezes`));
  }

  function solvedCard(stats) {
    const fraction = stats.total > 0 ? stats.solvedCount / stats.total : 0;
    return h('section', { class: 'card stat-card stat-card--solved' },
      h('div', { class: 'stat-card__head' },
        h('div', { class: 'label' }, 'Solved'),
        h('span', { class: 'stat-card__pct' }, `${percent(fraction)}%`)),
      h('div', { class: 'stat-card__big' }, `Solved ${stats.solvedCount} of ${stats.total}`),
      bar(fraction, 'var(--green)', 'Problems solved'));
  }

  function xpCard(stats) {
    const { total, level, xpIntoLevel, xpForNext, fraction } = stats.xp;
    return h('section', { class: 'card stat-card stat-card--xp' },
      h('div', { class: 'stat-card__head' },
        h('div', { class: 'label' }, 'XP'),
        h('span', { class: 'stat-card__pct stat-card__level' }, `Level ${level}`)),
      h('div', { class: 'stat-card__big stat-card__big--xp' },
        h('span', { class: 'stat-card__icon', 'aria-hidden': 'true' }, icon('xp', 24)),
        `${total} XP`),
      bar(fraction, '#ffc800', `Progress to level ${level + 1}`),
      h('p', { class: 'stat-card__hint' }, `${xpForNext - xpIntoLevel} XP to Level ${level + 1}`));
  }

  function practicedCard(stats) {
    return h('section', { class: 'card stat-card stat-card--days' },
      h('div', { class: 'label' }, 'Days practiced'),
      h('div', { class: 'stat-card__big stat-card__big--days' },
        h('span', { class: 'stat-card__icon', 'aria-hidden': 'true' }, icon('calendar', 24)),
        `${stats.daysPracticed} ${stats.daysPracticed === 1 ? 'day' : 'days'}`));
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

  function legendItem(kind, text) {
    return h('li', { class: 'legend__item' }, h('span', { class: `legend__swatch legend__swatch--${kind}`, 'aria-hidden': 'true' }), text);
  }

  function calendar(stats, today) {
    const limits = monthLimits(stats.firstDay, today);
    viewed = clampMonth(viewed || monthOfDay(today), limits);
    const canPrev = compareMonths(viewed, limits.first) > 0;
    const canNext = compareMonths(viewed, limits.last) < 0;
    const weeks = buildMonthGrid(viewed.year, viewed.month, stats.statusByDay, today);

    return h('section', { class: 'card cal' },
      h('div', { class: 'cal__head' },
        h('button', {
          type: 'button', class: 'cal__nav cal__nav--prev', 'aria-label': 'Previous month',
          disabled: !canPrev, onclick: () => go(-1),
        }, '‹'),
        h('h2', { class: 'cal__title', 'aria-live': 'polite' }, monthTitle(viewed.year, viewed.month)),
        h('button', {
          type: 'button', class: 'cal__nav cal__nav--next', 'aria-label': 'Next month',
          disabled: !canNext, onclick: () => go(1),
        }, '›')),
      h('div', { class: 'cal__weekdays', 'aria-hidden': 'true' },
        WEEKDAY_LETTERS.map((letter) => h('span', null, letter))),
      h('div', { class: 'cal__grid', role: 'grid', 'aria-label': monthTitle(viewed.year, viewed.month) },
        weeks.map((week) => week.map((cell) => cellFor(cell, today)))),
      h('ul', { class: 'legend', 'aria-label': 'Legend' },
        legendItem('solved', 'Solved'),
        legendItem('frozen', 'Frozen'),
        legendItem('missed', 'Missed'),
        legendItem('today', 'Today')));
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
    container.replaceChildren(
      h('h1', { class: 'stats__title' }, 'Stats'),
      tiles(stats),
      solvedCard(stats),
      xpCard(stats),
      practicedCard(stats),
      calendar(stats, today));
  }

  // Draw on the next frame: many changes at once give one redraw.
  function scheduleRender() {
    if (frame === null) frame = requestAnimationFrame(render);
  }

  const unsubscribe = store.subscribe(scheduleRender);
  render();

  return function unmount() {
    unsubscribe();
  };
}

export default { id: 'stats', label: 'Stats', icon: 'stats', mount };
