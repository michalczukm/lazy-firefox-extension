import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function environment(tabs = [], customLinks, createBlank = false) {
  let receiver, toolbar, updated, removed;
  const updates = [], creates = [], queries = [];
  const browser = {
    runtime: { id: 'lazy@test', getURL: file => `moz-extension://test/${file}`, onMessage: { addListener(fn) { receiver = fn; } } },
    browserAction: { onClicked: { addListener(fn) { toolbar = fn; } } },
    storage: { local: { get: async () => ({ customLinks }) } },
    tabs: {
      onUpdated: { addListener(fn) { updated = fn; } },
      onRemoved: { addListener(fn) { removed = fn; } },
      async query(scope) { queries.push(scope); return structuredClone(tabs.filter(tab => tab.windowId === (scope.windowId ?? 1))); },
      async update(id, changes) {
        updates.push({ id, ...changes });
        const tab = tabs.find(tab => tab.id === id);
        if (!tab) throw new Error('Tab closed');
        Object.assign(tab, changes);
        return tab;
      },
      async create(properties) {
        creates.push(properties);
        // Yield so uncoordinated query/create requests would create duplicates.
        await new Promise(resolve => setImmediate(resolve));
        const tab = { id: tabs.length + 100, windowId: 1, ...properties, ...(createBlank ? { url: 'about:blank' } : {}) };
        tabs.push(tab); return tab;
      },
    },
  };
  const context = { browser, URL };
  vm.runInNewContext(readFileSync('extension/links.js', 'utf8'), context);
  vm.runInNewContext(readFileSync('extension/background.js', 'utf8'), context);
  const sender = { id: browser.runtime.id, url: 'https://lazy.michalczukm.xyz/', frameId: 0, tab: { id: 1, windowId: 1 } };
  return { tabs, browser, updates, creates, queries, toolbar: tab => toolbar(tab),
    changed(id, changes) { Object.assign(tabs.find(tab => tab.id === id), changes); updated?.(id, changes); },
    closed(id) { tabs.splice(tabs.findIndex(tab => tab.id === id), 1); removed?.(id); },
    send: (message, from = sender) => receiver(message, from), sender };
}

test('app navigation activates an existing deep route without replacing its URL', async () => {
  const env = environment([
    { id: 1, windowId: 1, url: 'https://lazy.michalczukm.xyz/' },
    { id: 2, windowId: 1, url: 'https://lazy-diet.workers.dev/recipes/123?day=2#ingredients' },
  ]);
  assert.equal((await env.send({ type: 'open-link', url: 'https://lazy-diet.workers.dev/' })).ok, true);
  assert.deepEqual(env.updates, [{ id: 2, active: true }]);
  assert.equal(env.tabs[1].url, 'https://lazy-diet.workers.dev/recipes/123?day=2#ingredients');
  assert.equal(env.creates.length, 0);
});

test('repeated concurrent taps create one app tab and preserve the dashboard', async () => {
  const env = environment([{ id: 1, windowId: 1, url: 'https://lazy.michalczukm.xyz/' }]);
  const results = await Promise.all(Array.from({ length: 3 }, () => env.send({ type: 'open-link', url: 'https://lazy-tea.pages.dev/' })));
  assert.equal(results.every(result => result?.ok), true);
  assert.equal(env.creates.length, 1);
  assert.equal(env.creates[0].url, 'https://lazy-tea.pages.dev/');
  assert.equal(env.tabs[0].url, 'https://lazy.michalczukm.xyz/');
});

test('Firefox tabs whose URL is not populated yet are reused across rapid app and Start taps', async () => {
  const env = environment([{ id: 1, windowId: 1, url: 'https://unrelated.test/' }], undefined, true);
  const diet = { type: 'open-link', url: 'https://lazy-diet.workers.dev/' };
  const tea = { type: 'open-link', url: 'https://lazy-tea.pages.dev/' };
  const home = { type: 'open-dashboard' };
  const results = await Promise.all([diet, tea, diet, home, tea, home].map(message => env.send(message)));
  assert.equal(results.every(result => result?.ok), true);
  assert.equal(env.creates.length, 3, 'One tab per destination while Firefox still reports about:blank');
  const dietTab = env.tabs[1];
  env.changed(dietTab.id, { url: 'https://other.test/' });
  env.changed(dietTab.id, { url: 'about:blank' });
  await env.send(diet);
  assert.equal(env.creates.length, 4, 'A tab that left the app is no longer reserved');
  env.closed(env.tabs.at(-1).id);
  await env.send(diet);
  assert.equal(env.creates.length, 5, 'Closing a pending tab permits opening another');
});

