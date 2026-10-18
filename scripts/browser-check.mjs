import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';

// Verify the shipped scripts through agent-browser, without a second test framework.
const session = `lazy-check-${process.pid}`;
const execute = promisify(execFile);
async function command(...args) {
  const { stdout } = await execute('agent-browser', ['--session', session, ...args], { encoding: 'utf8', timeout: 30_000 });
  return stdout;
}
async function evaluate(source) {
  return JSON.parse(await command('--json', 'eval', source)).data.result;
}
async function clickNamed(name) {
  const snapshot = await command('snapshot', '-i');
  const line = snapshot.split('\n').find(line => line.includes(`button "${name}"`));
  assert.ok(line, `Button exists: ${name}\n${snapshot}`);
  const ref = line.match(/ref=(e\d+)/)[1];
  await command('click', `@${ref}`);
}
const standalone = process.argv.includes('--site');
const root = resolve(standalone ? 'dist/site' : 'extension');
const siteHeaders = standalone ? Object.fromEntries((await readFile(resolve(root, '_headers'), 'utf8'))
  .split('\n').filter(line => line.startsWith('  ')).map(line => {
    const separator = line.indexOf(':');
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  })) : {};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const server = createServer(async (request, response) => {
  for (const [name, value] of Object.entries(siteHeaders)) response.setHeader(name, value);
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/host.html') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html lang="pl"><title>Obca strona</title><style>html{font-size:30px;--lazy-color-ink:red}button{background:red!important;font-size:80px!important}div{color:red!important}*{box-sizing:content-box}</style><body><h1>Obca strona</h1><button id="host-action">Przycisk strony</button><script src="links.js"></script><script src="launcher-theme.js"></script><script src="launcher.js"></script></body></html>');
    return;
  }
  const file = resolve(root, `.${decodeURIComponent(pathname === '/' ? '/index.html' : pathname)}`);
  if (!file.startsWith(`${root}/`)) { response.writeHead(403).end(); return; }
  try { response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); response.end(await readFile(file)); }
  catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(Date.now());
