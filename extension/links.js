globalThis.LAZY_LINKS = Object.freeze([
  Object.freeze({ label: 'lazy-diet', description: 'Posiłki i planowanie', url: 'https://lazy-diet.workers.dev/', icon: 'bowl' }),
  Object.freeze({ label: 'lazy-tea', description: 'Tak się parzy herbatę', url: 'https://lazy-tea.pages.dev/', icon: 'cup' }),
  Object.freeze({ label: 'lazy-list', description: 'Lista zakupów', url: 'https://lazy-list.michalczukm.xyz/', icon: 'basket' }),
]);

(() => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function invalid(message, field) {
    const error = new Error(message); error.userMessage = message; error.field = field; throw error;
  }
  function normalizeInput(input) {
    const label = typeof input?.label === 'string' ? input.label.trim() : '';
    if (!label || label.length > 80 || /[\x00-\x1f\x7f]/.test(label)) invalid('Wpisz nazwę strony (od 1 do 80 znaków).', 'label');
    if (typeof input?.url !== 'string' || input.url.length > 2048 || /[\x00-\x1f\x7f]/.test(input.url)) invalid('Wpisz poprawny adres strony.', 'url');
    let url;
    try { url = new URL(input.url.trim()); } catch { invalid('Podaj pełny adres zaczynający się od http:// lub https://.', 'url'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) invalid('Użyj adresu http:// lub https://, bez loginu i hasła.', 'url');
    return { label, url: url.href };
  }
  function readStored(value) {
    if (value === undefined) return [];
    try {
      if (!Array.isArray(value)) throw new Error();
      const ids = new Set(); const urls = new Set(globalThis.LAZY_LINKS.map(link => link.url));
      return value.map(item => {
        if (typeof item?.id !== 'string' || !uuid.test(item.id) || ids.has(item.id)) throw new Error();
        const link = normalizeInput(item);
        if (urls.has(link.url)) throw new Error();
        ids.add(item.id); urls.add(link.url);
        return { id: item.id, ...link };
      });
    } catch { invalid('Nie można odczytać zapisanych stron. Odśwież kartę i spróbuj ponownie.'); }
  }
  function merge(customLinks) {
    return [...globalThis.LAZY_LINKS, ...readStored(customLinks).map(link => ({
      ...link, icon: 'settings', description: new URL(link.url).host,
    }))];
  }
  function isHostedDashboard(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.port && !url.username && !url.password &&
        (url.hostname === 'lazy.michalczukm.xyz' || /^(?:[a-z0-9-]+\.)?lazy-firefox-extension\.pages\.dev$/.test(url.hostname)) &&
        ['/', '/dashboard', '/dashboard.html', '/index.html'].includes(url.pathname);
    } catch { return false; }
  }
  globalThis.LazyLinks = Object.freeze({ normalizeInput, readStored, merge, isHostedDashboard, dashboardUrl: 'https://lazy.michalczukm.xyz/' });
})();
