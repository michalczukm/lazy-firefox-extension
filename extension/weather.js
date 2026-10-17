export const REFRESH_MS = 15 * 60_000;
const endpoint = new URL('https://api.open-meteo.com/v1/forecast');
endpoint.search = new URLSearchParams({
  latitude: '54.352', longitude: '18.6466',
  current: 'temperature_2m,apparent_temperature,weather_code',
  daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  timezone: 'Europe/Warsaw', forecast_days: '1',
}).toString();

export function conditionLabel(code) {
  if (code === 0) return 'Bezchmurnie';
  if (code === 1) return 'Przeważnie słonecznie';
  if (code === 2) return 'Częściowe zachmurzenie';
  if (code === 3) return 'Pochmurno';
  if ([45, 48].includes(code)) return 'Mgła';
  if ([51, 53, 55].includes(code)) return 'Mżawka';
  if ([56, 57].includes(code)) return 'Marznąca mżawka';
  if ([61, 63, 65].includes(code)) return 'Deszcz';
  if ([66, 67].includes(code)) return 'Marznący deszcz';
  if ([71, 73, 75, 77].includes(code)) return 'Śnieg';
  if ([80, 81, 82].includes(code)) return 'Przelotny deszcz';
  if ([85, 86].includes(code)) return 'Przelotny śnieg';
  if ([95, 96, 99].includes(code)) return 'Burza';
  return 'Brak opisu pogody';
}

function validData(data) {
  return data && /^\d{4}-\d{2}-\d{2}$/.test(data.date) &&
    Number.isFinite(Date.parse(`${data.date}T00:00:00Z`)) &&
    new Date(`${data.date}T00:00:00Z`).toISOString().slice(0, 10) === data.date &&
    typeof data.observedAt === 'string' &&
    new RegExp(`^${data.date}T(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$`).test(data.observedAt) &&
    ['temperature', 'feelsLike', 'high', 'low'].every(key =>
      typeof data[key] === 'number' && Number.isFinite(data[key]) && data[key] >= -100 && data[key] <= 100) &&
    data.high >= data.low && Number.isInteger(data.code) && data.code >= 0 &&
    typeof data.rain === 'number' && Number.isFinite(data.rain) && data.rain >= 0 && data.rain <= 100;
}

export function parseWeather(raw) {
  const current = raw?.current;
  const daily = raw?.daily;
  const data = {
    date: daily?.time?.[0], observedAt: current?.time,
    temperature: current?.temperature_2m, feelsLike: current?.apparent_temperature,
    code: current?.weather_code, high: daily?.temperature_2m_max?.[0],
    low: daily?.temperature_2m_min?.[0], rain: daily?.precipitation_probability_max?.[0],
  };
  if (!validData(data)) throw new Error('Nieprawidłowe dane pogody');
  return data;
}

export function localDate(now) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

function validEntry(entry, now) {
  return entry && validData(entry.data) && Number.isFinite(entry.savedAt) &&
    entry.savedAt > 0 && entry.savedAt <= now;
}

export function isFresh(entry, now = Date.now()) {
  return Boolean(validEntry(entry, now) && now - entry.savedAt < REFRESH_MS &&
    entry.data.date === localDate(now));
}

let pending;

export function loadWeather(options) {
  if (pending) return pending;
  pending = refresh(options).finally(() => { pending = undefined; });
  return pending;
}

async function refresh({ storage, fetcher = fetch, now = Date.now(), force = false }) {
  let cached;
  try {
    const entry = (await storage.get('weather')).weather;
    if (validEntry(entry, now)) cached = entry;
  } catch { /* A failed cache must not prevent a live request. */ }
  if (!force && isFresh(cached, now)) return { ...cached, state: 'fresh' };
  try {
    const response = await fetcher(endpoint.href, {
      credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error('Błąd pobierania pogody');
    const data = parseWeather(await response.json());
    if (data.date !== localDate(now)) throw new Error('Nieaktualna prognoza');
    const entry = { savedAt: now, data };
    try { await storage.set({ weather: entry }); } catch { /* Still show successful live data. */ }
    return { ...entry, state: 'fresh' };
  } catch {
    return cached ? { ...cached, state: 'stale' } : { state: 'unavailable' };
  }
}
