import { readFile } from 'node:fs/promises';

// Run shipped background logic behind a local browser-API fixture for UI checks.
export async function extensionFixture(origin) {
  const links = await readFile('extension/links.js', 'utf8');
  const background = await readFile('extension/background.js', 'utf8');
  return `(() => {
    let receiver;
    const listeners = [];
    const base = ${JSON.stringify(origin)};
    const browser = {
      runtime: {
        id: 'lazy-ui-test', getURL: file => new URL(file, base + '/').href,
        onMessage: { addListener: listener => { receiver = listener; } },
        sendMessage: message => {
          const result = Promise.resolve(receiver(message, { id: 'lazy-ui-test', url: location.href, frameId: 0, tab: { id: 1, windowId: 1 } }));
          if (['open-dashboard', 'open-link'].includes(message.type)) window.navigationComplete = result;
          return result;
        },
        openOptionsPage: async () => { location.href = new URL('settings.html', base + '/').href; },
      },
      storage: {
        local: {
          async get(key) { return { [key]: JSON.parse(localStorage.getItem(key) || 'null') ?? undefined }; },
          async set(values) {
            if (window.failExtensionWrites) throw new Error('quota fixture');
            const changes = {};
            for (const [key, value] of Object.entries(values)) {
              changes[key] = { oldValue: JSON.parse(localStorage.getItem(key) || 'null'), newValue: value };
              localStorage.setItem(key, JSON.stringify(value));
            }
            for (const listener of listeners) listener(changes, 'local');
          },
        },
        onChanged: { addListener: listener => listeners.push(listener) },
      },
      browserAction: { onClicked: { addListener() {} } },
      tabs: {
        onUpdated: { addListener() {} }, onRemoved: { addListener() {} },
        query: async () => structuredClone(window.fixtureTabs),
        update: async (id, value) => {
          if (window.failNavigation) throw new Error('Activation fixture');
          return Object.assign(window.fixtureTabs.find(tab => tab.id === id), value);
        },
        create: async value => {
          const tab = { id: window.fixtureTabs.length + 100, windowId: 1, ...value };
          window.fixtureTabs.push(tab); return tab;
        },
      },
    };
    window.fixtureTabs = [{ id: 1, windowId: 1, url: location.href }];
    ${links}
    ${background}
    window.extensionFixture = browser;
    if (!location.pathname.startsWith('/hosted/')) window.browser = browser;
    const realFetch = window.fetch.bind(window);
    window.fetch = (url, options) => {
      if (!String(url).startsWith('https://api.open-meteo.com/')) return realFetch(url, options);
      const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(Date.now());
      return Promise.resolve(new Response(JSON.stringify({
        current: { time: date + 'T12:00', temperature_2m: 12, apparent_temperature: 10, weather_code: 3 },
        daily: { time: [date], temperature_2m_max: [14], temperature_2m_min: [7], precipitation_probability_max: [35] },
      }), { status: 200 }));
    };
  })();`;
}
