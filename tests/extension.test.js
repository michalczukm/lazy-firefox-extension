import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('destinations are shared, fixed HTTPS links', () => {
  const context = {};
  vm.runInNewContext(readFileSync('extension/links.js', 'utf8'), context);
  assert.deepEqual(Array.from(context.LAZY_LINKS, link => link.url), [
    'https://lazy-diet.workers.dev/', 'https://lazy-tea.pages.dev/', 'https://lazy-list.michalczukm.xyz/',
  ]);
  assert.equal(context.LAZY_LINKS[2].label, 'lazy-list');
  assert.equal(Object.isFrozen(context.LAZY_LINKS), true);
});

test('manifest injects into ordinary pages only in the top frame', () => {
  const manifest = JSON.parse(readFileSync('extension/manifest.json'));
  assert.deepEqual(manifest.content_scripts[0].matches, ['http://*/*', 'https://*/*']);
  assert.notEqual(manifest.content_scripts[0].all_frames, true);
  assert.deepEqual(manifest.permissions, ['storage', 'tabs', 'https://api.open-meteo.com/*']);
  assert.equal(manifest.browser_specific_settings.gecko.data_collection_permissions.required[0], 'none');
  assert.equal(manifest.chrome_settings_overrides, undefined);
  assert.equal(manifest.version, JSON.parse(readFileSync('package.json')).version);
});
