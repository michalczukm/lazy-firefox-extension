import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function environment(tabs = [], customLinks, createBlank = false, separateWindows = false) {
  for (const tab of tabs) tab.incognito ??= false;
  let receiver, toolbar, updated, removed;
  const updates = [], creates = [], queries = [];
  const browser = {
    runtime: { id: 'lazy@test', getURL: file => `moz-extension://test/${file}`, onMessage: { addListener(fn) { receiver = fn; } } },
    browserAction: { onClicked: { addListener(fn) { toolbar = fn; } } },
    storage: { local: { get: async () => ({ customLinks }) } },
    tabs: {
      onUpdated: { addListener(fn) { updated = fn; } },
      onRemoved: { addListener(fn) { removed = fn; } },
      async query(scope) {
        queries.push(scope);
        assert.equal(Object.hasOwn(scope, 'incognito'), false, 'Firefox has no incognito query filter');
        return structuredClone(tabs.filter(tab =>
          (scope.windowId === undefined || tab.windowId === scope.windowId) &&
          (!scope.currentWindow || tab.windowId === 1) &&
          (scope.active === undefined || tab.active === scope.active)));
      },
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
        const id = tabs.length + 100;
        const tab = { id, incognito: tabs.find(tab => tab.windowId === properties.windowId)?.incognito ?? false,
          ...properties, windowId: separateWindows ? id + 1000 : properties.windowId ?? 1,
          ...(createBlank ? { url: 'about:blank' } : {}) };
        tabs.push(tab); return tab;
      },
    },
  };
  const context = { browser, URL };
  vm.runInNewContext(readFileSync('extension/links.js', 'utf8'), context);
  vm.runInNewContext(readFileSync('extension/background.js', 'utf8'), context);
  const sender = { id: browser.runtime.id, url: 'https://lazy.michalczukm.xyz/', frameId: 0, tab: { id: 1, windowId: 1, incognito: false } };
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
    await env.toolbar({ id: 1, windowId: 1, incognito: false });
    assert.deepEqual(env.updates, [{ id: 2, active: true }, { id: 2, active: true }]);
    assert.equal(env.creates.length, 0);
  }
  const env = environment([{ id: 1, windowId: 1, url: 'https://lazy-diet.workers.dev/recipes/123' }]);
  await Promise.all([env.send({ type: 'open-dashboard' }), env.toolbar({ id: 1, windowId: 1, incognito: false })]);
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
  env.tabs.push({ id: 1, windowId: 1, incognito: false, active: true, url: packaged.url });
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

test('a matching tab in the source window is preferred over another window', async () => {
  const env = environment([
    { id: 2, windowId: 2, url: 'https://lazy-tea.pages.dev/' },
    { id: 3, windowId: 1, url: 'about:blank', pendingUrl: 'https://lazy-tea.pages.dev/' },
  ]);
  await env.send({ type: 'open-link', url: 'https://lazy-tea.pages.dev/' });
  assert.deepEqual(env.updates, [{ id: 3, active: true }]);
  assert.deepEqual(Object.keys(env.queries[0]), []);
});

test('Android-style separate windows reuse app tabs and Start without replacing URLs', async () => {
  const env = environment([
    { id: 1, windowId: 1, url: 'https://lazy.michalczukm.xyz/' },
    { id: 2, windowId: 2, url: 'https://lazy-tea.pages.dev/#keep' },
  ], undefined, false, true);
  await env.send({ type: 'open-link', url: 'https://lazy-tea.pages.dev/' });
  await env.send({ type: 'open-dashboard' }, { ...env.sender, tab: env.tabs[1] });
  assert.deepEqual(env.updates, [{ id: 2, active: true }, { id: 1, active: true }]);
  assert.equal(env.creates.length, 0);
  assert.equal(env.tabs[1].url, 'https://lazy-tea.pages.dev/#keep');
});

test('rapid taps reuse a pending Android tab in its own window', async () => {
  const env = environment([{ id: 1, windowId: 1, url: 'https://lazy.michalczukm.xyz/' }], undefined, true, true);
  await Promise.all(Array.from({ length: 3 }, () => env.send({ type: 'open-link', url: 'https://lazy-tea.pages.dev/' })));
  assert.equal(env.creates.length, 1);
  assert.equal(Object.hasOwn(env.creates[0], 'windowId'), false, 'Unsupported window API is not used for creation');
});

test('desktop reuse focuses the matching window and creation stays in the source window', async () => {
  const env = environment([{ id: 2, windowId: 2, url: 'https://lazy-tea.pages.dev/#keep' }]);
  const focused = [];
  env.browser.windows = { update: async (id, properties) => { focused.push({ id, ...properties }); } };
  await env.send({ type: 'open-link', url: 'https://lazy-tea.pages.dev/' });
  assert.deepEqual(env.updates, [{ id: 2, active: true }]);
  assert.deepEqual(focused, [{ id: 2, focused: true }]);
  await env.send({ type: 'open-link', url: 'https://lazy-diet.workers.dev/' });
  assert.equal(env.creates[0].windowId, 1);
});

test('cross-window reuse never crosses normal/private browsing boundaries', async () => {
  for (const incognito of [false, true]) {
    const env = environment([
      { id: 2, windowId: 2, incognito: !incognito, url: 'https://lazy-tea.pages.dev/#other-mode' },
      { id: 3, windowId: 3, incognito, url: 'https://lazy-tea.pages.dev/#same-mode' },
    ]);
    await env.send({ type: 'open-link', url: 'https://lazy-tea.pages.dev/' },
      { ...env.sender, tab: { ...env.sender.tab, incognito } });
    assert.deepEqual(env.updates, [{ id: 3, active: true }]);
    assert.equal(env.creates.length, 0);
  }
});

test('packaged-page requests without a sender tab resolve the current privacy context', async () => {
  const env = environment([
    { id: 1, windowId: 1, active: true, incognito: true, url: 'moz-extension://test/dashboard.html' },
    { id: 2, windowId: 2, incognito: false, url: 'https://lazy-tea.pages.dev/' },
    { id: 3, windowId: 3, incognito: true, url: 'https://lazy-tea.pages.dev/#private' },
  ]);
  await env.send({ type: 'open-link', url: 'https://lazy-tea.pages.dev/' },
    { id: env.browser.runtime.id, url: 'moz-extension://test/dashboard.html' });
  assert.deepEqual(env.updates, [{ id: 3, active: true }]);
});

test('private navigation cannot create a normal tab when private creation is unsupported', async () => {
  const env = environment();
  const result = await env.send({ type: 'open-link', url: 'https://lazy-tea.pages.dev/' },
    { ...env.sender, tab: { ...env.sender.tab, incognito: true } });
  assert.equal(result.ok, false);
  assert.equal(env.creates.length, 0);
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
