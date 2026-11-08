const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { initialState, normalize, apply, tick, settle } = require('./store');
const { fetchEconomy } = require('./market');
const { fetchWeather } = require('./weather');
const { reverseGeocode } = require('./geocode');

function loadState(file) {
  try {
    return settle(normalize(JSON.parse(fs.readFileSync(file, 'utf8'))));
  } catch {
    return initialState();
  }
}

function persist(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state));
}

function start(options = {}) {
  const port = options.port ?? 8787;
  const file = options.file || path.join(__dirname, 'data', 'state.json');
  const geocode = options.geocode || reverseGeocode;
  const liveFeeds = options.market !== false;

  let state = loadState(file);
  let chain = Promise.resolve();

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, sessions: wss.clients.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server, maxPayload: 32 * 1024 });

  function sessionCount() {
    let total = 0;
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) total += 1;
    }
    return total;
  }

  function broadcast(events) {
    const raw = JSON.stringify({
      type: 'state',
      state,
      events,
      sessions: sessionCount(),
    });
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(raw);
    }
  }

  function commit(next, events) {
    if (next === state && events.length === 0) return;
    state = next;
    persist(file, state);
    broadcast(events);
  }

  function enqueue(task) {
    chain = chain.then(task).catch((error) => {
      console.error('Enlace:', error);
    });
    return chain;
  }

  async function refreshMarket() {
    const economy = await fetchEconomy(state.economy);
    if (economy === state.economy) return;
    commit({ ...state, economy }, []);
  }

  async function refreshWeather() {
    try {
      const weather = await fetchWeather(state.weather);
      commit({ ...state, weather }, []);
    } catch (error) {
      console.error('Temperatura:', error.message);
      if (state.weather.updatedAt && state.weather.source === 'live') {
        commit({ ...state, weather: { ...state.weather, source: 'cached' } }, []);
      }
    }
  }

  wss.on('connection', (socket) => {
    socket.role = 'dual';
    broadcast([]);

    socket.on('message', (raw) => {
      enqueue(() => handle(socket, raw.toString()));
    });

    socket.on('close', () => {
      broadcast([]);
    });
  });

  async function handle(socket, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'hello') {
      if (msg.role === 'phone' || msg.role === 'watch' || msg.role === 'dual') {
        socket.role = msg.role;
      }
      return;
    }

    if (msg.type === 'check_in' && msg.checkInType !== 'sali' && finite(msg.lat) && finite(msg.lon)) {
      msg.place = msg.place || (await geocode(msg.lat, msg.lon));
    }
    if (msg.type === 'set_meetup_response' && msg.status === 'llegue' && finite(msg.lat) && finite(msg.lon)) {
      msg.place = msg.place || (await geocode(msg.lat, msg.lon));
    }

    const located =
      (msg.type === 'check_in' && msg.checkInType !== 'sali' && finite(msg.lat) && finite(msg.lon)) ||
      (msg.type === 'set_meetup_response' && msg.status === 'llegue' && finite(msg.lat) && finite(msg.lon));

    const result = apply(state, msg, Date.now());
    commit(result.state, result.events);
    if (located && liveFeeds) await refreshWeather();
  }

  const tickTimer = setInterval(() => {
    enqueue(async () => {
      const result = tick(state, Date.now());
      commit(result.state, result.events);
    });
  }, 1000);

  let marketTimer;
  let weatherTimer;
  if (liveFeeds) {
    enqueue(() => refreshMarket());
    enqueue(() => refreshWeather());
    marketTimer = setInterval(() => {
      enqueue(() => refreshMarket());
    }, 60_000);
    weatherTimer = setInterval(() => {
      enqueue(() => refreshWeather());
    }, 10 * 60_000);
  }

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      const actual = server.address().port;
      resolve({
        port: actual,
        close() {
          clearInterval(tickTimer);
          if (marketTimer) clearInterval(marketTimer);
          if (weatherTimer) clearInterval(weatherTimer);
          for (const client of wss.clients) client.close();
          return new Promise((done) => server.close(() => done()));
        },
      });
    });
  });
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

if (require.main === module) {
  const port = Number(process.env.TETHER_PORT) || 8787;
  start({ port })
    .then((server) => {
      console.log(`TETHER enlace en ws://0.0.0.0:${server.port}`);
    })
    .catch((error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`El puerto ${port} ya está en uso. Cierra el otro enlace y vuelve a intentar.`);
      } else {
        console.error(error);
      }
      process.exit(1);
    });
}

module.exports = { start };
