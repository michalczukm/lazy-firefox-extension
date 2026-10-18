const packagedDashboardUrl = browser.runtime.getURL('dashboard.html');
const settingsUrl = browser.runtime.getURL('settings.html');
let pending = Promise.resolve();
let pendingNavigation = Promise.resolve();
const openingTabs = new Map();
browser.tabs.onUpdated.addListener((id, changes) => {
  if (changes.url && changes.url !== 'about:blank') openingTabs.delete(id);
});
browser.tabs.onRemoved.addListener(id => openingTabs.delete(id));

function navigationRequest(message, source) {
  // Keep query/create atomic across rapid taps and both navigation surfaces.
  const result = pendingNavigation.then(async () => {
    const home = message.type === 'open-dashboard';
    const url = home ? globalThis.LazyLinks.dashboardUrl : message.url;
    if (!home && !globalThis.LAZY_LINKS.some(link => link.url === url) &&
        !(await readCustomLinks()).some(link => link.url === url)) {
      throw new Error('Unknown destination');
    }
    const origin = new URL(url).origin;
    source ??= (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    if (typeof source?.incognito !== 'boolean') throw new Error('Missing navigation context');
    const supportsWindows = typeof browser.windows?.update === 'function';
    // Android represents each tab as its own window: search across windows.
    const tabs = (await browser.tabs.query({})).filter(tab => tab.incognito === source.incognito);
    // Firefox can resolve create() while the tab still reports about:blank.
    // Only reserve our own new tabs, and stop reserving once their URL is known.
    for (const tab of tabs) {
      const value = tab.pendingUrl || tab.url;
      if (value && value !== 'about:blank') openingTabs.delete(tab.id);
    }
    const matches = value => {
      if (home) return value === packagedDashboardUrl || globalThis.LazyLinks.isHostedDashboard(value);
      try { return new URL(value).origin === origin; } catch { return false; }
    };
    const candidates = tabs.filter(tab => matches(tab.pendingUrl || tab.url) || matches(openingTabs.get(tab.id)));
    const tab = candidates.find(tab => tab.windowId === source.windowId) || candidates[0];
    if (tab) {
      await browser.tabs.update(tab.id, { active: true });
      if (supportsWindows && tab.windowId !== source.windowId) await browser.windows.update(tab.windowId, { focused: true });
    } else {
      const windowId = supportsWindows && Number.isInteger(source.windowId) ? source.windowId : undefined;
      // Firefox Android cannot create private tabs through this API.
      if (source.incognito && windowId === undefined) throw new Error('Private tab creation unavailable');
      const created = await browser.tabs.create({ url, active: true, ...(windowId !== undefined ? { windowId } : {}) });
      openingTabs.set(created.id, url);
    }
    return { ok: true };
  }).catch(() => ({ ok: false, error: 'Nie udało się otworzyć strony. Spróbuj ponownie.' }));
  pendingNavigation = result.then(() => {});
  return result;
}

async function readCustomLinks() {
  return globalThis.LazyLinks.readStored((await browser.storage.local.get('customLinks')).customLinks);
}

function linkRequest(message) {
  // All settings tabs share one writer, so simultaneous edits cannot lose links.
  const result = pending.then(async () => {
    let customLinks = await readCustomLinks();
    if (message.type === 'add-custom-link') {
      const link = globalThis.LazyLinks.normalizeInput(message);
      if (globalThis.LazyLinks.merge(customLinks).some(existing => existing.url === link.url)) {
        return { ok: false, error: 'Ten adres jest już na liście.', field: 'url' };
      }
      customLinks = [...customLinks, { id: crypto.randomUUID(), ...link }];
      await browser.storage.local.set({ customLinks });
    } else if (message.type === 'remove-custom-link') {
      const next = customLinks.filter(link => link.id !== message.id);
      if (next.length !== customLinks.length) await browser.storage.local.set({ customLinks: next });
      customLinks = next;
    }
    return { ok: true, customLinks };
  }).catch(error => ({
    ok: false, error: error.userMessage || 'Nie udało się zapisać lub odczytać stron. Spróbuj ponownie.', field: error.field,
  }));
  pending = result.then(() => {});
  return result;
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== browser.runtime.id) return;
  if (['open-dashboard', 'open-link'].includes(message?.type)) {
    if ((sender.frameId !== undefined && sender.frameId !== 0) ||
        (!Number.isInteger(sender.tab?.id) && sender.url !== packagedDashboardUrl)) return;
    return navigationRequest(message, sender.tab);
  }
  if (message?.type === 'open-settings') return browser.runtime.openOptionsPage();
  if (!['get-custom-links', 'add-custom-link', 'remove-custom-link'].includes(message?.type)) return;
  if (message.type !== 'get-custom-links' && sender.url !== settingsUrl) {
    return Promise.resolve({ ok: false, error: 'Zmieniaj strony w ustawieniach rozszerzenia.' });
  }
  return linkRequest(message);
});

browser.browserAction.onClicked.addListener(tab => {
  return navigationRequest({ type: 'open-dashboard' }, tab);
});
