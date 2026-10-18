const dashboardUrl = browser.runtime.getURL('dashboard.html');
const settingsUrl = browser.runtime.getURL('settings.html');
let pending = Promise.resolve();

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
  if (message?.type === 'open-dashboard' && Number.isInteger(sender.tab?.id)) {
    return browser.tabs.update(sender.tab.id, { url: dashboardUrl });
  }
  if (message?.type === 'open-settings') return browser.runtime.openOptionsPage();
  if (!['get-custom-links', 'add-custom-link', 'remove-custom-link'].includes(message?.type)) return;
  if (message.type !== 'get-custom-links' && sender.url !== settingsUrl) {
    return Promise.resolve({ ok: false, error: 'Zmieniaj strony w ustawieniach rozszerzenia.' });
  }
  return linkRequest(message);
});

browser.browserAction.onClicked.addListener(tab => {
  if (Number.isInteger(tab?.id)) return browser.tabs.update(tab.id, { url: dashboardUrl });
  return browser.tabs.create({ url: dashboardUrl });
});
