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
const root = resolve('extension');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/host.html') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html lang="pl"><title>Obca strona</title><style>button{background:red!important;font-size:80px!important}div{color:red!important}*{box-sizing:content-box}</style><body><h1>Obca strona</h1><button id="host-action">Przycisk strony</button><script src="links.js"></script><script src="launcher.js"></script></body></html>');
    return;
  }
  const file = resolve(root, `.${decodeURIComponent(pathname)}`);
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
  await command('open', `${origin}/dashboard.html`);
  await command('wait', '.weather[data-state="fresh"]');
  assert.equal(await evaluate('document.getElementById("temperature").textContent'), '12');
  assert.equal(await evaluate('document.documentElement.lang'), 'pl');
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".site-link"), a => a.href)'), ['https://lazy-diet.workers.dev/', 'https://lazy-tea.pages.dev/']);

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
  assert.equal(await evaluate('document.querySelectorAll(".site-link").length'), 2);
  assert.equal(await evaluate('document.getElementById("forecast").hidden'), true);
  assert.equal(await evaluate('document.getElementById("refresh").disabled'), false);
  const a11y = JSON.parse(await command('a11y', '--json'));
  assert.equal(a11y.data.counts.violations, 0, 'No axe violations');

  await command('open', `${origin}/host.html`);
  await evaluate('LazyLauncher.mount({onHome: () => { document.title = "Start wybrany"; }}); LazyLauncher.mount({onHome: () => {}})');
  assert.equal(await evaluate('document.querySelectorAll("#lazy-start-launcher").length'), 1, 'No duplicate launcher');
  assert.equal(await evaluate('getComputedStyle(document.getElementById("host-action")).backgroundColor'), 'rgb(255, 0, 0)', 'Page CSS preserved');
  assert.equal(await evaluate(`getComputedStyle(${shadow}.querySelector('.trigger')).width`), '48px', 'Host CSS does not resize trigger');
  await clickNamed('Otwórz menu stron');
  await clickNamed('Start');
  assert.equal(await evaluate('document.title'), 'Start wybrany');
  console.log('Browser acceptance passed: desktop/tablet/390px/320px, shared links, isolated injection, menu focus, fullscreen rejection, cached/offline weather, axe.');
} finally {
  await command('close'); server.close(); await rm(scratch, { recursive: true, force: true });
}
