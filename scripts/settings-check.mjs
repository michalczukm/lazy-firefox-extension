import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { extensionFixture } from './extension-fixture.mjs';

const execute = promisify(execFile);
const session = `lazy-settings-${process.pid}`;
async function command(...args) {
  return (await execute('agent-browser', ['--session', session, ...args], { encoding: 'utf8', timeout: 30_000 })).stdout;
}
async function evaluate(source) { return JSON.parse(await command('--json', 'eval', source)).data.result; }
async function clickNamed(name, role = 'button') {
  const line = (await command('snapshot', '-i')).split('\n').find(line => line.includes(`${role} "${name}"`));
  assert.ok(line, `${role} exists: ${name}`);
  await command('click', '@' + line.match(/ref=(e\d+)/)[1]);
}
async function linkClick(selector, properties = {}) {
  const intercepted = await evaluate(`(() => {
    let intercepted;
    window.addEventListener('click', event => { intercepted = event.defaultPrevented; event.preventDefault(); }, { once: true });
    ${selector}.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ...${JSON.stringify(properties)} }));
    return intercepted;
  })()`);
  return intercepted;
}
async function activateApp(selector, id) {
  const intercepted = await linkClick(selector);
  assert.equal(intercepted, true, 'Extension handles normal app taps');
  await evaluate('window.navigationComplete');
  assert.equal(await evaluate(`window.fixtureTabs.find(tab => tab.id === ${id}).active`), true);
}
async function mockFullscreen() {
  await evaluate(`(() => {
    window.fullscreenCalls = 0; window.pageTaps = 0; window.testFullscreen = null;
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => window.testFullscreen });
    document.documentElement.requestFullscreen = () => {
      window.fullscreenCalls++;
      window.fullscreenHadActivation = navigator.userActivation.isActive;
      if (window.rejectFullscreen) return Promise.reject(new Error('Fullscreen fixture'));
      window.testFullscreen = document.documentElement;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    };
    document.exitFullscreen = async () => {
      window.testFullscreen = null; document.dispatchEvent(new Event('fullscreenchange'));
    };
    const button = document.createElement('button'); button.id = 'page-action'; button.textContent = 'Akcja strony';
    button.addEventListener('click', () => window.pageTaps++); document.body.append(button);
    const component = document.createElement('div'); component.id = 'shadow-fields';
    const input = document.createElement('input'); input.id = 'shadow-input'; input.setAttribute('aria-label', 'Pole komponentu');
    component.attachShadow({mode:'open'}).append(input); document.body.append(component);
  })()`);
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/host.html') {
    response.setHeader('Content-Type', types['.html']);
    response.end('<!doctype html><html lang="pl"><meta charset="utf-8"><title>Zwykła strona</title><h1>Zwykła strona</h1><script src="links.js"></script><script src="launcher-theme.js"></script><script src="launcher.js"></script><script src="content.js"></script></html>'); return;
  }
  const hosted = path.startsWith('/hosted/');
  const root = resolve(hosted ? 'dist/site' : 'extension');
  const relative = hosted ? path.slice('/hosted'.length) : path;
  const file = resolve(root, '.' + (relative === '/' ? '/index.html' : decodeURIComponent(relative)));
  if (!file.startsWith(root + '/')) { response.writeHead(403).end(); return; }
  try { response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); response.end(await readFile(file)); }
  catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const scratch = await mkdtemp(resolve(tmpdir(), 'lazy-settings-'));