test('Start and toolbar reuse hosted or bundled dashboards, otherwise create the custom-domain dashboard', async () => {
  for (const url of ['https://lazy.michalczukm.xyz/dashboard.html', 'https://lazy-firefox-extension.pages.dev/', 'moz-extension://test/dashboard.html']) {
    const env = environment([{ id: 2, windowId: 1, url }]);
    await env.send({ type: 'open-dashboard', url: 'https://evil.test/' });
    await env.toolbar({ id: 1, windowId: 1 });
    assert.deepEqual(env.updates, [{ id: 2, active: true }, { id: 2, active: true }]);
    assert.equal(env.creates.length, 0);
  }
  const env = environment([{ id: 1, windowId: 1, url: 'https://lazy-diet.workers.dev/recipes/123' }]);
  await Promise.all([env.send({ type: 'open-dashboard' }), env.toolbar({ id: 1, windowId: 1 })]);
  assert.equal(env.creates.length, 1);
  assert.equal(env.creates[0].url, 'https://lazy.michalczukm.xyz/');
  assert.equal(env.tabs[0].url, 'https://lazy-diet.workers.dev/recipes/123');
});

test('navigation accepts only configured destinations from own top-level contexts', async () => {
  const env = environment();
  for (const url of ['https://evil.test/', 'javascript:alert(1)', 'https://lazy-diet.workers.dev.evil.test/', 'https://lazy-diet.workers.dev/unconfigured', undefined]) {
    assert.equal((await env.send({ type: 'open-link', url }))?.ok, false);
  }
  for (const sender of [{ ...env.sender, id: 'other' }, { ...env.sender, frameId: 2 }, { id: 'lazy@test', url: 'https://evil.test/' }]) {
    await env.send({ type: 'open-link', url: 'https://lazy-diet.workers.dev/' }, sender);
    await env.send({ type: 'open-dashboard' }, sender);
  }
  assert.equal(env.creates.length, 0);
  assert.equal(env.updates.length, 0);
  const packaged = { id: 'lazy@test', url: 'moz-extension://test/dashboard.html' };
  assert.equal((await env.send({ type: 'open-link', url: 'https://lazy-diet.workers.dev/' }, packaged)).ok, true);
});

test('custom links reuse their origin, with scheme and port kept distinct', async () => {
  const custom = [{ id: '00000000-0000-4000-8000-000000000001', label: 'Local', url: 'http://local.test:8080/start' }];
  const env = environment([
    { id: 2, windowId: 1, url: 'https://local.test:8080/start' },
    { id: 3, windowId: 1, url: 'http://local.test:8081/start' },
    { id: 4, windowId: 1, url: 'http://local.test:8080/current?keep=1' },
  ], custom);
  await env.send({ type: 'open-link', url: 'http://local.test:8080/start' });
  assert.deepEqual(env.updates, [{ id: 4, active: true }]);
});

test('different configured paths share one pending Firefox tab on the same origin', async () => {
  const env = environment([], [
    { id: '00000000-0000-4000-8000-000000000001', label: 'Start', url: 'https://app.test/start' },
    { id: '00000000-0000-4000-8000-000000000002', label: 'Other', url: 'https://app.test/other' },
  ], true);
  await Promise.all(['https://app.test/start', 'https://app.test/other'].map(url => env.send({ type: 'open-link', url })));
  assert.equal(env.creates.length, 1);
  assert.equal(env.creates[0].url, 'https://app.test/start');
});

test('loading tabs are reused and tabs in another window are left alone', async () => {
  const env = environment([
    { id: 2, windowId: 2, url: 'https://lazy-tea.pages.dev/' },
    { id: 3, windowId: 1, url: 'about:blank', pendingUrl: 'https://lazy-tea.pages.dev/' },
  ]);
  await env.send({ type: 'open-link', url: 'https://lazy-tea.pages.dev/' });
  assert.deepEqual(env.updates, [{ id: 3, active: true }]);
  assert.equal(env.queries[0].windowId, 1);
});

test('failed activation does not open a duplicate or poison later navigation', async () => {
  const env = environment([{ id: 2, windowId: 1, url: 'https://lazy-diet.workers.dev/keep' }]);
  const update = env.browser.tabs.update;
  env.browser.tabs.update = async () => { throw new Error('Cannot activate'); };
  assert.equal((await env.send({ type: 'open-link', url: 'https://lazy-diet.workers.dev/' })).ok, false);
  assert.equal(env.creates.length, 0);
  env.browser.tabs.update = update;
  assert.equal((await env.send({ type: 'open-link', url: 'https://lazy-diet.workers.dev/' })).ok, true);
});

test('built-in navigation remains available when custom-link storage is corrupt', async () => {
  const env = environment([], [{ bad: true }]);
  assert.equal((await env.send({ type: 'open-link', url: 'https://lazy-tea.pages.dev/' })).ok, true);
  assert.equal((await env.send({ type: 'open-link', url: 'https://unknown.test/' })).ok, false);
});
