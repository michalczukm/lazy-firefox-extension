import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

function environment(initial = {}) {
  let listener; const changes = []; const data = structuredClone(initial);
  const browser = {
    runtime: { id: 'lazy@test', getURL: file => `moz-extension://test/${file}`, onMessage: { addListener(fn) { listener = fn; } }, openOptionsPage: async () => { changes.push('settings'); } },
    browserAction: { onClicked: { addListener() {} } },
    tabs: { update: async () => {}, create: async () => {}, onUpdated: { addListener() {} }, onRemoved: { addListener() {} } },
    storage: { local: {
      async get(key) { await new Promise(resolve => setTimeout(resolve, 2)); return { [key]: structuredClone(data[key]) }; },
      async set(values) { await new Promise(resolve => setTimeout(resolve, 2)); Object.assign(data, structuredClone(values)); },
    } },
  };
  const context = { browser, URL, crypto: { randomUUID } };
  vm.runInNewContext(readFileSync('extension/links.js', 'utf8'), context);
  vm.runInNewContext(readFileSync('extension/background.js', 'utf8'), context);
  return { data, browser, links: context.LazyLinks, changes,
    send: (message, sender = { id: browser.runtime.id, url: browser.runtime.getURL('settings.html') }) => listener(message, sender) };
}

test('custom links normalize HTTP URLs and always use the fixed cog', () => {
  const { links } = environment();
  const input = links.normalizeInput({ label: ' Kalendarz ', url: 'https://EXAMPLE.com', icon: 'bowl' });
  assert.equal(input.label, 'Kalendarz'); assert.equal(input.url, 'https://example.com/');
  const custom = [{ id: randomUUID(), ...input }];
  const all = links.merge(custom);
  assert.equal(all.length, 4); assert.equal(all[3].icon, 'settings');
  assert.equal(all[3].description, 'example.com');
  assert.equal(links.normalizeInput({ label: 'Local', url: 'http://localhost:8080' }).url, 'http://localhost:8080/');
});

test('rejects unsafe URLs, credentials, empty names and duplicates', async () => {
  const env = environment();
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/file', 'about:config', 'https://name:password@example.com/', 'example.com', 'https://example.com/\n']) {
    assert.throws(() => env.links.normalizeInput({ label: 'Test', url }), url);
  }
  assert.throws(() => env.links.normalizeInput({ label: ' ', url: 'https://example.com/' }));
  assert.throws(() => env.links.normalizeInput({ label: 'a'.repeat(81), url: 'https://example.com/' }));
  const duplicate = await env.send({ type: 'add-custom-link', label: 'Tea', url: 'https://lazy-tea.pages.dev' });
  assert.equal(duplicate.ok, false);
  assert.equal(env.data.customLinks, undefined);
});

test('only the extension settings page can change profile links', async () => {
  const env = environment();
  const request = { type: 'add-custom-link', label: 'Test', url: 'https://example.com/' };
  const denied = await env.send(request, { id: env.browser.runtime.id, url: 'https://evil.test/', tab: { id: 1 } });
  assert.equal(denied.ok, false);
  assert.equal(env.send(request, { id: 'other@test', url: env.browser.runtime.getURL('settings.html') }), undefined);
  assert.equal(env.data.customLinks, undefined);
});

test('serializes concurrent adds, keeps weather, and persists no icon setting', async () => {
  const env = environment({ weather: { savedAt: 42 } });
  const results = await Promise.all([
    env.send({ type: 'add-custom-link', label: 'One', url: 'https://one.test/', icon: 'bowl' }),
    env.send({ type: 'add-custom-link', label: 'Two', url: 'https://two.test/' }),
  ]);
  assert.equal(results.every(result => result.ok), true);
  assert.equal(env.data.customLinks.length, 2);
  assert.deepEqual(env.data.weather, { savedAt: 42 });
  assert.equal(env.data.customLinks[0].icon, undefined);
  const read = await env.send({ type: 'get-custom-links' });
  assert.equal(read.customLinks.length, 2);
  const removed = await env.send({ type: 'remove-custom-link', id: read.customLinks[0].id });
  assert.equal(removed.ok, true); assert.equal(env.data.customLinks.length, 1);
  assert.equal((await env.send({ type: 'remove-custom-link', id: read.customLinks[0].id })).ok, true);
});

test('storage failures and corrupt saved values never overwrite user data', async () => {
  assert.throws(() => environment().links.readStored([{ id: [randomUUID()], label: 'Bad ID', url: 'https://example.com/' }]));
  const corrupt = environment({ customLinks: [{ id: 'invalid', label: 'Unsafe', url: 'javascript:alert(1)' }] });
  assert.equal((await corrupt.send({ type: 'get-custom-links' })).ok, false);
  assert.equal((await corrupt.send({ type: 'add-custom-link', label: 'New', url: 'https://new.test/' })).ok, false);
  assert.equal(corrupt.data.customLinks[0].url, 'javascript:alert(1)');
  const unavailable = environment();
  unavailable.browser.storage.local.set = async () => { throw Error('quota'); };
  assert.equal((await unavailable.send({ type: 'add-custom-link', label: 'New', url: 'https://new.test/' })).ok, false);
  assert.equal(unavailable.data.customLinks, undefined);
});

test('hosted bridge is restricted to this dashboard project and its preview origins', () => {
  const { links } = environment();
  for (const url of ['https://lazy.michalczukm.xyz/', 'https://lazy.michalczukm.xyz/dashboard.html', 'https://lazy-firefox-extension.pages.dev/', 'https://pr-2.lazy-firefox-extension.pages.dev/dashboard', 'https://abcdef.lazy-firefox-extension.pages.dev/dashboard.html']) assert.equal(links.isHostedDashboard(url), true, url);
  for (const url of ['https://evil.test/', 'https://lazy.michalczukm.xyz.evil.test/', 'https://other.lazy.michalczukm.xyz/', 'http://lazy.michalczukm.xyz/', 'https://lazy.michalczukm.xyz:8443/', 'https://lazy.michalczukm.xyz/settings.html', 'https://lazy-firefox-extension.pages.dev.evil.test/', 'http://lazy-firefox-extension.pages.dev/', 'https://other.pages.dev/', 'https://lazy-firefox-extension.pages.dev/settings.html', 'http://localhost:4198/']) assert.equal(links.isHostedDashboard(url), false, url);
});
