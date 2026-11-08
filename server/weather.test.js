const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchWeather } = require('./weather');
const { initialState } = require('./store');

test('la temperatura sale de Open-Meteo', async () => {
  const weather = await fetchWeather(initialState().weather);
  assert.equal(weather.source, 'live');
  assert.equal(weather.place, 'CDMX');
  assert.ok(weather.celsius > -5 && weather.celsius < 45, `temperatura rara: ${weather.celsius}`);
});
