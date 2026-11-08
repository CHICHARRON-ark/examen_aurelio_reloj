async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16`,
      {
        headers: {
          'User-Agent': 'TetherExam/1.0 (school project)',
          'Accept-Language': 'es',
        },
        signal: AbortSignal.timeout(2500),
      },
    );
    if (!response.ok) return '';
    const data = await response.json();
    const address = data.address || {};
    const place =
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.city_district ||
      address.city ||
      address.town ||
      address.village ||
      '';
    return String(place).trim().slice(0, 32);
  } catch (error) {
    console.error('Geocodificación:', error.message);
    return '';
  }
}

module.exports = { reverseGeocode };
