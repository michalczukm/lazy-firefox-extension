(() => {
  const ns = 'http://www.w3.org/2000/svg';
  const paths = {
    home: ['M3 10 12 3l9 7', 'M5 9v12h5v-7h4v7h5V9'],
    bowl: ['M3 12h18a9 9 0 0 1-18 0Z', 'M7 7V4m5 3V3m5 4V4', 'M7 21h10'],
    cup: ['M4 8h13v6a6.5 6.5 0 0 1-13 0Z', 'M17 9h2a3 3 0 0 1 0 6h-2', 'M5 22h13', 'M8 4V2m5 2V2'],
    expand: ['M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5'],
    collapse: ['M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5'],
    arrow: ['M4 12h16m-6-6 6 6-6 6'],
    // Lucide refresh-cw (ISC): https://github.com/lucide-icons/lucide/blob/1ef60af944de207e0d5176905a0759ba12e6ee8d/icons/refresh-cw.svg
    refresh: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
    // Lucide shopping-basket (ISC), same source revision as refresh-cw above.
    basket: ['m15 11-1 9', 'm19 11-4-7', 'M2 11h20', 'm3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4', 'M4.5 15.5h15', 'm5 11 4-7', 'm9 11 1 9'],
    // Lucide settings (ISC), same source revision; custom links always use this icon.
    settings: ['M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915'],
    cloud: ['M7 18h11a4 4 0 0 0 0-8h-.4A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9Z'],
    sun: ['M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'],
    rain: ['M7 14h11a4 4 0 0 0 0-8h-.4A6 6 0 0 0 6 5a4.5 4.5 0 0 0 1 9Z', 'm8 18-1 3m6-3-1 3m6-3-1 3'],
    snow: ['M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9', 'm9 5 3 3 3-3m-6 14 3-3 3 3'],
  };
  function icon(name) {
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24'); svg.setAttribute('height', '24');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', ['refresh', 'basket', 'settings'].includes(name) ? '2' : '1.7'); svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    if (name === 'dots') {
      for (const x of [5, 12, 19]) for (const y of [5, 12, 19]) {
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', '1.7');
        dot.setAttribute('fill', 'currentColor'); dot.setAttribute('stroke', 'none'); svg.append(dot);
      }
    } else {
      for (const d of paths[name] || paths.cloud) {
        const path = document.createElementNS(ns, 'path'); path.setAttribute('d', d); svg.append(path);
      }
      if (name === 'sun' || name === 'settings') {
        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', name === 'sun' ? '4' : '3');
        svg.append(circle);
      }
    }
    return svg;
  }

  let instance;
  const roots = new WeakMap();
  const fullscreenIntents = new WeakMap();
  const rootFor = host => roots.get(host) || host.shadowRoot;
  function handleLinkClick(event, onNavigate, onError) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    const navigation = onNavigate?.(link.href);
    if (!navigation) return;
    event.preventDefault();
    Promise.resolve(navigation).catch(onError);
  }

  function mount({ onHome, onSettings, onNavigate, onFullscreenIntent, links = globalThis.LAZY_LINKS, settingsAvailable = Boolean(onSettings), shadowMode = 'open' }) {
    if (instance?.isConnected) return instance;
    const existing = document.getElementById('lazy-start-launcher');
    // Unrelated pages must not supply an open root that receives private links.
    if (shadowMode === 'closed') existing?.remove();
    else if (existing?.shadowRoot?.querySelector('.trigger')) return existing;
    const host = document.createElement('div');
    host.id = 'lazy-start-launcher'; host.lang = 'pl';
    host.dataset.lazyTheme = document.documentElement.dataset.lazyTheme === 'dark' ? 'dark' : 'light';
    const properties = {
      all: 'initial', position: 'fixed', top: 'max(12px, env(safe-area-inset-top))',
      right: 'max(12px, env(safe-area-inset-right))', 'z-index': '2147483647',
      display: 'block', width: 'max-content', 'max-width': 'calc(100vw - 24px)',
      'pointer-events': 'none', 'color-scheme': 'var(--lazy-scheme)',
    };
    for (const [key, value] of Object.entries(properties)) host.style.setProperty(key, value, 'important');
    const shadow = host.attachShadow({ mode: shadowMode });
    roots.set(host, shadow);
    const style = document.createElement('style');
    style.textContent = globalThis.LAZY_LAUNCHER_TOKENS + `
      :host { color-scheme: var(--lazy-scheme); }
      * { box-sizing: border-box; }
      [hidden] { display: none !important; }
      .bar { display: flex; align-items: flex-start; gap: 8px; max-width: calc(100vw - 24px); }
      button, a { color: var(--lazy-color-ink); font: var(--lazy-font-semibold) 15px/1.3 system-ui, sans-serif; touch-action: manipulation; }
      button { cursor: pointer; }
      button, nav { pointer-events: auto; background: var(--lazy-color-surface); }
      button { border: 0; }
      button:focus-visible, a:focus-visible { outline: 3px solid var(--lazy-color-focus); outline-offset: -4px; }
      button:hover, a:hover { background: var(--lazy-color-soft); }
      button:active, a:active { background: var(--lazy-color-pressed); }
      .trigger { width: 48px; height: 48px; padding: 12px; flex: 0 0 48px; border-radius: 12px;
        box-shadow: 0 3px 15px #142b2526; }
      .trigger[aria-expanded=true] { color: var(--lazy-color-on-accent); background: var(--lazy-action-bg); }
      nav { display: flex; align-items: center; overflow-x: auto; min-width: 0; border-radius: 12px;
        padding: 4px; box-shadow: 0 3px 15px #142b2526; scrollbar-width: thin; scrollbar-color: var(--lazy-color-muted) var(--lazy-color-surface);
        animation: unfold 180ms cubic-bezier(.16,1,.3,1); }
      nav a, nav button { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;
        min-height: 48px; padding: 10px 14px; white-space: nowrap; text-decoration: none;
        border-radius: 8px; }
      nav svg { width: 19px; height: 19px; flex-shrink: 0; }
      .site-items { display: contents; }
      .fullscreen { margin-left: 4px; border-left: 1px solid var(--lazy-color-line); border-radius: 0 8px 8px 0; }
      .message { pointer-events: auto; background: var(--lazy-color-surface); color: var(--lazy-color-ink); font: 15px/1.5 system-ui, sans-serif;
        padding: 12px 16px; margin: 8px 0 0 auto; max-width: 320px; border-radius: 8px;
        box-shadow: 0 3px 15px #142b2526; }
      ::selection { color: var(--lazy-color-on-accent); background: var(--lazy-action-bg); }
      @keyframes unfold { from { clip-path: inset(0 0 0 12%); } to { clip-path: inset(0); } }
      @media (prefers-reduced-motion: reduce) { nav { animation: none; } }
    `;
    const bar = document.createElement('div'); bar.className = 'bar';
    const nav = document.createElement('nav'); nav.id = 'lazy-sites'; nav.hidden = true;
    nav.setAttribute('aria-label', 'Podręczne menu');
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'trigger';
    trigger.setAttribute('aria-label', 'Otwórz menu stron'); trigger.title = 'Menu stron';
    trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', nav.id);
    trigger.append(icon('dots'));
    const message = document.createElement('p'); message.className = 'message'; message.hidden = true;
    message.setAttribute('role', 'status');
    const home = document.createElement('button'); home.type = 'button'; home.append(icon('home'), 'Start');
    home.addEventListener('click', async () => {
      try { await onHome(); } catch { showMessage('Nie udało się otworzyć Startu. Spróbuj ponownie.'); }
    });
    const siteItems = document.createElement('span'); siteItems.className = 'site-items';
    siteItems.addEventListener('click', event => handleLinkClick(event, onNavigate,
      () => showMessage('Nie udało się otworzyć strony. Spróbuj ponownie.')));
    nav.append(home, siteItems);
    const fullscreen = document.createElement('button'); fullscreen.type = 'button'; fullscreen.className = 'fullscreen';
    const fullscreenSupported = Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
    fullscreen.hidden = !fullscreenSupported;
    let fullscreenWanted = false;
    let restoreArmed = false;
    let fullscreenBusy = false;
    function updateFullscreen() {
      fullscreen.replaceChildren(icon(document.fullscreenElement || fullscreenWanted ? 'collapse' : 'expand'),
        document.fullscreenElement ? 'Opuść pełny ekran' : fullscreenWanted ? 'Wyłącz przywracanie' : 'Pełny ekran');
    }
    function setFullscreenIntent(enabled) {
      fullscreenWanted = enabled === true;
      restoreArmed = fullscreenWanted && !document.fullscreenElement;
      updateFullscreen();
    }
    fullscreenIntents.set(host, setFullscreenIntent);
    fullscreen.addEventListener('click', async () => {
      if (fullscreenBusy) return;
      fullscreenBusy = true;
      try {
        if (document.fullscreenElement || fullscreenWanted) {
          setFullscreenIntent(false);
          await Promise.all([document.fullscreenElement ? document.exitFullscreen() : undefined, onFullscreenIntent?.(false)]);
        } else {
          await document.documentElement.requestFullscreen();
          setFullscreenIntent(true);
          await onFullscreenIntent?.(true);
        }
        message.hidden = true; updateFullscreen();
      } catch { showMessage('Nie udało się włączyć lub zapamiętać pełnego ekranu. Spróbuj ponownie.'); }
      finally { fullscreenBusy = false; }
    });
    // Run after page handlers, without canceling the tap or stealing an already
    // consumed user activation. Navigation, form fields and media keep their gestures.
    window.addEventListener('click', event => {
      const path = event.composedPath();
      if (!fullscreenSupported || !fullscreenWanted || !restoreArmed || fullscreenBusy || document.hidden || document.fullscreenElement ||
          !event.isTrusted || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
          navigator.userActivation?.isActive === false || path.includes(host)) return;
      if (path.some(element => element.matches?.('a, input, textarea, select, label, video, audio, [contenteditable]:not([contenteditable="false"])') ||
          (element.matches?.('button') && element.form && ['submit', 'reset'].includes(element.type)))) return;
      // A closed custom component does not expose its inner control in the path.
      if (path[0]?.localName?.includes('-') && !path[0].shadowRoot) return;
      restoreArmed = false;
      fullscreenBusy = true;
      // Call synchronously while this tap still supplies user activation.
      try {
        Promise.resolve(document.documentElement.requestFullscreen())
          .catch(() => showMessage('Firefox nie pozwolił przywrócić pełnego ekranu.'))
          .finally(() => { fullscreenBusy = false; });
      } catch {
        fullscreenBusy = false;
        showMessage('Firefox nie pozwolił przywrócić pełnego ekranu.');
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && fullscreenWanted && !document.fullscreenElement) restoreArmed = true;
    });
    updateFullscreen(); nav.append(fullscreen);
    const settings = document.createElement('button'); settings.type = 'button'; settings.className = 'settings';
    settings.hidden = !settingsAvailable;
    settings.append(icon('settings'), 'Ustawienia');
    settings.addEventListener('click', async () => {
      try { await onSettings?.(); } catch { showMessage('Nie udało się otworzyć ustawień. Spróbuj ponownie.'); }
    });
    nav.append(settings);
    function showMessage(text) { message.textContent = text; message.hidden = false; }
    function setOpen(open, restoreFocus = false) {
      nav.hidden = !open; trigger.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('aria-label', open ? 'Zamknij menu stron' : 'Otwórz menu stron');
      if (open) { nav.scrollLeft = 0; home.focus({ preventScroll: true }); }
      else { message.hidden = true; if (restoreFocus) trigger.focus({ preventScroll: true }); }
    }
    trigger.addEventListener('click', () => setOpen(nav.hidden));
    document.addEventListener('pointerdown', event => {
      if (!nav.hidden && !event.composedPath().includes(host)) setOpen(false);
    }, true);
    document.addEventListener('keydown', event => {
      if (event.isTrusted && event.key === 'Escape' && document.fullscreenElement && fullscreenWanted) {
        setFullscreenIntent(false);
        Promise.resolve(onFullscreenIntent?.(false)).catch(() => showMessage('Nie udało się zapamiętać wyłączenia pełnego ekranu.'));
      }
      if (event.key === 'Escape' && !nav.hidden) { setOpen(false, true); event.preventDefault(); }
    }, true);
    shadow.addEventListener('focusout', event => {
      if (!shadow.contains(event.relatedTarget)) setOpen(false);
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && fullscreenWanted) restoreArmed = true;
      updateFullscreen();
    });
    bar.append(nav, trigger); shadow.append(style, bar, message);
    document.documentElement.append(host); instance = host; setLinks(host, links);
    return host;
  }
  function setLinks(host, links) {
    const items = rootFor(host)?.querySelector('.site-items');
    if (!items) return;
    items.replaceChildren(...links.map(link => {
      const a = document.createElement('a'); a.href = link.url;
      a.append(icon(link.icon), link.label); return a;
    }));
  }
  function setSettingsAvailable(host, available) {
    const button = rootFor(host)?.querySelector('.settings');
    if (button) button.hidden = !available;
  }
  function notify(host, text) {
    const message = rootFor(host)?.querySelector('.message');
    if (message) { message.textContent = text; message.hidden = !text; }
  }
  function setFullscreenIntent(host, enabled) { fullscreenIntents.get(host)?.(enabled); }
  globalThis.LazyLauncher = Object.freeze({ mount, icon, setLinks, setSettingsAvailable, notify, handleLinkClick, setFullscreenIntent });
})();