const fixture = {
  current: { time: `${date}T12:00`, temperature_2m: 12, apparent_temperature: 10, weather_code: 3 },
  daily: { time: [date], temperature_2m_max: [14], temperature_2m_min: [7], precipitation_probability_max: [35] },
};
const shadow = 'document.querySelector("#lazy-start-launcher").shadowRoot';
const scratch = await mkdtemp(resolve(tmpdir(), 'lazy-browser-'));
const initScript = resolve(scratch, 'weather-fixture.js');
await writeFile(initScript, `
  window.weatherOffline = sessionStorage.getItem('weather-offline') === 'true';
  const originalFetch = window.fetch.bind(window);
  window.fetch = (url, options) => String(url).startsWith('https://api.open-meteo.com/')
    ? window.weatherOffline ? Promise.reject(new TypeError('offline fixture'))
      : Promise.resolve(new Response(JSON.stringify(${JSON.stringify(fixture)}), {status: 200}))
    : originalFetch(url, options);
`);
try {
  await command('--init-script', initScript, 'open', `${origin}/host.html`);
  const tab = (await command('tab', 'list')).match(/\[(t\d+)\]/)[1];
  await command('tab', tab);
  await command('open', `${origin}/${standalone ? '' : 'dashboard.html'}`);
  await command('wait', '.weather[data-state="fresh"]');
  assert.equal(await evaluate('document.getElementById("temperature").textContent'), '12');
  assert.equal(await evaluate('document.documentElement.lang'), 'pl');
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".site-link"), a => a.href)'), ['https://lazy-diet.workers.dev/', 'https://lazy-tea.pages.dev/', 'https://lazy-list.michalczukm.xyz/']);
  assert.match(await evaluate('getComputedStyle(document.documentElement).fontFamily'), /Atkinson Hyperlegible Next/);
  assert.equal(await evaluate('document.getElementById("refresh").getBoundingClientRect().width'), 48);
  assert.equal(await evaluate(`document.fonts.ready.then(() => document.fonts.check('16px "Atkinson Hyperlegible Next"'))`), true);

  await evaluate('document.documentElement.dataset.lazyTheme = "dark"; document.querySelector("#lazy-start-launcher").dataset.lazyTheme = "dark"');
  assert.equal(await evaluate('getComputedStyle(document.documentElement).backgroundColor'), 'rgb(34, 39, 34)');
  await clickNamed('Otwórz menu stron');
  assert.equal(await evaluate(`getComputedStyle(${shadow}.querySelector('.trigger')).backgroundColor`), 'rgb(232, 196, 107)');
  assert.equal(await evaluate(`getComputedStyle(${shadow}.querySelector('.trigger')).color`), 'rgb(36, 41, 31)');
  const darkA11y = JSON.parse(await command('a11y', '--json'));
  assert.equal(darkA11y.data.counts.violations, 0, 'Dark theme has no axe violations');
  await command('press', 'Escape');
  await evaluate('document.documentElement.dataset.lazyTheme = "light"; document.querySelector("#lazy-start-launcher").dataset.lazyTheme = "light"');
  if (standalone) {
    await clickNamed('Otwórz menu stron');
    await clickNamed('Start');
    await command('wait', '.weather[data-state="fresh"]');
    assert.equal(new URL(await evaluate('location.href')).pathname, '/dashboard.html');
    await command('open', `${origin}/`);
    await command('wait', '.weather[data-state="fresh"]');
  }

  // Returning with a 14-minute-old cache must refresh in one minute, not 15.
  await evaluate(`(() => {
    const entry = JSON.parse(localStorage.getItem('weather'));
    entry.savedAt = Date.now() - 14 * 60_000;
    localStorage.setItem('weather', JSON.stringify(entry));
    window.originalTimeout = window.setTimeout;
    window.nextRefresh = null;
    window.setTimeout = (fn, delay, ...args) => {
      window.nextRefresh = delay;
      return window.originalTimeout(fn, delay, ...args);
    };
    document.dispatchEvent(new Event('visibilitychange'));
  })()`);
  await command('wait', '.weather[aria-busy="false"]');
  const nextRefresh = await evaluate('window.nextRefresh');
  assert.ok(nextRefresh > 50_000 && nextRefresh <= 60_000, 'Refresh follows cached timestamp after foregrounding');
  await evaluate('window.setTimeout = window.originalTimeout');

  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [320, 640]]) {
    await command('set', 'viewport', String(width), String(height));
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `No page overflow at ${width}`);
    await clickNamed('Otwórz menu stron');
    assert.equal(await evaluate(`${shadow}.querySelector('nav').hidden`), false);
    assert.equal(await evaluate('document.querySelector("#lazy-start-launcher").getBoundingClientRect().left >= 0'), true);
    assert.equal(await evaluate(`${shadow}.querySelector('.trigger').getBoundingClientRect().width`), 48);
    await command('press', 'Escape');
    assert.equal(await evaluate(`${shadow}.querySelector('nav').hidden`), true);
    assert.equal(await evaluate(`${shadow}.activeElement.className`), 'trigger');
  }
  await clickNamed('Otwórz menu stron');
  await command('click', '#city');
  assert.equal(await evaluate(`${shadow}.querySelector('nav').hidden`), true, 'Outside click closes');

  await evaluate('document.documentElement.requestFullscreen = () => Promise.reject(new Error("test rejection"))');
  await clickNamed('Otwórz menu stron');
  await evaluate(`${shadow}.querySelector('nav').scrollLeft = ${shadow}.querySelector('nav').scrollWidth`);
  await clickNamed('Pełny ekran');
  assert.equal(await evaluate(`${shadow}.querySelector('.message').hidden`), false, 'Fullscreen rejection is visible');
  await command('press', 'Escape');

  await evaluate('window.weatherOffline = true');
  await clickNamed('Odśwież pogodę');
  await command('wait', '.weather[data-state="stale"]');
  assert.equal(await evaluate('document.getElementById("temperature").textContent'), '12');
  await evaluate('localStorage.clear(); sessionStorage.setItem("weather-offline", "true")');
  await command('reload');
  await command('wait', '.weather[data-state="unavailable"]');
  assert.equal(await evaluate('document.querySelectorAll(".site-link").length'), 3);
  assert.equal(await evaluate('document.getElementById("forecast").hidden'), true);
  assert.equal(await evaluate('document.getElementById("refresh").disabled'), false);
  const a11y = JSON.parse(await command('a11y', '--json'));
  assert.equal(a11y.data.counts.violations, 0, 'No axe violations');

  await command('open', `${origin}/host.html`);
  await evaluate('LazyLauncher.mount({onHome: () => { document.title = "Start wybrany"; }}); LazyLauncher.mount({onHome: () => {}})');
  assert.equal(await evaluate('document.querySelectorAll("#lazy-start-launcher").length'), 1, 'No duplicate launcher');
  const countAfterSecondContext = await evaluate(`new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'launcher.js';
    script.onload = () => {
      LazyLauncher.mount({onHome: () => {}});
      resolve(document.querySelectorAll('#lazy-start-launcher').length);
    };
    script.onerror = reject;
    document.head.append(script);
  })`);
  assert.equal(countAfterSecondContext, 1, 'Hosted dashboard and extension share one launcher');
  assert.equal(await evaluate('getComputedStyle(document.getElementById("host-action")).backgroundColor'), 'rgb(255, 0, 0)', 'Page CSS preserved');
  assert.equal(await evaluate(`getComputedStyle(${shadow}.querySelector('.trigger')).width`), '48px', 'Host CSS does not resize trigger');
  assert.equal(await evaluate(`getComputedStyle(${shadow}.querySelector('.trigger')).color`), 'rgb(38, 61, 51)', 'Host custom properties do not recolor the launcher');
  await clickNamed('Otwórz menu stron');
  await clickNamed('Start');
  assert.equal(await evaluate('document.title'), 'Start wybrany');
  console.log(`Browser acceptance passed (${standalone ? 'standalone site with CSP' : 'extension scripts'}): desktop/tablet/390px/320px, shared links, isolated injection, menu focus, fullscreen rejection, cached/offline weather, axe.`);
} finally {
  await command('close'); server.close(); await rm(scratch, { recursive: true, force: true });
}
