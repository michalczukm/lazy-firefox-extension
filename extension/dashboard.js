import './links.js';
import './launcher-theme.js';
import './launcher.js';
import { loadWeather, conditionLabel, localDate, REFRESH_MS } from './weather.js';

const $ = id => document.getElementById(id);
const dateFormat = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', weekday: 'long', day: 'numeric', month: 'long' });
const savedFormat = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const numberFormat = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
const degrees = value => `${numberFormat.format(Math.round(value))}°`;
const weather = document.querySelector('.weather');
const refresh = $('refresh');
let busy = false;
let timer;
// Standalone hosting and local preview use browser storage without extension APIs.
const storage = globalThis.browser?.storage.local || {
  async get(key) { return { [key]: JSON.parse(localStorage.getItem(key)) }; },
  async set(values) { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value)); },
};

globalThis.LazyLauncher.mount({ onHome: () => { location.href = 'dashboard.html'; } });
refresh.append(globalThis.LazyLauncher.icon('refresh'));

for (const link of globalThis.LAZY_LINKS) {
  const a = document.createElement('a'); a.className = 'lazy-link-row site-link'; a.href = link.url;
  const text = document.createElement('span');
  const title = document.createElement('strong'); title.textContent = link.label;
  const description = document.createElement('small'); description.textContent = link.description;
  text.append(title, description);
  a.append(globalThis.LazyLauncher.icon(link.icon), text, globalThis.LazyLauncher.icon('arrow'));
  $('site-links').append(a);
}

function updateDate() {
  const now = Date.now();
  $('today').textContent = dateFormat.format(now); $('today').dateTime = localDate(now);
}

function render(result) {
  weather.dataset.state = result.state;
  const data = result.data;
  $('forecast').hidden = !data;
  if (!data) {
    $('temperature').textContent = '—'; $('condition').textContent = 'Pogoda jest teraz niedostępna';
    $('feels-like').textContent = 'Twoje strony nadal są pod ręką.';
    $('weather-icon').replaceChildren();
    $('weather-status').textContent = 'Nie udało się pobrać pogody. Sprawdź połączenie i spróbuj ponownie.';
    return;
  }
  $('temperature').textContent = numberFormat.format(Math.round(data.temperature));
  $('condition').textContent = conditionLabel(data.code);
  $('feels-like').textContent = `Odczuwalna ${degrees(data.feelsLike)}C`;
  $('high').textContent = `${degrees(data.high)}C`; $('low').textContent = `${degrees(data.low)}C`;
  $('rain').textContent = `${numberFormat.format(data.rain)}%`;
  const icon = data.code <= 1 ? 'sun' : [71, 73, 75, 77, 85, 86].includes(data.code) ? 'snow' :
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(data.code) ? 'rain' : 'cloud';
  $('weather-icon').replaceChildren(globalThis.LazyLauncher.icon(icon));
  const forecastDate = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: 'numeric', month: 'long' });
  $('forecast-title').textContent = data.date === localDate(Date.now()) ? 'Dzisiaj' :
    `Prognoza z ${forecastDate.format(new Date(`${data.date}T12:00:00Z`))}`;
  $('weather-status').textContent = result.state === 'stale' ?
    `Brak nowych danych. Ostatni zapis: ${savedFormat.format(result.savedAt)}.` :
    `Aktualizacja: ${savedFormat.format(result.savedAt)}.`;
}

async function update(force = false) {
  if (busy || document.hidden) return;
  clearTimeout(timer);
  busy = true; refresh.disabled = true;
  refresh.setAttribute('aria-label', 'Pobieranie pogody…'); refresh.title = 'Pobieranie pogody…';
  weather.setAttribute('aria-busy', 'true'); updateDate();
  let result;
  try { result = await loadWeather({ storage, force }); render(result); }
  finally {
    busy = false; refresh.disabled = false;
    refresh.setAttribute('aria-label', 'Odśwież pogodę'); refresh.title = 'Odśwież pogodę';
    weather.setAttribute('aria-busy', 'false');
    if (!document.hidden) {
      const delay = result?.state === 'fresh' ? Math.max(1000, result.savedAt + REFRESH_MS - Date.now()) : REFRESH_MS;
      timer = setTimeout(() => update(), delay);
    }
  }
}
refresh.addEventListener('click', () => update(true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(timer);
  else update();
});
window.addEventListener('online', () => update(true));
window.addEventListener('pageshow', () => update());
updateDate();
update();
