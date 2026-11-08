function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

async function fetchFx() {
  const end = new Date();
  const start = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const response = await fetch(
    `https://api.frankfurter.app/${iso(start)}..${iso(end)}?from=USD&to=MXN`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) throw new Error(`Frankfurter ${response.status}`);
  const data = await response.json();
  const days = Object.keys(data.rates || {}).sort();
  const last = days.at(-1);
  const previous = days.at(-2);
  if (!last) throw new Error('Frankfurter sin fechas');
  const price = data.rates[last].MXN;
  const before = previous ? data.rates[previous].MXN : price;
  return { price, pct: before ? ((price - before) / before) * 100 : 0 };
}

async function fetchYahoo(symbol) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
    {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new Error(`Yahoo ${symbol} ${response.status}`);
  const data = await response.json();
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const previous = meta?.chartPreviousClose || meta?.previousClose;
  if (typeof price !== 'number') throw new Error(`Yahoo ${symbol} sin precio`);
  return {
    price,
    pct: previous ? ((price - previous) / previous) * 100 : 0,
  };
}

async function fetchEconomy(prev) {
  const [fx, spx, ipc] = await Promise.all([
    fetchFx().catch((error) => {
      console.error('USD/MXN:', error.message);
      return null;
    }),
    fetchYahoo('^GSPC').catch((error) => {
      console.error('S&P:', error.message);
      return null;
    }),
    fetchYahoo('^MXX').catch((error) => {
      console.error('IPC:', error.message);
      return null;
    }),
  ]);

  if (!fx && !spx && !ipc) {
    return {
      ...prev,
      source: prev.updatedAt ? 'cached' : 'pending',
    };
  }

  const liveCount = [fx, spx, ipc].filter(Boolean).length;
  return {
    usdMxn: fx ? round(fx.price, 4) : prev.usdMxn,
    usdChangePct: fx ? round(fx.pct, 2) : prev.usdChangePct,
    spx: spx ? round(spx.price, 2) : prev.spx,
    spxChangePct: spx ? round(spx.pct, 2) : prev.spxChangePct,
    ipc: ipc ? Math.round(ipc.price) : prev.ipc,
    ipcChangePct: ipc ? round(ipc.pct, 2) : prev.ipcChangePct,
    updatedAt: Date.now(),
    source: liveCount === 3 ? 'live' : 'partial',
  };
}

module.exports = { fetchEconomy };
