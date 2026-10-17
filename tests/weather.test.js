import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWeather, conditionLabel, isFresh, loadWeather } from '../extension/weather.js';

const now = Date.parse('2026-10-18T10:00:00Z');
const raw = {
  current: { time: '2026-10-18T12:00', temperature_2m: 12.4, apparent_temperature: 10.2, weather_code: 3 },
  daily: { time: ['2026-10-18'], temperature_2m_max: [14.1], temperature_2m_min: [7.2], precipitation_probability_max: [35] },
};
const memory = (initial) => ({
  value: initial,
  async get() { return { weather: this.value }; },
  async set({ weather }) { this.value = weather; },
});
const response = () => ({ ok: true, json: async () => structuredClone(raw) });

test('normalizes real weather and translates WMO conditions', () => {
  assert.deepEqual(parseWeather(raw), { date: '2026-10-18', observedAt: '2026-10-18T12:00', temperature: 12.4, feelsLike: 10.2, code: 3, high: 14.1, low: 7.2, rain: 35 });
  assert.equal(conditionLabel(3), 'Pochmurno');
  assert.equal(conditionLabel(999), 'Brak opisu pogody');
  for (const code of [0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99]) {
    assert.notEqual(conditionLabel(code), 'Brak opisu pogody');
  }
});

test('rejects null/missing/invalid API data without coercing it to zero', () => {
  for (const bad of [null, {}, { ...raw, current: { ...raw.current, temperature_2m: null } }, { ...raw, daily: { ...raw.daily, precipitation_probability_max: [101] } }, { ...raw, daily: { ...raw.daily, time: ['2026-10-19'] } }]) {
    assert.throws(() => parseWeather(bad));
  }
});

test('freshness rejects old, future and previous-day snapshots', () => {
  const entry = { savedAt: now, data: parseWeather(raw) };
  assert.equal(isFresh(entry, now + 14 * 60_000), true);
  assert.equal(isFresh(entry, now + 15 * 60_000), false);
  assert.equal(isFresh({ ...entry, savedAt: now + 60_000 }, now), false);
  assert.equal(isFresh({ ...entry, data: { ...entry.data, date: '2026-10-17' } }, now), false);
});

test('rejects malformed observation times and impossible calendar dates', () => {
  for (const time of ['2026-10-18T99:99', '2026-10-18T12:00junk', '2026-10-18T24:01', '2026-10-18T12:60', '2026-10-18T12:00:99']) {
    assert.throws(() => parseWeather({ ...raw, current: { ...raw.current, time } }), time);
  }
  const bad = { ...raw, current: { ...raw.current, time: '2026-02-30T12:00' }, daily: { ...raw.daily, time: ['2026-02-30'] } };
  assert.throws(() => parseWeather(bad));
});

test('fetches once, caches validated weather and reuses a fresh result', async () => {
  const storage = memory(); let calls = 0;
  const fetcher = async (url, options) => {
    calls++;
    assert.equal(new URL(url).hostname, 'api.open-meteo.com');
    assert.equal(new URL(url).searchParams.get('timezone'), 'Europe/Warsaw');
    assert.equal(options.credentials, 'omit');
    return response();
  };
  const first = await loadWeather({ storage, fetcher, now });
  assert.equal(first.state, 'fresh');
  assert.equal(storage.value.data.temperature, 12.4);
  assert.equal((await loadWeather({ storage, fetcher, now })).state, 'fresh');
  assert.equal(calls, 1);
});

test('network/HTTP/malformed response failures preserve the last known weather', async () => {
  for (const fetcher of [async () => { throw Error('offline'); }, async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({}) })]) {
    const storage = memory({ savedAt: now - 3_600_000, data: parseWeather(raw) });
    const result = await loadWeather({ storage, fetcher, now });
    assert.equal(result.state, 'stale');
    assert.equal(result.data.temperature, 12.4);
    assert.equal(result.savedAt, now - 3_600_000);
  }
});

test('corrupt cache and no connection produce unavailable rather than invented data', async () => {
  const storage = memory({ savedAt: now, data: { temperature: 0 } });
  const result = await loadWeather({ storage, now, fetcher: async () => { throw Error('offline'); } });
  assert.equal(result.state, 'unavailable');
  assert.equal(result.data, undefined);
});

test('cache failure does not discard successfully fetched weather', async () => {
  const storage = { get: async () => { throw Error('storage'); }, set: async () => { throw Error('storage'); } };
  assert.equal((await loadWeather({ storage, now, fetcher: async () => response() })).state, 'fresh');
});

test('concurrent refreshes share one request', async () => {
  const storage = memory(); let calls = 0;
  const fetcher = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return response(); };
  await Promise.all([loadWeather({ storage, now, fetcher }), loadWeather({ storage, now, fetcher })]);
  assert.equal(calls, 1);
});
