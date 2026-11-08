async function fetchWeather(current) {
  const lat = Number(current.lat);
  const lon = Number(current.lon);
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
  const data = await response.json();
  const celsius = data.current?.temperature_2m;
  if (typeof celsius !== 'number') throw new Error('Open-Meteo sin temperatura');
  return {
    ...current,
    celsius: Math.round(celsius * 10) / 10,
    updatedAt: Date.now(),
    source: 'live',
  };
}

module.exports = { fetchWeather };
