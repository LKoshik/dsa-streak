// Bottom navigation bar. Plain links (#/home ...), so the router does the work.
// createNav(features) returns { el, setActive(id) }.
import { h } from './dom.js';

export function createNav(features) {
  const links = new Map();
  const el = h('nav', { class: 'nav', 'aria-label': 'Main' },
    features.map((feature) => {
      const link = h('a', { class: 'nav__item', href: `#/${feature.id}` },
        h('span', { class: 'nav__icon', 'aria-hidden': 'true' }, feature.icon),
        h('span', { class: 'nav__label' }, feature.label));
      links.set(feature.id, link);
      return link;
    }));

  return {
    el,
    setActive(id) {
      for (const [featureId, link] of links) {
        if (featureId === id) {
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'page');
        } else {
          link.classList.remove('is-active');
          link.removeAttribute('aria-current');
        }
      }
    },
  };
}
