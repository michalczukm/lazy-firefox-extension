globalThis.LazyLauncher.mount({
  onHome: () => browser.runtime.sendMessage({ type: 'open-dashboard' }),
});
