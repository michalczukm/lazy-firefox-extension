(() => {
  async function navigate(message) {
    const result = await browser.runtime.sendMessage(message);
    if (!result?.ok) throw new Error(result?.error);
  }
  const hosted = globalThis.LazyLinks.isHostedDashboard(location.href) &&
    document.documentElement.hasAttribute('data-lazy-dashboard');
  const launcher = hosted ? null : globalThis.LazyLauncher.mount({
    shadowMode: 'closed',
    onHome: () => navigate({ type: 'open-dashboard' }),
    onNavigate: url => navigate({ type: 'open-link', url }),
    onSettings: () => browser.runtime.sendMessage({ type: 'open-settings' }),
  });
  async function updateLinks() {
    let result;
    try { result = await browser.runtime.sendMessage({ type: 'get-custom-links' }); }
    catch { result = { ok: false, error: 'Nie udało się wczytać własnych stron. Otwórz ustawienia i spróbuj ponownie.' }; }
    if (hosted) {
      // Firefox requires string detail across the page/content-script boundary.
      window.dispatchEvent(new CustomEvent('lazy-start:links', { detail: JSON.stringify({ ...result, navigationAvailable: true }) }));
    } else if (result?.ok) {
      globalThis.LazyLauncher.setLinks(launcher, globalThis.LazyLinks.merge(result.customLinks));
      globalThis.LazyLauncher.notify(launcher, '');
    } else {
      globalThis.LazyLauncher.notify(launcher, result?.error || 'Nie udało się wczytać własnych stron.');
    }
  }
  if (hosted) {
    window.addEventListener('lazy-start:navigate', event => {
      if (typeof event.detail !== 'string') return;
      let message;
      try { message = JSON.parse(event.detail); } catch { return; }
      if (!['open-dashboard', 'open-link'].includes(message?.type)) return;
      navigate({ type: message.type, url: message.url }).catch(() => {
        window.dispatchEvent(new CustomEvent('lazy-start:navigation-error'));
      });
    });
    window.addEventListener('lazy-start:request-links', updateLinks);
    window.addEventListener('lazy-start:open-settings', () => {
      browser.runtime.sendMessage({ type: 'open-settings' }).catch(() => {});
    });
  }
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.hasOwn(changes, 'customLinks')) updateLinks();
  });
  updateLinks();
})();
