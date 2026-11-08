const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WebSocket } = require('ws');
const { start } = require('./index');

function connect(url) {
  const ws = new WebSocket(url);
  const queue = [];
  const waiters = [];
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    const waiter = waiters.shift();
    if (waiter) waiter(message);
    else queue.push(message);
  });
  const read = () =>
    queue.length ? Promise.resolve(queue.shift()) : new Promise((resolve) => waiters.push(resolve));
  const ready = new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  return { ws, read, ready };
}

async function until(read, predicate) {
  for (;;) {
    const message = await read();
    if (predicate(message)) return message;
  }
}

test('dos sesiones comparten el voto y el check-in sobrevive al reinicio', async () => {
  const file = path.join(os.tmpdir(), `tether-${Date.now()}-${Math.random()}.json`);
  const server = await start({
    port: 0,
    file,
    market: false,
    geocode: async () => 'Centro',
  });

  const phone = connect(`ws://127.0.0.1:${server.port}`);
  const watch = connect(`ws://127.0.0.1:${server.port}`);
  await Promise.all([phone.ready, watch.ready]);
  await until(phone.read, (message) => message.sessions === 2);
  await until(watch.read, (message) => message.sessions === 2);

  phone.ws.send(JSON.stringify({
    type: 'create_vote',
    question: '¿Salimos?',
    labels: ['Ahora', 'En 20'],
    seconds: 90,
  }));

  const createdOnWatch = await until(watch.read, (message) => message.events[0]?.kind === 'vote_created');
  assert.equal(createdOnWatch.state.vote.question, '¿Salimos?');
  assert.equal(createdOnWatch.sessions, 2);

  watch.ws.send(JSON.stringify({ type: 'cast_vote', optionId: 'opt_0' }));
  const votedOnPhone = await until(
    phone.read,
    (message) => message.state.vote?.options?.[0]?.votes?.length === 1,
  );
  assert.equal(votedOnPhone.events.length, 0);

  watch.ws.send(JSON.stringify({
    type: 'check_in',
    checkInType: 'llegue',
    lat: 19.4326,
    lon: -99.1332,
  }));
  const checkIn = await until(phone.read, (message) => message.events[0]?.kind === 'check_in');
  assert.equal(checkIn.state.checkIns[0].place, 'Centro');

  phone.ws.close();
  watch.ws.close();
  await server.close();

  const restarted = await start({ port: 0, file, market: false, geocode: async () => 'Centro' });
  const again = connect(`ws://127.0.0.1:${restarted.port}`);
  await again.ready;
  const restored = await until(again.read, (message) => message.state.vote?.question === '¿Salimos?');
  assert.equal(restored.state.vote.question, '¿Salimos?');
  assert.equal(restored.state.vote.options[0].votes.length, 1);
  assert.equal(restored.state.checkIns[0].place, 'Centro');
  again.ws.close();
  await restarted.close();
  fs.rmSync(file, { force: true });
});