const init = resolve(scratch, 'extension.js');
await writeFile(init, await extensionFixture(origin));
await mkdir('.impeccable/review', { recursive: true });
try {
  await command('--init-script', init, 'open', origin + '/settings.html');
  const tab = (await command('tab', 'list')).match(/\[(t\d+)\]/)[1];
  await command('tab', tab);
  await command('set', 'viewport', '1024', '768');
  await command('wait', '#link-fields:not([disabled])');
  assert.equal(await evaluate('document.getElementById("empty-links").hidden'), false);
  assert.equal(await evaluate('document.querySelectorAll("input").length'), 2, 'No icon picker');
  await command('fill', '#link-label', 'Kalendarz');
  await command('fill', '#link-url', 'https://calendar.example/');
  await clickNamed('Dodaj stronę');
  await command('wait', '#custom-links li');
  assert.equal(await evaluate('document.querySelector(".custom-name").textContent'), 'Kalendarz');
  assert.equal(await evaluate('document.activeElement.id'), 'link-label');

  await command('fill', '#link-label', 'Duplikat');
  await command('fill', '#link-url', 'https://calendar.example');
  await clickNamed('Dodaj stronę');
  assert.equal(await evaluate('document.getElementById("link-url").getAttribute("aria-invalid")'), 'true');
  assert.equal(await evaluate('document.activeElement.id'), 'link-url');
  assert.equal(await evaluate('document.querySelectorAll("#custom-links li").length'), 1);
  await command('fill', '#link-url', 'javascript:alert(1)');
  await clickNamed('Dodaj stronę');
  assert.equal(await evaluate('document.querySelectorAll("#custom-links li").length'), 1);

  await command('fill', '#link-label', '<b>Strona</b>');
  await command('fill', '#link-url', 'https://text.example/');
  await clickNamed('Dodaj stronę');
  assert.equal(await evaluate('document.querySelectorAll("#custom-links li").length'), 2);
  assert.equal(await evaluate('document.querySelectorAll("#custom-links b").length'), 0);
  await command('click', 'button[aria-label="Usuń stronę <b>Strona</b>"]');
  await command('reload');
  await command('wait', '#link-fields:not([disabled])');
  assert.equal(await evaluate('document.querySelectorAll("#custom-links li").length'), 1, 'Persists across reload');
  await command('screenshot', '--full', resolve('.impeccable/review/settings-desktop.png'));
  await command('set', 'viewport', '390', '844');
  await command('screenshot', '--full', resolve('.impeccable/review/settings-mobile.png'));
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  const accessibility = JSON.parse(await command('a11y', '--json'));
  assert.equal(accessibility.data.counts.violations, 0);
  await command('set', 'viewport', '1024', '768');

  await command('open', origin + '/dashboard.html');
  await command('wait', '.site-link:nth-child(4)');
  assert.equal(await evaluate('document.querySelector(".site-link:last-child strong").textContent'), 'Kalendarz');
  assert.equal(await evaluate('document.querySelector(".site-link:last-child circle").getAttribute("r")'), '3');
  assert.equal(await evaluate('document.getElementById("open-settings").hidden'), false);
  await evaluate('window.fixtureTabs.push({id:2,windowId:1,url:"https://lazy-diet.workers.dev/recipes/123"})');
  await activateApp('document.querySelector(".site-link")', 2);
  assert.equal(await evaluate('window.fixtureTabs[1].url'), 'https://lazy-diet.workers.dev/recipes/123');
  assert.equal(new URL(await evaluate('location.href')).pathname, '/dashboard.html');
  await evaluate('window.fixtureTabs[1].active = false');
  await clickNamed('Otwórz menu stron');
  await activateApp('document.getElementById("lazy-start-launcher").shadowRoot.querySelector(".site-items a")', 2);
  assert.equal(await evaluate('document.getElementById("lazy-start-launcher").shadowRoot.querySelector(".site-items a:last-child").href'), 'https://calendar.example/');
  await command('screenshot', '--full', resolve('.impeccable/review/custom-dashboard.png'));
  await command('press', 'Escape');
  await mockFullscreen();
  await clickNamed('Otwórz menu stron');
  await clickNamed('Pełny ekran');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("fullscreenIntent"))'), true, 'Packaged dashboard remembers fullscreen');
  await evaluate('document.exitFullscreen()');
  await command('press', 'Escape');
  await activateApp('document.querySelector(".site-link")', 2);
  await command('click', '.site-link:first-child');
  await evaluate('window.navigationComplete');
  assert.equal(await evaluate('window.fullscreenCalls'), 1, 'Dashboard navigation does not restore fullscreen on the departing page');

  await command('open', origin + '/host.html');
  await command('wait', '#lazy-start-launcher');
  await mockFullscreen();
  assert.equal(await evaluate('window.fullscreenCalls'), 0, 'Never requests fullscreen on page load');
  await evaluate('document.getElementById("page-action").click()');
  assert.equal(await evaluate('window.fullscreenCalls'), 0, 'Synthetic clicks cannot restore fullscreen');
  await clickNamed('Pole komponentu', 'textbox');
  assert.equal(await evaluate('window.fullscreenCalls'), 0, 'Shadow DOM form controls keep their gesture');
  await evaluate('document.getElementById("page-action").addEventListener("click", event => event.preventDefault(), {once:true})');
  await command('click', '#page-action');
  assert.equal(await evaluate('window.fullscreenCalls'), 0, 'Page handlers can reserve their own gesture');
  await command('click', '#page-action');
  assert.equal(await evaluate('window.fullscreenCalls'), 1, 'First real destination tap restores fullscreen');
  assert.equal(await evaluate('window.fullscreenHadActivation'), true);
  assert.equal(await evaluate('window.pageTaps'), 3, 'Restoring fullscreen preserves the page action');
  await clickNamed('Otwórz menu stron');
  await clickNamed('Opuść pełny ekran');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("fullscreenIntent"))'), false, 'Explicit exit disables restoration');
  await command('press', 'Escape');
  await command('click', '#page-action');
  assert.equal(await evaluate('window.fullscreenCalls'), 1, 'No re-entry after opting out');
  await clickNamed('Otwórz menu stron');
  await clickNamed('Pełny ekran');
  await evaluate('document.exitFullscreen(); window.rejectFullscreen = true');
  await command('press', 'Escape');
  await command('click', '#page-action');
  const rejectedCalls = await evaluate('window.fullscreenCalls');
  assert.equal(rejectedCalls, 3, 'Restoration was attempted after the automatic exit');
  assert.ok((await command('snapshot')).includes('Firefox nie pozwolił przywrócić'), 'Rejected fullscreen has accessible feedback');
  await command('click', '#page-action');
  assert.equal(await evaluate('window.fullscreenCalls'), rejectedCalls, 'Rejected restoration does not retry on every tap');
  await clickNamed('Otwórz menu stron');
  await clickNamed('Wyłącz przywracanie');
  await command('press', 'Escape');
  await evaluate('window.dispatchEvent(new CustomEvent("lazy-start:fullscreen-intent", {detail:"true"}))');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("fullscreenIntent"))'), false, 'Other sites cannot change the fullscreen preference through page events');
  await clickNamed('Otwórz menu stron');
  assert.equal(await evaluate('document.getElementById("lazy-start-launcher").shadowRoot'), null, 'Other sites cannot read private menu links');
  assert.ok((await command('snapshot', '-i')).includes('link "Kalendarz"'), 'Private menu contains custom link');
  await evaluate('window.fixtureTabs.push({id:2,windowId:1,url:"https://lazy-diet.workers.dev/recipes/123"})');
  await clickNamed('lazy-diet', 'link');
  await evaluate('window.navigationComplete');
  assert.equal(await evaluate('window.fixtureTabs[1].active'), true, 'Injected private menu reuses app tab');
  assert.equal(await evaluate('window.fixtureTabs[1].url'), 'https://lazy-diet.workers.dev/recipes/123');
  await clickNamed('Start');
  await evaluate('window.navigationComplete');
  assert.equal(await evaluate('window.fixtureTabs[2].url'), 'https://lazy.michalczukm.xyz/');
  assert.equal(new URL(await evaluate('location.href')).pathname, '/host.html', 'Start preserves the current page');
  const profileLinks = await evaluate('JSON.parse(localStorage.getItem("customLinks"))');
  await evaluate('window.extensionFixture.storage.local.set({customLinks: []})');
  assert.equal((await command('snapshot', '-i')).includes('link "Kalendarz"'), false);
  await evaluate(`window.extensionFixture.storage.local.set({customLinks: ${JSON.stringify(profileLinks)}})`);
  assert.ok((await command('snapshot', '-i')).includes('link "Kalendarz"'), 'Private menu updates while open');
  await command('screenshot', '--full', resolve('.impeccable/review/private-custom-menu.png'));
  await command('press', 'Escape');
  assert.equal(await evaluate('document.activeElement.id'), 'lazy-start-launcher', 'Focus returns inside the private launcher');
  await evaluate('window.dispatchEvent(new CustomEvent("lazy-start:open-settings"))');
  assert.equal(new URL(await evaluate('location.href')).pathname, '/host.html', 'Other sites cannot use hosted settings bridge');
  await evaluate('window.dispatchEvent(new CustomEvent("lazy-start:navigate", {detail: JSON.stringify({type:"open-link",url:"https://lazy-tea.pages.dev/"})}))');
  assert.equal(await evaluate('window.fixtureTabs.length'), 3, 'Other sites cannot use hosted navigation bridge');

  await command('open', origin + '/hosted/');
  await command('wait', '.weather[data-state="fresh"]');
  assert.equal(await evaluate('document.getElementById("open-settings").hidden'), true);
  assert.equal(await evaluate('document.querySelectorAll(".site-link").length'), 3);
  assert.equal(await linkClick('document.querySelector(".site-link")'), false, 'Standalone links work without the extension');
  await evaluate(`window.dispatchEvent(new CustomEvent('lazy-start:links', {detail: JSON.stringify({ok:true,customLinks:[]})}))`);
  assert.equal(await linkClick('document.querySelector(".site-link")'), false, 'Older extensions without navigation support retain ordinary links');
  // Exercise real bridge code at a local origin; origin filtering is pinned by Node tests.
  const content = await readFile('extension/content.js', 'utf8');
  await evaluate(`(() => { const browser = window.extensionFixture; const location = { href: 'https://lazy.michalczukm.xyz/' }; ${content} })()`);
  await command('wait', '.site-link:nth-child(4)');
  await evaluate('window.fixtureTabs.push({id:2,windowId:1,url:"https://lazy-diet.workers.dev/recipes/123"})');
  await activateApp('document.querySelector(".site-link")', 2);
  assert.equal(await evaluate('window.fixtureTabs[1].url'), 'https://lazy-diet.workers.dev/recipes/123');
  await evaluate('window.fixtureTabs[1].active = false');
  await clickNamed('Otwórz menu stron');
  await activateApp('document.getElementById("lazy-start-launcher").shadowRoot.querySelector(".site-items a")', 2);
  await command('press', 'Escape');
  for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
    assert.equal(await linkClick('document.querySelector(".site-link")', { [modifier]: true }), false, `${modifier} keeps native link behavior`);
  }
  assert.equal(await linkClick('document.querySelector(".site-link")', { button: 1 }), false, 'Middle clicks keep native behavior');
  await evaluate('window.fixtureTabs.push({id:3,windowId:1,url:"https://lazy.michalczukm.xyz/"})');
  await clickNamed('Otwórz menu stron');
  await clickNamed('Start');
  await evaluate('window.navigationComplete');
  assert.equal(await evaluate('window.fixtureTabs.find(tab => tab.id === 3).active'), true, 'Hosted Start reuses dashboard');
  await command('press', 'Escape');
  await evaluate('window.failNavigation = true');
  await activateApp('document.querySelector(".site-link")', 2);
  await command('wait', '#links-status:not([hidden])');
  assert.match(await evaluate('document.getElementById("links-status").textContent'), /Nie udało się otworzyć/);
  assert.equal(await evaluate('window.fixtureTabs.length'), 3, 'Failure does not create another tab');
  await evaluate('window.failNavigation = false');
  assert.equal(await evaluate('document.querySelectorAll("#lazy-start-launcher").length'), 1);
  await evaluate(`window.dispatchEvent(new CustomEvent('lazy-start:links', {detail: JSON.stringify({ok:true, customLinks:[{id:'00000000-0000-4000-8000-000000000001',label:'Unsafe',url:'javascript:alert(1)'}]})}))`);
  assert.equal(await evaluate('document.querySelectorAll(".site-link").length'), 4, 'Malformed bridge data does not replace links');
  assert.equal(await evaluate('document.querySelector(".site-link:last-child").href'), 'https://calendar.example/');
  const saved = await evaluate('JSON.parse(localStorage.getItem("customLinks"))');
  await evaluate('window.extensionFixture.storage.local.set({customLinks: []})');
  assert.equal(await evaluate('document.querySelectorAll(".site-link").length'), 3, 'Hosted page updates after storage change');
  await evaluate(`window.extensionFixture.storage.local.set({customLinks: ${JSON.stringify(saved)}})`);
  await command('wait', '.site-link:nth-child(4)');
  await command('screenshot', '--full', resolve('.impeccable/review/hosted-custom-dashboard.png'));
  await mockFullscreen();
  await clickNamed('Otwórz menu stron');
  await clickNamed('Pełny ekran');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("fullscreenIntent"))'), true, 'Hosted dashboard writes fullscreen intent through the trusted bridge');
  await evaluate('document.exitFullscreen()');
  await command('press', 'Escape');
  await activateApp('document.querySelector(".site-link")', 2);
  await command('click', '.site-link:first-child');
  await evaluate('window.navigationComplete');
  assert.equal(await evaluate('window.fullscreenCalls'), 1, 'Hosted dashboard link carries intent without restoring on departure');
  await command('open', origin + '/host.html');
  await command('wait', '#lazy-start-launcher');
  await mockFullscreen();
  await command('click', '#page-action');
  assert.equal(await evaluate('window.fullscreenCalls'), 1, 'Destination restores after a hosted dashboard link');
  await clickNamed('Otwórz menu stron');
  await clickNamed('Opuść pełny ekran');
  await command('open', origin + '/hosted/');
  await command('wait', '.weather[data-state="fresh"]');
  await evaluate(`(() => { const browser = window.extensionFixture; const location = { href: 'https://lazy.michalczukm.xyz/' }; ${content} })()`);
  await command('wait', '.site-link:nth-child(4)');
  await command('click', '#open-settings');
  await command('wait', '#link-fields:not([disabled])');
  assert.equal(new URL(await evaluate('location.href')).pathname, '/settings.html');
  await command('click', 'button[aria-label="Usuń stronę Kalendarz"]');
  assert.equal(await evaluate('document.getElementById("empty-links").hidden'), false);

  await evaluate('window.failExtensionWrites = true');
  await command('fill', '#link-label', 'Nowa');
  await command('fill', '#link-url', 'https://new.example/');
  await clickNamed('Dodaj stronę');
  assert.equal(await evaluate('document.getElementById("settings-status").dataset.error'), 'true');
  assert.equal(await evaluate('document.getElementById("link-url").value'), 'https://new.example/');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("customLinks")).length'), 0);
  await evaluate('window.failExtensionWrites = false');
  await clickNamed('Dodaj stronę');
  assert.equal(await evaluate('document.querySelectorAll("#custom-links li").length'), 1, 'Can retry failed save');
  console.log('Settings acceptance passed: settings, private menu, packaged/hosted tab reuse, fullscreen intent across dashboard navigation, first trusted tap, opt-out, rejection feedback, trusted bridge, responsive layout, axe.');
} finally {
  await command('close'); server.close(); await rm(scratch, { recursive: true, force: true });
}
