import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('background opens only its packaged dashboard for own content messages', async () => {
  let listener, toolbar; const updates = [];
  const browser = {
    runtime: { id: 'lazy-start@test', getURL: path => `moz-extension://test/${path}`, onMessage: { addListener: fn => { listener = fn; } } },
    browserAction: { onClicked: { addListener: fn => { toolbar = fn; } } },
    tabs: { update: async (...args) => { updates.push(args); }, create: async () => {} },
  };
  vm.runInNewContext(readFileSync('extension/background.js', 'utf8'), { browser });
  listener({ type: 'open-dashboard', url: 'https://evil.test' }, { id: 'other', tab: { id: 1 } });
  listener({ type: 'open-url', url: 'https://evil.test' }, { id: browser.runtime.id, tab: { id: 1 } });
  assert.equal(updates.length, 0);
  await listener({ type: 'open-dashboard', url: 'https://evil.test' }, { id: browser.runtime.id, tab: { id: 7 } });
  assert.equal(updates[0][0], 7);
  assert.equal(updates[0][1].url, 'moz-extension://test/dashboard.html');
  await toolbar({ id: 8 });
  assert.equal(updates[1][0], 8);
});

test('destinations are shared, fixed HTTPS links', () => {
  const context = {};
  vm.runInNewContext(readFileSync('extension/links.js', 'utf8'), context);
  assert.deepEqual(Array.from(context.LAZY_LINKS, link => link.url), [
    'https://lazy-diet.workers.dev/', 'https://lazy-tea.pages.dev/', 'https://lazy-shopping.michalczukm.xyz/',
  ]);
  assert.equal(context.LAZY_LINKS[2].label, 'lazy-list');
  assert.equal(Object.isFrozen(context.LAZY_LINKS), true);
});

test('manifest injects into ordinary pages only in the top frame', () => {
  const manifest = JSON.parse(readFileSync('extension/manifest.json'));
  assert.deepEqual(manifest.content_scripts[0].matches, ['http://*/*', 'https://*/*']);
  assert.notEqual(manifest.content_scripts[0].all_frames, true);
  assert.deepEqual(manifest.permissions, ['storage', 'https://api.open-meteo.com/*']);
  assert.equal(manifest.browser_specific_settings.gecko.data_collection_permissions.required[0], 'none');
  assert.equal(manifest.chrome_settings_overrides, undefined);
  assert.equal(manifest.version, JSON.parse(readFileSync('package.json')).version);
});
