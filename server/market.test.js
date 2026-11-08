const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchEconomy } = require('./market');
const { initialState } = require('./store');

test('el mercado sale de Frankfurter y Yahoo', async () => {
  const economy = await fetchEconomy(initialState().economy);
  assert.equal(economy.source, 'live');
  assert.ok(economy.usdMxn > 10 && economy.usdMxn < 40, `USD/MXN raro: ${economy.usdMxn}`);
  assert.ok(economy.spx > 1000, `S&P raro: ${economy.spx}`);
  assert.ok(economy.ipc > 10000, `IPC raro: ${economy.ipc}`);
  assert.ok(economy.updatedAt > 0);
});
