// Path screen: 18 sticky green topic banners, and under each one the subsections
// as winding zig-zag nodes (done / in progress / current / upcoming).
// Tap a node: a bottom sheet lists that subsection's problems as checkboxes, plus "Continue here".
// No links anywhere. The router resets the screen's class to "view", so this screen
// adds its own classes and scrolls its own inner box (.path).
import { h } from '../../ui/dom.js';
import { createRing } from '../../ui/ring.js';
import { openSheet } from '../../ui/sheet.js';
import { showToast } from '../../ui/toast.js';
import { getProblem } from '../../core/catalog.js';
import { computeRewards } from '../home/rewards.js';
import { soundForSolve } from '../../core/sound-events.js';
import { unlockAudio, playSound } from '../../ui/sound.js';
import { buildPathModel, bannerText, centeredScrollTop } from './model.js';

const NODE_ICON = { done: '✓', current: '★', upcoming: '☆' };
const STATE_WORD = { done: 'done', current: 'current', progress: 'in progress', upcoming: 'not started' };

function mount(root, ctx) {
  const { store, actions, selectors } = ctx;

  root.classList.add('view--fill', 'view--path');
  const scroller = h('div', { class: 'path' });
  root.append(scroller);

  let model = null;
  let frame = null;
  let sheet = null;
  let openKey = null;       // which node's sheet is open
  let confirmId = null;     // problem waiting for "uncheck?" confirmation
  let busy = false;         // true while a save is running
  let wantScroll = 'start'; // 'start' (first draw), 'smooth' (after Continue here) or null
  let justChecked = null;   // problem that was just checked (small +10 XP pop)
  let unmounted = false;
  const nodeButtons = new Map();

  // ---------- the path ----------

  function nodeView(node) {
    const fraction = node.total > 0 ? node.solved / node.total : 0;
    const partial = node.state === 'progress' || (node.state === 'current' && node.solved > 0);
    const button = h('button', {
      type: 'button',
      class: 'node__btn',
      'aria-label': `${node.name}, ${node.solved} of ${node.total} solved, ${STATE_WORD[node.state]}`,
      onclick: () => openNode(node.key),
    }, partial ? `${node.solved}/${node.total}` : NODE_ICON[node.state]);
    nodeButtons.set(node.key, button);

    const stage = h('div', { class: 'node__stage' },
      partial ? createRing({ size: 84, stroke: 7, value: fraction, color: 'var(--orange)' }) : null,
      button);
    return h('div', {
      class: `node node--${node.state}`,
      dataset: { key: node.key },
      style: { '--x': `${node.offset}px` },
    },
      node.state === 'current' ? h('div', { class: 'node__bubble' }, node.solved > 0 ? 'CONTINUE' : 'START') : null,
      stage,
      h('div', { class: 'node__name' }, node.name),
      h('div', { class: 'node__count' }, `${node.solved} of ${node.total}`));
  }

  function topicView(topic) {
    const percent = topic.total > 0 ? Math.round((topic.solved / topic.total) * 100) : 0;
    return h('section', { class: `topic${topic.done ? ' topic--done' : ''}` },
      h('header', { class: 'topic-banner', 'aria-label': bannerText(topic) },
        h('div', { class: 'topic-banner__text' },
          h('div', { class: 'topic-banner__label' }, `TOPIC ${topic.number} · ${topic.solved} of ${topic.total}`),
          h('h2', { class: 'topic-banner__name' }, topic.name),
          h('div', { class: 'topic-banner__bar', 'aria-hidden': 'true' },
            h('div', { class: 'topic-banner__fill', style: { '--p': `${percent}%` } }))),
        h('div', { class: 'topic-banner__badge', 'aria-hidden': 'true' }, topic.done ? '🏆' : '')),
      h('div', { class: 'topic__nodes' }, topic.nodes.map(nodeView)));
  }

  function render() {
    frame = null;
    if (unmounted) return;
    const keepScroll = scroller.scrollTop;
    model = buildPathModel(selectors.selectPath(store.get()));
    nodeButtons.clear();
    const allDone = model.currentKey === null;
    scroller.replaceChildren(
      ...model.topics.map(topicView),
      h('div', { class: `path__end${allDone ? ' is-done' : ''}` },
        h('div', { class: 'path__trophy', 'aria-hidden': 'true' }, '🏆'),
        h('div', { class: 'node__name' }, allDone ? 'You finished the whole path' : 'The end of the path')));
    scroller.scrollTop = keepScroll;

    if (sheet && sheet.isOpen()) refreshSheet();

    if (wantScroll) {
      const smooth = wantScroll === 'smooth';
      wantScroll = null;
      // Wait one frame so the browser has measured the new nodes.
      requestAnimationFrame(() => scrollToCurrent(smooth));
    }
  }

  function scheduleRender() {
    if (frame === null) frame = requestAnimationFrame(render);
  }

  function scrollToCurrent(smooth) {
    if (unmounted || !model || model.currentKey === null) return;
    const button = nodeButtons.get(model.currentKey);
    if (!button || typeof button.getBoundingClientRect !== 'function' || typeof scroller.getBoundingClientRect !== 'function') return;
    const nodeRect = button.getBoundingClientRect();
    const viewRect = scroller.getBoundingClientRect();
    const top = centeredScrollTop({
      nodeTop: nodeRect.top - viewRect.top,
      nodeHeight: nodeRect.height,
      viewHeight: scroller.clientHeight || viewRect.height,
      scrollTop: scroller.scrollTop,
    });
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ top, behavior: smooth && !reduce ? 'smooth' : 'auto' });
    } else {
      scroller.scrollTop = top;
    }
  }

  // ---------- the sheet ----------

  function problemRow(problem, isNext) {
    const popped = justChecked === problem.id;
    const classes = ['prow'];
    if (problem.solved) classes.push('is-solved');
    if (confirmId === problem.id) classes.push('is-confirming');
    if (popped) classes.push('is-pop');
    return h('button', {
      type: 'button',
      role: 'checkbox',
      'aria-checked': problem.solved ? 'true' : 'false',
      class: classes.join(' '),
      onclick: () => onToggle(problem),
    },
      h('span', { class: 'prow__box', 'aria-hidden': 'true' }, problem.solved ? '✓' : ''),
      h('span', { class: 'prow__main' },
        h('span', { class: 'prow__title' }, problem.title),
        h('span', { class: 'prow__meta' },
          h('span', null, `#${problem.id}`),
          problem.difficulty ? h('span', { class: `tag tag--${problem.difficulty.toLowerCase()}` }, problem.difficulty) : null,
          isNext ? h('span', { class: 'prow__next' }, 'Next up') : null)),
      popped ? h('span', { class: 'xp-pop', 'aria-hidden': 'true' }, '+10 XP') : null);
  }

  function footerFor(node) {
    if (confirmId !== null) {
      const problem = getProblem(confirmId);
      return h('div', { class: 'confirm' },
        h('p', { class: 'confirm__text' }, `Uncheck #${confirmId} ${problem ? problem.title : ''}?`),
        h('p', { class: 'confirm__sub' }, 'It will count as not solved. Your streak and XP will update.'),
        h('div', { class: 'confirm__buttons' },
          h('button', { type: 'button', class: 'btn btn--ghost', onclick: cancelUncheck }, 'Keep it'),
          h('button', { type: 'button', class: 'btn btn--red', onclick: confirmUncheck }, 'Uncheck')));
    }
    if (model.topics[node.topicNumber - 1].isCurrent) {
      const { next } = selectors.selectHome(store.get());
      return h('p', { class: 'sheet__note' },
        next ? `✓ This topic is your Next up: #${next.problem.id} ${next.problem.title}` : '✓ This topic is your Next up');
    }
    return h('button', { type: 'button', class: 'btn btn--green btn--block', onclick: () => onContinue(node) }, 'Continue here');
  }

  function refreshSheet() {
    const node = model.nodes.get(openKey);
    if (!node) return;
    if (confirmId !== null && !node.problems.some((p) => p.id === confirmId && p.solved)) confirmId = null;
    const done = node.total > 0 && node.solved === node.total;
    sheet.update({
      label: `TOPIC ${node.topicNumber} · ${node.topic}`,
      title: node.name,
      subtitle: done ? `All ${node.total} solved ✓` : `${node.solved} of ${node.total} solved`,
      progress: node.total > 0 ? node.solved / node.total : 0,
      body: h('div', { class: 'plist', role: 'group', 'aria-label': 'Problems' },
        node.problems.map((p) => problemRow(p, p.id === node.nextProblemId))),
      footer: footerFor(node),
    });
    justChecked = null;
  }

  function openNode(key) {
    if (!model || !model.nodes.has(key)) return;
    openKey = key;
    confirmId = null;
    sheet = openSheet({ onClose: onSheetClosed });
    refreshSheet();
  }

  function onSheetClosed() {
    const key = openKey;
    openKey = null;
    confirmId = null;
    sheet = null;
    const button = key ? nodeButtons.get(key) : null;
    if (button && typeof button.focus === 'function') button.focus({ preventScroll: true });
  }

  // ---------- checking and unchecking ----------

  async function onToggle(problem) {
    if (busy) return;
    if (problem.solved) {
      confirmId = confirmId === problem.id ? null : problem.id; // ask first
      refreshSheet();
      return;
    }
    busy = true;
    confirmId = null;
    unlockAudio(); // phones only allow sound that starts from a tap, so do it before any waiting
    try {
      const before = selectors.selectHome(store.get());
      const solve = await actions.markSolved(problem.id);
      if (!solve) return;
      const after = selectors.selectHome(store.get());
      const solvedIds = new Set(store.get().solves.map((s) => s.problemId));
      const rewards = computeRewards({ before, after, problem: getProblem(problem.id), solvedIds });
      justChecked = problem.id;
      playSound(soundForSolve({ before, after, problem: getProblem(problem.id), solvedIds }), store.get().settings.soundOn !== false);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(20);
      for (const text of rewards.messages) showToast({ message: text, variant: 'reward', duration: 3500 });
      scheduleRender();
    } catch (error) {
      console.error(error);
      showToast({ message: 'Could not save. Please try again.', duration: 4000 });
    } finally {
      busy = false;
    }
  }

  function cancelUncheck() {
    confirmId = null;
    if (sheet && sheet.isOpen()) refreshSheet();
  }

  async function confirmUncheck() {
    if (busy || confirmId === null) return;
    const id = confirmId;
    busy = true;
    try {
      await actions.unmarkSolved(id);
      confirmId = null;
      showToast({ message: `Unchecked #${id}`, duration: 3000 });
      scheduleRender();
    } catch (error) {
      console.error(error);
      showToast({ message: 'Could not save. Please try again.', duration: 4000 });
    } finally {
      busy = false;
    }
  }

  // ---------- Continue here ----------

  async function onContinue(node) {
    if (busy) return;
    busy = true;
    try {
      await actions.setCurrentTopic(node.topic);
      const { next } = selectors.selectHome(store.get());
      wantScroll = 'smooth';
      if (sheet) sheet.close();
      if (next) showToast({ message: `Next up: ${next.topic} · #${next.problem.id}`, duration: 3500 });
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
    unmounted = true;
    unsubscribe();
    if (sheet) {
      const closing = sheet;
      sheet = null;
      openKey = null;
      closing.close();
    }
    root.classList.remove('view--fill', 'view--path');
  };
}

export default { id: 'path', label: 'Path', icon: '🗺️', mount };
