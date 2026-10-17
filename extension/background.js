const dashboardUrl = browser.runtime.getURL('dashboard.html');

browser.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== browser.runtime.id || message?.type !== 'open-dashboard' ||
      !Number.isInteger(sender.tab?.id)) return;
  return browser.tabs.update(sender.tab.id, { url: dashboardUrl });
});

browser.browserAction.onClicked.addListener(tab => {
  if (Number.isInteger(tab?.id)) return browser.tabs.update(tab.id, { url: dashboardUrl });
  return browser.tabs.create({ url: dashboardUrl });
});
