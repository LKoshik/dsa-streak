import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, hasText } from './helpers/fake-dom.js';
import { createUpdateBanner } from '../src/ui/update-banner.js';

let dom;
afterEach(() => { if (dom) { dom.restore(); dom = null; } });

test('banner says "New version ready" and has a Reload button', () => {
  dom = installFakeDom();
  const banner = createUpdateBanner({ onReload: () => {} });
  dom.body.append(banner.el);
  assert.ok(hasText(banner.el, 'New version ready'));
  assert.equal(banner.button.textContent, 'Reload');
  assert.equal(banner.el.getAttribute('role'), 'status');
});

test('tapping Reload calls onReload once and shows Updating…', () => {
  dom = installFakeDom();
  let calls = 0;
  const banner = createUpdateBanner({ onReload: () => { calls += 1; } });
  banner.button.click();
  banner.button.click();
  assert.equal(calls, 1);
  assert.equal(banner.button.textContent, 'Updating…');
  assert.equal(banner.button.getAttribute('disabled'), 'disabled');
});
